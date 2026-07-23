"""
XAVFSIZ XONADON — Statistika API marshrutizatori.

GET /api/statistika              — to'liq statistika
GET /api/statistika/xodimlar     — xodimlar bo'yicha
GET /api/statistika/excel        — .xlsx fayl
GET /api/statistika/pdf          — .pdf fayl
"""
import logging

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user
from app.models.user import User
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
