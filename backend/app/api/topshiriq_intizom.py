"""
XAVFSIZ XONADON — Topshiriq va Intizom API marshrutizatori.

Topshiriq:
  POST   /api/topshiriqlar          — yangi topshiriq (rahbar/superadmin)
  GET    /api/topshiriqlar          — ro'yxat (filtr + sahifa)
  GET    /api/topshiriqlar/{id}     — batafsil
  PATCH  /api/topshiriqlar/{id}     — status yangilash

Intizom:
  POST   /api/intizom               — intizom qayd etish (rahbar/superadmin)
  GET    /api/intizom               — ro'yxat (filtr + sahifa)
  GET    /api/intizom/{id}          — batafsil
"""
import logging
from datetime import date as date_type

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user, require_role
from app.core.exceptions import NotFoundException, ForbiddenException
from app.models.user import User, UserRole
from app.schemas.topshiriq_intizom import (
    TopshiriqCreate,
    TopshiriqUpdate,
    IntizomCreate,
)
from app.services import topshiriq_intizom as service
from app.services.audit import audit_yozish

logger = logging.getLogger("xavfsiz_xonadon")
router = APIRouter()


# ============ Topshiriq CRUD ============

@router.post("/topshiriqlar")
async def create_topshiriq(
    body: TopshiriqCreate,
    request: Request,
    current_user: User = Depends(require_role("rahbar", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Yangi topshiriq yaratish — faqat rahbar va superadmin."""
    try:
        topshiriq = await service.create_topshiriq(
            db,
            rahbar_id=current_user.id,
            xodim_id=body.xodim_id,
            mfy_id=body.mfy_id,
            kocha_id=body.kocha_id,
            muammo_id=body.muammo_id,
            sarlavha=body.sarlavha,
            matn=body.matn,
            muddat=body.muddat,
        )
        await audit_yozish(
            db,
            user_id=current_user.id,
            amal="topshiriq.yaratish",
            obyekt_turi="topshiriqlar",
            obyekt_id=topshiriq.id,
            yangi_qiymat={
                "sarlavha": topshiriq.sarlavha,
                "xodim_id": topshiriq.xodim_id,
                "muddat": topshiriq.muddat.isoformat() if topshiriq.muddat else None,
            },
            ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        return {
            "ok": True,
            "data": service._topshiriq_to_response(topshiriq),
            "xato": None,
        }
    except NotFoundException as e:
        return {"ok": False, "data": None, "xato": str(e)}


@router.get("/topshiriqlar")
async def list_topshiriqlar(
    xodim_id: int | None = Query(None),
    mfy_id: int | None = Query(None),
    kocha_id: int | None = Query(None),
    status: str | None = Query(None),
    muddat_dan: str | None = Query(None, description="YYYY-MM-DD"),
    muddat_gacha: str | None = Query(None, description="YYYY-MM-DD"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Topshiriqlar ro'yxati — filtrlar va sahifalash."""
    muddat_dan_date = date_type.fromisoformat(muddat_dan) if muddat_dan else None
    muddat_gacha_date = date_type.fromisoformat(muddat_gacha) if muddat_gacha else None

    # Xodim uchun faqat o'zining topshiriqlari (boshqa xodim_id berilsa e'tiborsiz)
    if current_user.rol == UserRole.xodim:
        xodim_id = current_user.id

    try:
        items, total = await service.list_topshiriqlar(
            db,
            xodim_id=xodim_id,
            mfy_id=mfy_id,
            kocha_id=kocha_id,
            status=status,
            muddat_dan=muddat_dan_date,
            muddat_gacha=muddat_gacha_date,
            page=page,
            size=size,
        )

        pages = (total + size - 1) // size if total > 0 else 0
        return {
            "ok": True,
            "data": {
                "items": [service._topshiriq_to_response(t) for t in items],
                "total": total,
                "page": page,
                "size": size,
                "pages": pages,
            },
            "xato": None,
        }
    except Exception as e:
        logger.error("Topshiriqlar ro'yxatida xatolik: %s", e)
        return {"ok": False, "data": None, "xato": str(e)}


@router.get("/topshiriqlar/{topshiriq_id}")
async def get_topshiriq_detail(
    topshiriq_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Topshiriq batafsil ma'lumoti."""
    try:
        topshiriq = await service.get_topshiriq(db, topshiriq_id)

        is_admin = current_user.rol in (UserRole.rahbar, UserRole.superadmin)
        if not is_admin and topshiriq.xodim_id != current_user.id:
            raise ForbiddenException("Siz faqat o'zingizga biriktirilgan topshiriqni ko'ra olasiz.")

        return {
            "ok": True,
            "data": service._topshiriq_to_response(topshiriq),
            "xato": None,
        }
    except (NotFoundException, ForbiddenException) as e:
        return {"ok": False, "data": None, "xato": str(e)}


@router.patch("/topshiriqlar/{topshiriq_id}")
async def update_topshiriq(
    topshiriq_id: int,
    body: TopshiriqUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Topshiriq statusini yangilash.
    Rahbar/superadmin har qanday statusga. Xodim faqat 'bajarildi' yoki 'korildi' qilishi mumkin.
    """
    try:
        topshiriq = await service.get_topshiriq(db, topshiriq_id)

        # Ruxsat tekshiruvi
        is_admin = current_user.rol in (UserRole.rahbar, UserRole.superadmin)
        is_owner = topshiriq.xodim_id == current_user.id

        if not is_admin and not is_owner:
            raise ForbiddenException("Siz faqat o'zingizga biriktirilgan topshiriqni yangilay olasiz.")

        # Xodim faqat 'bajarildi' yoki 'korildi' holatiga o'tkaza oladi
        if is_owner and not is_admin and body.status not in ("bajarildi", "korildi"):
            raise ForbiddenException(
                "Xodim topshiriqni faqat 'bajarildi' yoki 'korildi' holatiga o'tkaza oladi."
            )

        topshiriq = await service.update_topshiriq(
            db, topshiriq, status=body.status
        )

        return {
            "ok": True,
            "data": service._topshiriq_to_response(topshiriq),
            "xato": None,
        }
    except (NotFoundException, ForbiddenException) as e:
        return {"ok": False, "data": None, "xato": str(e)}
    except ValueError as e:
        return {"ok": False, "data": None, "xato": str(e)}


# ============ Intizom CRUD ============

@router.post("/intizom")
async def create_intizom(
    body: IntizomCreate,
    request: Request,
    current_user: User = Depends(require_role("rahbar", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Intizom qayd etish — faqat rahbar va superadmin."""
    try:
        intizom = await service.create_intizom(
            db,
            xodim_id=body.xodim_id,
            muammo_id=body.muammo_id,
            turi=body.turi,
            sabab=body.sabab,
            bergan_id=current_user.id,
        )
        await audit_yozish(
            db,
            user_id=current_user.id,
            amal="intizom.yaratish",
            obyekt_turi="intizom",
            obyekt_id=intizom.id,
            yangi_qiymat={
                "turi": getattr(intizom.turi, "value", intizom.turi),
                "xodim_id": intizom.xodim_id,
                "sabab": intizom.sabab,
            },
            ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        return {
            "ok": True,
            "data": service._intizom_to_response(intizom),
            "xato": None,
        }
    except NotFoundException as e:
        return {"ok": False, "data": None, "xato": str(e)}


@router.get("/intizom")
async def list_intizom(
    xodim_id: int | None = Query(None),
    turi: str | None = Query(None),
    sana_dan: str | None = Query(None, description="YYYY-MM-DD"),
    sana_gacha: str | None = Query(None, description="YYYY-MM-DD"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Intizom ro'yxati — filtrlar va sahifalash."""
    sana_dan_date = date_type.fromisoformat(sana_dan) if sana_dan else None
    sana_gacha_date = date_type.fromisoformat(sana_gacha) if sana_gacha else None

    # Xodim uchun faqat o'zining intizom yozuvlari (boshqa xodim_id berilsa e'tiborsiz)
    if current_user.rol == UserRole.xodim:
        xodim_id = current_user.id

    try:
        items, total = await service.list_intizomlar(
            db,
            xodim_id=xodim_id,
            turi=turi,
            sana_dan=sana_dan_date,
            sana_gacha=sana_gacha_date,
            page=page,
            size=size,
        )

        pages = (total + size - 1) // size if total > 0 else 0
        return {
            "ok": True,
            "data": {
                "items": [service._intizom_to_response(i) for i in items],
                "total": total,
                "page": page,
                "size": size,
                "pages": pages,
            },
            "xato": None,
        }
    except Exception as e:
        logger.error("Intizom ro'yxatida xatolik: %s", e)
        return {"ok": False, "data": None, "xato": str(e)}


@router.get("/intizom/{intizom_id}")
async def get_intizom_detail(
    intizom_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Intizom batafsil ma'lumoti."""
    try:
        intizom = await service.get_intizom(db, intizom_id)

        is_admin = current_user.rol in (UserRole.rahbar, UserRole.superadmin)
        if not is_admin and intizom.xodim_id != current_user.id:
            raise ForbiddenException("Siz faqat o'zingizga tegishli intizom yozuvini ko'ra olasiz.")

        return {
            "ok": True,
            "data": service._intizom_to_response(intizom),
            "xato": None,
        }
    except (NotFoundException, ForbiddenException) as e:
        return {"ok": False, "data": None, "xato": str(e)}
