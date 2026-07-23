"""
XAVFSIZ XONADON — Xonadon API marshrutizatori.
POST   /api/xonadonlar          — yangi xonadon
GET    /api/xonadonlar          — ro'yxat (filtr + sahifa)
GET    /api/xonadonlar/{id}     — batafsil
PATCH  /api/xonadonlar/{id}     — yangilash
DELETE /api/xonadonlar/{id}     — o'chirish (admin)
"""
import logging

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user, require_role
from app.schemas.xonadon import (
    XonadonCreate,
    XonadonUpdate,
)
from app.services import xonadon as xonadon_service
from app.services.audit import audit_yozish

logger = logging.getLogger("xavfsiz_xonadon")
router = APIRouter()


# ============ POST /api/xonadonlar ============

@router.post("")
async def create_xonadon(
    body: XonadonCreate,
    request: Request,
    current_user=Depends(require_role("xodim", "rahbar", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Yangi xonadon qo'shish (xodim/rahbar/superadmin — mobil ilovadan ham)."""
    xonadon = await xonadon_service.create_xonadon(
        db,
        kocha_id=body.kocha_id,
        uy_raqami=body.uy_raqami,
        lat=body.lat,
        lng=body.lng,
        egasi_fio=body.egasi_fio,
        egasi_tel=body.egasi_tel,
        izoh=body.izoh,
    )

    await audit_yozish(
        db,
        user_id=current_user.id,
        amal="xonadon.yaratish",
        obyekt_turi="xonadonlar",
        obyekt_id=xonadon.id,
        yangi_qiymat={"kocha_id": xonadon.kocha_id, "uy_raqami": xonadon.uy_raqami},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return {
        "ok": True,
        "data": xonadon_service._xonadon_to_response(xonadon, current_user),
        "xato": None,
    }


# ============ GET /api/xonadonlar ============

@router.get("")
async def list_xonadonlar(
    mfy_id: int | None = Query(None),
    kocha_id: int | None = Query(None),
    ochiq_muammo: bool | None = Query(None),
    qidiruv: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Xonadonlar ro'yxati — filtr va sahifalash bilan."""
    items, total = await xonadon_service.list_xonadonlar(
        db,
        mfy_id=mfy_id,
        kocha_id=kocha_id,
        ochiq_muammo=ochiq_muammo,
        qidiruv=qidiruv,
        page=page,
        size=size,
    )

    pages = (total + size - 1) // size if total > 0 else 0

    return {
        "ok": True,
        "data": {
            "items": [xonadon_service._xonadon_to_response(x, current_user) for x in items],
            "total": total,
            "page": page,
            "size": size,
            "pages": pages,
        },
        "xato": None,
    }


# ============ GET /api/xonadonlar/{xonadon_id} ============

@router.get("/{xonadon_id}")
async def get_xonadon(
    xonadon_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Xonadon haqida batafsil ma'lumot."""
    xonadon = await xonadon_service.get_xonadon(db, xonadon_id)
    return {
        "ok": True,
        "data": xonadon_service._xonadon_to_response(xonadon, current_user),
        "xato": None,
    }


# ============ PATCH /api/xonadonlar/{xonadon_id} ============

@router.patch("/{xonadon_id}")
async def update_xonadon(
    xonadon_id: int,
    body: XonadonUpdate,
    current_user=Depends(require_role("rahbar", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Xonadon ma'lumotlarini yangilash."""
    xonadon = await xonadon_service.get_xonadon(db, xonadon_id)
    xonadon = await xonadon_service.update_xonadon(
        db,
        xonadon,
        kocha_id=body.kocha_id,
        uy_raqami=body.uy_raqami,
        lat=body.lat,
        lng=body.lng,
        egasi_fio=body.egasi_fio,
        egasi_tel=body.egasi_tel,
        izoh=body.izoh,
    )
    # refresh() munosabatlarni expire qiladi — javobdan oldin eager qayta yuklaymiz
    xonadon = await xonadon_service.get_xonadon(db, xonadon_id)
    return {
        "ok": True,
        "data": xonadon_service._xonadon_to_response(xonadon, current_user),
        "xato": None,
    }


# ============ DELETE /api/xonadonlar/{xonadon_id} ============

@router.delete("/{xonadon_id}")
async def delete_xonadon(
    xonadon_id: int,
    current_user=Depends(require_role("superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Xonadonni o'chirish (faqat superadmin)."""
    xonadon = await xonadon_service.get_xonadon(db, xonadon_id)
    # O'chirishdan oldin manzilni saqlab olamiz — flush'dan keyin obyekt
    # expire bo'ladi va qayta yuklab bo'lmaydi (qator allaqachon o'chgan)
    manzil = xonadon.full_address
    await xonadon_service.delete_xonadon(db, xonadon)
    return {
        "ok": True,
        "data": {"xabar": f"Xonadon o'chirildi: {manzil}"},
        "xato": None,
    }
