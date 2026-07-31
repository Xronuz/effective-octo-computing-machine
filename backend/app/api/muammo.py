"""
XAVFSIZ XONADON — Muammo API marshrutizatori.
POST   /api/muammolar          — yangi muammo (idempotent client_uuid)
GET    /api/muammolar          — ro'yxat (filtr + sahifa)
GET    /api/muammolar/xarita   — xarita uchun bbox (GeoJSON)
GET    /api/muammolar/{id}     — batafsil
PATCH  /api/muammolar/{id}     — yangilash
POST   /api/muammolar/{id}/yop — yopish
POST   /api/muammolar/{id}/fotolar — foto qo'shish
"""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user, require_role
from app.core.exceptions import NotFoundException, ForbiddenException, ValidationException
from app.models.user import User, UserRole
from app.models.muammo import MuammoStatus
from app.schemas.muammo import (
    MuammoCreate,
    MuammoUpdate,
    MuammoYopish,
    MuammoResponse,
    MuammoListResponse,
    FotolarniBoglash,
)
from app.services import muammo as muammo_service

logger = logging.getLogger("xavfsiz_xonadon")
router = APIRouter()


# ============ POST /api/muammolar ============

@router.post("")
async def create_muammo(
    body: MuammoCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Yangi muammo qayd etish (faqat xodim).

    Idempotent: client_uuid bazada mavjud bo'lsa, xato tashlamasdan
    mavjud muammo qaytariladi va data.dublikat=True bo'ladi.
    """
    if current_user.rol != UserRole.xodim and current_user.rol != UserRole.superadmin:
        raise ForbiddenException("Faqat xodimlar muammo qayd etishi mumkin.")

    muammo, dublikat = await muammo_service.create_muammo(
        db,
        current_user,
        xonadon_id=body.xonadon_id,
        turi=body.turi,
        tavsif=body.tavsif,
        xavf=body.xavf,
        lat=body.lat,
        lng=body.lng,
        gps_aniqlik=body.gps_aniqlik,
        mock_gps=body.mock_gps,
        client_uuid=body.client_uuid,
        qurilma_vaqti=body.qurilma_vaqti,
        ornida_bartaraf=body.ornida_bartaraf,
        muddat=body.muddat,
        has_keyin_foto=body.has_keyin_foto,
        fotos_sha256_list=body.fotos_sha256_list,
        taklif_etilgan_tadbirlar=body.taklif_etilgan_tadbirlar,
        yoriqnomadan_otkanlar_soni=body.yoriqnomadan_otkanlar_soni,
        kira_olmadi=body.kira_olmadi,
    )

    data = muammo_service._muammo_to_response(muammo, current_user)
    data["dublikat"] = dublikat

    return {
        "ok": True,
        "data": data,
        "xato": None,
    }


# ============ GET /api/muammolar ============

@router.get("")
async def list_muammolar(
    status: str | None = Query(None),
    turi: str | None = Query(None),
    xavf: str | None = Query(None),
    mfy_id: int | None = Query(None),
    xonadon_id: int | None = Query(None),
    xodim_id: int | None = Query(None),
    shubhali: bool | None = Query(None),
    ornida_bartaraf: bool | None = Query(None),
    tadbirlar_soni_dan: int | None = Query(None, ge=0, description="Taklif etilgan tadbirlar soni shundan katta bo'lganlar"),
    sana_dan: str | None = Query(None, description="YYYY-MM-DD"),
    sana_gacha: str | None = Query(None, description="YYYY-MM-DD"),
    qidiruv: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Muammolar ro'yxati — filtr va sahifalash bilan."""
    from datetime import date
    sana_dan_date = date.fromisoformat(sana_dan) if sana_dan else None
    sana_gacha_date = date.fromisoformat(sana_gacha) if sana_gacha else None

    # Xodim uchun faqat o'zining muammolari
    if current_user.rol == UserRole.xodim:
        xodim_id = current_user.id

    items, total = await muammo_service.list_muammolar(
        db,
        status=status,
        turi=turi,
        xavf=xavf,
        mfy_id=mfy_id,
        xonadon_id=xonadon_id,
        xodim_id=xodim_id,
        shubhali=shubhali,
        ornida_bartaraf=ornida_bartaraf,
        tadbirlar_soni_dan=tadbirlar_soni_dan,
        sana_dan=sana_dan_date,
        sana_gacha=sana_gacha_date,
        qidiruv=qidiruv,
        page=page,
        size=size,
    )

    pages = (total + size - 1) // size if total > 0 else 0

    return {
        "ok": True,
        "data": {
            "items": [muammo_service._muammo_to_response(m, current_user) for m in items],
            "total": total,
            "page": page,
            "size": size,
            "pages": pages,
        },
        "xato": None,
    }


# ============ GET /api/muammolar/xarita ============
# DIQQAT: "/xarita" marshruti "/{muammo_id}" dan OLDIN e'lon qilinishi shart

@router.get("/xarita")
async def xarita_muammolar(
    bbox: str = Query(..., description="minLng,minLat,maxLng,maxLat"),
    status: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Xarita uchun bbox ichidagi muammolar — yengil GeoJSON FeatureCollection."""
    parts = bbox.split(",")
    if len(parts) != 4:
        raise ValidationException(
            "bbox formati noto'g'ri. Kutilgan: minLng,minLat,maxLng,maxLat"
        )
    try:
        min_lng, min_lat, max_lng, max_lat = (float(p.strip()) for p in parts)
    except ValueError:
        raise ValidationException("bbox qiymatlari son bo'lishi kerak.")

    if not (-180 <= min_lng <= 180 and -180 <= max_lng <= 180
            and -90 <= min_lat <= 90 and -90 <= max_lat <= 90):
        raise ValidationException("bbox koordinatalari ruxsat etilgan oraliqdan tashqarida.")
    if min_lng >= max_lng or min_lat >= max_lat:
        raise ValidationException("bbox: min qiymatlar max qiymatlardan kichik bo'lishi kerak.")

    features = await muammo_service.xarita_muammolar(
        db,
        min_lng=min_lng,
        min_lat=min_lat,
        max_lng=max_lng,
        max_lat=max_lat,
        status=status,
    )

    return {
        "ok": True,
        "data": {
            "type": "FeatureCollection",
            "features": features,
        },
        "xato": None,
    }


# ============ GET /api/muammolar/{muammo_id} ============

@router.get("/{muammo_id}")
async def get_muammo(
    muammo_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Muammo haqida batafsil ma'lumot."""
    muammo = await muammo_service.get_muammo(db, muammo_id)

    # Xodim faqat o'zining muammosini ko'ra oladi
    if current_user.rol == UserRole.xodim and muammo.xodim_id != current_user.id:
        raise ForbiddenException("Bu muammoni ko'rish huquqingiz yo'q.")

    return {
        "ok": True,
        "data": muammo_service._muammo_to_response(muammo, current_user),
        "xato": None,
    }


# ============ PATCH /api/muammolar/{muammo_id} ============

@router.patch("/{muammo_id}")
async def update_muammo(
    muammo_id: int,
    body: MuammoUpdate,
    current_user: User = Depends(require_role("rahbar", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Muammo holatini yangilash (rahbar/superadmin)."""
    muammo = await muammo_service.get_muammo(db, muammo_id)

    muammo = await muammo_service.update_muammo(
        db,
        muammo,
        current_user,
        status=body.status,
        ornida_bartaraf=body.ornida_bartaraf,
        muddat=body.muddat,
        xavf=body.xavf,
        tashkilot=body.tashkilot,
    )

    return {
        "ok": True,
        "data": muammo_service._muammo_to_response(muammo, current_user),
        "xato": None,
    }


# ============ POST /api/muammolar/{muammo_id}/yop ============

@router.post("/{muammo_id}/yop")
async def yop_muammo(
    muammo_id: int,
    body: MuammoYopish,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Muammoni bartaraf etilgan deb yopish."""
    muammo = await muammo_service.get_muammo(db, muammo_id)

    # Xodim faqat o'zining muammosini yopa oladi
    if current_user.rol == UserRole.xodim and muammo.xodim_id != current_user.id:
        raise ForbiddenException("Bu muammoni yopish huquqingiz yo'q.")

    muammo.status = MuammoStatus.yopilgan
    muammo.ornida_bartaraf = body.ornida_bartaraf
    muammo.yopilgan_sana = datetime.now(timezone.utc)
    muammo.yopgan_id = current_user.id

    if body.tavsif:
        # Tavsif mavjud bo'lsa qo'shib qo'yish
        old = muammo.tavsif or ""
        muammo.tavsif = f"{old}\n---\nYopish izohi: {body.tavsif}" if old else f"Yopish izohi: {body.tavsif}"

    await db.flush()
    await db.refresh(muammo)

    logger.info(f"Muammo yopildi: id={muammo.id}, yopgan={current_user.guvohnoma_raqami}")

    # Telegram avtopost — bartaraf etildi (xatolik asosiy oqimni sindirmaydi)
    try:
        from app.services.telegram_xabar import bartaraf_xabar
        await bartaraf_xabar(muammo)
    except Exception as e:
        logger.error(f"Telegram avtopost (bartaraf) xatolik: {e}")

    return {
        "ok": True,
        "data": muammo_service._muammo_to_response(muammo, current_user),
        "xato": None,
    }


# ============ POST /api/muammolar/{muammo_id}/fotolar ============

@router.post("/{muammo_id}/fotolar")
async def add_fotolar(
    muammo_id: int,
    body: FotolarniBoglash,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Muammoga foto qo'shish.
    Avval /api/upload/foto orqali yuklab, qaytgan ma'lumotlarni
    shu yerga yuborib muammoga bog'lanadi.
    """
    muammo = await muammo_service.get_muammo(db, muammo_id)

    # Xodim faqat o'zining muammosiga foto qo'sha oladi
    if current_user.rol == UserRole.xodim and muammo.xodim_id != current_user.id:
        raise ForbiddenException("Bu muammoga foto qo'shish huquqingiz yo'q.")

    foto_dicts = [
        {
            "turi": "keyin",
            "fayl_yoli": f.fayl_yoli,
            "sha256": f.sha256,
            "exif_lat": f.exif_lat,
            "exif_lng": f.exif_lng,
            "exif_vaqt": f.exif_vaqt,
            "olcham_byte": f.olcham_byte,
        }
        for f in body.fotolar
    ]

    fotolar = await muammo_service.add_fotos_to_muammo(db, muammo, foto_dicts)

    logger.info(
        f"Muammoga {len(fotolar)} ta foto qo'shildi: muammo_id={muammo_id}"
    )

    return {
        "ok": True,
        "data": {
            "fotolar": [
                {
                    "id": f.id,
                    "turi": f.turi.value if f.turi else None,
                    "fayl_yoli": f.fayl_yoli,
                    "yuklangan": f.yuklangan.isoformat() if f.yuklangan else None,
                }
                for f in fotolar
            ],
            "jami": len(fotolar),
        },
        "xato": None,
    }
