"""
XAVFSIZ XONADON — Statistika API marshrutizatori.

GET /api/statistika              — to'liq statistika
GET /api/statistika/kunlik       — kunlik tashrif hisoboti (xodimlar kesimi bilan)
GET /api/statistika/xodimlar     — xodimlar bo'yicha
GET /api/statistika/excel        — .xlsx fayl
GET /api/statistika/pdf          — .pdf fayl
"""
import logging
from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user
from app.models.user import User, UserRole
from app.services import statistika as stat_service

logger = logging.getLogger("xavfsiz_xonadon")
router = APIRouter()


@router.get("/statistika")
async def get_statistika(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """To'liq statistika — barcha ko'rsatkichlar bitta javobda."""
    try:
        data = await stat_service.get_full_statistika(db)
        return {"ok": True, "data": data, "xato": None}
    except Exception as e:
        logger.error("Statistikada xatolik: %s", e)
        return {"ok": False, "data": None, "xato": str(e)}


@router.get("/statistika/xodimlar")
async def get_xodim_statistika(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Xodimlar bo'yicha statistika (sahifalangan)."""
    try:
        items, total = await stat_service.get_xodim_statistika(db, page=page, size=size)
        pages = (total + size - 1) // size if total > 0 else 0
        return {
            "ok": True,
            "data": {"items": [i.model_dump() for i in items], "total": total, "page": page, "size": size, "pages": pages},
            "xato": None,
        }
    except Exception as e:
        logger.error("Xodim statistikasida xatolik: %s", e)
        return {"ok": False, "data": None, "xato": str(e)}


@router.get("/statistika/kunlik")
async def get_kunlik_statistika(
    sana: str | None = Query(None, description="YYYY-MM-DD (Toshkent kuni); bo'sh — bugun"),
    xodim_id: int | None = Query(None, description="Faqat shu xodim bo'yicha"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kunlik tashrif hisoboti: jami / muammosiz / muammoli / kira olmadi.

    Javobda xodimlar kesimi ham keladi — "bugun kim nechta xonadon tekshirdi".
    Xodim roli faqat o'z ko'rsatkichlarini ko'radi.
    """
    try:
        sana_date = date.fromisoformat(sana) if sana else None
    except ValueError:
        return {"ok": False, "data": None, "xato": "Sana formati noto'g'ri (YYYY-MM-DD kutilgan)"}

    # Xodim boshqa xodimlarning ko'rsatkichlarini ko'ra olmaydi
    if current_user.rol == UserRole.xodim:
        xodim_id = current_user.id

    try:
        data = await stat_service.get_kunlik_statistika(db, sana=sana_date, xodim_id=xodim_id)
        return {"ok": True, "data": data, "xato": None}
    except Exception as e:
        logger.error("Kunlik statistikada xatolik: %s", e)
        return {"ok": False, "data": None, "xato": str(e)}


@router.get("/statistika/excel")
async def download_excel(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Statistikani Excel (.xlsx) formatda yuklab olish."""
    try:
        data = await stat_service.get_full_statistika(db)
        excel_bytes = stat_service.generate_excel(data)

        return StreamingResponse(
            excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=xavfsiz_xonadon_statistika.xlsx"},
        )
    except Exception as e:
        logger.error("Excel eksportda xatolik: %s", e)
        return {"ok": False, "data": None, "xato": str(e)}


@router.get("/statistika/kunlik/excel")
async def download_kunlik_excel(
    sana_dan: str = Query(..., description="YYYY-MM-DD"),
    sana_gacha: str = Query(..., description="YYYY-MM-DD"),
    xodim_id: int | None = Query(None, description="Faqat shu xodim bo'yicha"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """"Bugungi tekshiruvlar" panelidagi tanlangan oraliq uchun Excel hisobot."""
    try:
        dan = date.fromisoformat(sana_dan)
        gacha = date.fromisoformat(sana_gacha)
    except ValueError:
        return {"ok": False, "data": None, "xato": "Sana formati noto'g'ri (YYYY-MM-DD kutilgan)"}

    if gacha < dan:
        return {"ok": False, "data": None, "xato": "'Gacha' sanasi 'dan' sanasidan oldin bo'lishi mumkin emas"}

    # Xodim boshqa xodimlarning ko'rsatkichlarini ko'ra olmaydi
    if current_user.rol == UserRole.xodim:
        xodim_id = current_user.id

    try:
        data = await stat_service.get_tashrif_hisobot_oraliq(db, sana_dan=dan, sana_gacha=gacha, xodim_id=xodim_id)
        excel_bytes = stat_service.generate_kunlik_excel(data, dan, gacha)
        fayl_nomi = f"tashriflar_{dan.isoformat()}_{gacha.isoformat()}.xlsx"
        return StreamingResponse(
            excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={fayl_nomi}"},
        )
    except Exception as e:
        logger.error("Kunlik excel eksportda xatolik: %s", e)
        return {"ok": False, "data": None, "xato": str(e)}


@router.get("/statistika/pdf")
async def download_pdf(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Statistikani PDF formatda yuklab olish."""
    try:
        data = await stat_service.get_full_statistika(db)
        pdf_bytes = stat_service.generate_pdf(data)

        return StreamingResponse(
            pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=xavfsiz_xonadon_statistika.pdf"},
        )
    except Exception as e:
        logger.error("PDF eksportda xatolik: %s", e)
        return {"ok": False, "data": None, "xato": str(e)}
