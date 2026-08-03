"""
XAVFSIZ XONADON — Lokatsiya API marshrutizatori.
POST   /api/lokatsiya          — xodim GPS nuqtasini yuborish
POST   /api/lokatsiya/batch    — offline GPS nuqtalar paketi (max 500)
GET    /api/lokatsiya          — aktiv xodimlar ro'yxati
GET    /api/lokatsiya/marshrut — kunlik marshrut (polyline)
WS     /api/ws/lokatsiya       — jonli xarita uchun WebSocket (faqat rahbar/superadmin)
"""
import asyncio
import logging
from datetime import datetime, date, timezone

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.lokatsiya import LokatsiyaLog
from app.schemas.lokatsiya import LokatsiyaKiruvchi, LokatsiyaChiquvchi, LokatsiyaBatchKiruvchi, MarshrutNuqtaResponse
from app.services import lokatsiya as lokatsiya_service
from app.ws.manager import manager

logger = logging.getLogger("xavfsiz_xonadon")
router = APIRouter()


async def _lokatsiya_yangilandi_yubor(current_user: User, log: LokatsiyaLog) -> None:
    """Jonli xarita uchun WebSocket orqali barcha klientlarga xabar beradi."""
    await manager.broadcast_json({
        "type": "lokatsiya_yangilandi",
        "data": {
            "xodim_id": current_user.id,
            "xodim_fio": current_user.full_name,
            "lat": log.lat,
            "lng": log.lng,
            "aniqlik": log.aniqlik,
            "tezlik": log.tezlik,
            "batareya": log.batareya,
            "mock_gps": log.mock_gps,
            "qurilma_vaqti": log.qurilma_vaqti.isoformat() if log.qurilma_vaqti else None,
            "qabul_vaqti": log.qabul_vaqti.isoformat() if log.qabul_vaqti else None,
        },
    })


# ============ POST /api/lokatsiya ============

@router.post("/lokatsiya")
async def send_lokatsiya(
    body: LokatsiyaKiruvchi,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mobil ilovadan GPS lokatsiya yuborish. Ish vaqtidan tashqari rad etiladi."""
    log = await lokatsiya_service.save_lokatsiya(db, current_user.id, body)

    if log is None:
        # Ish vaqtidan tashqari — jimgina qabul qilamiz, lekin saqlamaymiz
        return {
            "ok": True,
            "data": {"saqlandi": False, "sabab": "ish_vaqtidan_tashqari"},
            "xato": None,
        }

    await _lokatsiya_yangilandi_yubor(current_user, log)

    return {
        "ok": True,
        "data": {"id": log.id, "vaqt": log.qabul_vaqti.isoformat() if log.qabul_vaqti else None},
        "xato": None,
    }


# ============ GET /api/lokatsiya ============

@router.get("/lokatsiya")
async def get_aktiv_xodimlar(
    songi_daqiqa: int = Query(10, ge=1, le=60),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Hozir faol xodimlar (oxirgi N daqiqa)."""
    aktivlar = await lokatsiya_service.get_aktiv_xodimlar(db, songi_daqiqa)
    return {
        "ok": True,
        "data": [a.model_dump(mode="json") for a in aktivlar],
        "xato": None,
    }


# ============ POST /api/lokatsiya/batch ============

@router.post("/lokatsiya/batch")
async def send_lokatsiya_batch(
    body: LokatsiyaBatchKiruvchi,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mobil ilovadan offline paytda to'plangan GPS nuqtalar paketi.
    Batch yuborish orqali tarmoq so'rovlari soni kamaytiriladi.
    Har bir nuqta alohida ish vaqti filtrdan o'tadi.
    """
    saqlangan = 0
    rad_etilgan = 0
    oxirgi_log: LokatsiyaLog | None = None
    for nuqta in body.items:
        log = await lokatsiya_service.save_lokatsiya(db, current_user.id, nuqta)
        if log is not None:
            saqlangan += 1
            oxirgi_log = log
        else:
            rad_etilgan += 1

    logger.info(
        f"Lokatsiya batch: user_id={current_user.id}, "
        f"jami={len(body.items)}, saqlangan={saqlangan}, rad_etilgan={rad_etilgan}"
    )

    # Jonli xarita uchun — mobil ilova har bir nuqtani alohida emas, faqat
    # batch qilib yuboradi (`/lokatsiya` yagona-nuqta yo'li ishlatilmaydi),
    # shuning uchun WS bildirishnomasi avval umuman yuborilmasdi. Paketdagi
    # eng so'nggi (band ro'yxatda oxirgi, ya'ni eng yangi) saqlangan nuqta
    # broadcast qilinadi — offline to'plangan barcha eski nuqtalarni emas.
    if oxirgi_log is not None:
        await _lokatsiya_yangilandi_yubor(current_user, oxirgi_log)

    return {
        "ok": True,
        "data": {
            "jami": len(body.items),
            "saqlangan": saqlangan,
            "rad_etilgan": rad_etilgan,
        },
        "xato": None,
    }


# ============ GET /api/lokatsiya/marshrut ============

@router.get("/lokatsiya/marshrut")
async def get_marshrut(
    xodim_id: int = Query(...),
    sana: date = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Belgilangan kundagi xodim marshruti (polyline uchun nuqtalar ketma-ketligi).
    Faqat rahbar yoki o'z marshrutini ko'rayotgan xodim ruxsat oladi.
    """
    from app.models.user import UserRole

    if current_user.rol != UserRole.rahbar and current_user.rol != UserRole.superadmin:
        if current_user.id != xodim_id:
            from app.core.exceptions import ForbiddenException
            raise ForbiddenException("Faqat o'z marshrutingizni ko'rishingiz mumkin.")

    sana_boshi = datetime(sana.year, sana.month, sana.day, 0, 0, 0, tzinfo=timezone.utc)
    sana_oxiri = datetime(sana.year, sana.month, sana.day, 23, 59, 59, tzinfo=timezone.utc)

    result = await db.execute(
        select(LokatsiyaLog)
        .where(
            and_(
                LokatsiyaLog.xodim_id == xodim_id,
                LokatsiyaLog.qurilma_vaqti >= sana_boshi,
                LokatsiyaLog.qurilma_vaqti <= sana_oxiri,
            )
        )
        .order_by(LokatsiyaLog.qurilma_vaqti.asc())
    )
    logs = result.scalars().all()

    nuqtalar = [
        {
            "lat": log.lat,
            "lng": log.lng,
            "aniqlik": log.aniqlik,
            "tezlik": log.tezlik,
            "batareya": log.batareya,
            "qurilma_vaqti": log.qurilma_vaqti.isoformat() if log.qurilma_vaqti else None,
            "qabul_vaqti": log.qabul_vaqti.isoformat() if log.qabul_vaqti else None,
        }
        for log in logs
    ]

    return {
        "ok": True,
        "data": {"nuqtalar": nuqtalar, "jami": len(nuqtalar)},
        "xato": None,
    }


# ============ WS /api/ws/lokatsiya ============

@router.websocket("/ws/lokatsiya")
async def ws_lokatsiya(websocket: WebSocket, token: str = Query(...)):
    """
    WebSocket ulanish — token querystring orqali.
    Faqat rahbar va superadmin rollari jonli xaritani ko'rishi mumkin;
    xodim va boshqa rollar 4403 kodi bilan yopiladi.
    """
    from app.core.security import decode_access_token
    from sqlalchemy import select
    from app.database import async_session_maker

    payload = decode_access_token(token)
    if payload is None:
        await websocket.close(code=4001, reason="Token noto'g'ri yoki muddati o'tgan")
        return

    user_id = int(payload.get("sub", 0))
    if not user_id:
        await websocket.close(code=4001, reason="Token noto'g'ri")
        return

    # Foydalanuvchi mavjudligi va roli tekshiruvi
    async with async_session_maker() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None:
            await websocket.close(code=4001, reason="Foydalanuvchi topilmadi")
            return

    # Rol tekshiruvi — jonli xarita faqat rahbar/superadmin uchun
    if user.rol not in (UserRole.rahbar, UserRole.superadmin):
        await websocket.close(code=4403, reason="Bu resursga ruxsatingiz yo'q")
        return

    await manager.connect(websocket, user_id)

    try:
        # Ulanish faolligini saqlash uchun ping/pong
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                # Klientdan kelgan xabarni qayta ishlash (masalan, ping)
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                # 30 soniyada xabar kelmasa, ping yuboramiz
                try:
                    await websocket.send_text("ping")
                except Exception:
                    break
    except WebSocketDisconnect:
        logger.info(f"WebSocket uzildi: user_id={user_id}")
    except Exception as e:
        logger.warning(f"WebSocket xato: user_id={user_id}, {e}")
    finally:
        manager.disconnect(websocket, user_id)
