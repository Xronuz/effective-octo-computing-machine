"""
XAVFSIZ XONADON — Hudud API marshrutizatori.
GET    /api/mfylar           — barcha MFY lar
POST   /api/mfylar           — yangi MFY
GET    /api/mfylar/{id}      — MFY batafsil (ko'chalari bilan)
PATCH  /api/mfylar/{id}      — MFY yangilash
DELETE /api/mfylar/{id}      — MFY o'chirish (superadmin)
GET    /api/kochalar         — ko'chalar ro'yxati
POST   /api/kochalar         — yangi ko'cha
PATCH  /api/kochalar/{id}    — ko'cha yangilash
DELETE /api/kochalar/{id}    — ko'cha o'chirish (superadmin)
"""
import logging

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user, require_role
from app.models.user import UserRole
from app.schemas.hudud import KochaCreate, KochaUpdate, MfyCreate, MfyUpdate
from app.services import xonadon as xonadon_service
from app.services.audit import audit_yozish

logger = logging.getLogger("xavfsiz_xonadon")
router = APIRouter()


def _mfy_to_response(mfy) -> dict:
    """MFY obyektini javob formatiga o'tkazish."""
    return {
        "id": mfy.id,
        "raqami": mfy.raqami,
        "nomi": mfy.nomi,
        "markaz_lat": mfy.markaz_lat,
        "markaz_lng": mfy.markaz_lng,
        "xonadon_soni": mfy.xonadon_soni,
        "kochalar_soni": len(mfy.kochalar) if mfy.kochalar else 0,
        "chegara": getattr(mfy, "chegara_geojson", None),
    }


def _kocha_to_response(kocha) -> dict:
    """Ko'cha obyektini javob formatiga o'tkazish."""
    return {
        "id": kocha.id,
        "mfy_id": kocha.mfy_id,
        "nomi": kocha.nomi,
        "xonadon_soni": len(kocha.xonadonlar) if kocha.xonadonlar else 0,
    }


# ============ GET /api/mfylar ============

@router.get("/mfylar")
async def list_mfylar(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Barcha MFY lar ro'yxati (ko'chalar va xonadonlar soni bilan)."""
    mfylar = await xonadon_service.list_mfylar(db)

    return {
        "ok": True,
        "data": [_mfy_to_response(m) for m in mfylar],
        "xato": None,
    }


# ============ POST /api/mfylar ============

@router.post("/mfylar")
async def create_mfy(
    body: MfyCreate,
    request: Request,
    current_user=Depends(require_role("rahbar", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Yangi MFY qo'shish."""
    mfy = await xonadon_service.create_mfy(
        db,
        raqami=body.raqami,
        nomi=body.nomi,
        markaz_lat=body.markaz_lat,
        markaz_lng=body.markaz_lng,
    )

    await audit_yozish(
        db,
        user_id=current_user.id,
        amal="mfy.yaratish",
        obyekt_turi="mfy",
        obyekt_id=mfy.id,
        yangi_qiymat={"raqami": mfy.raqami, "nomi": mfy.nomi},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return {
        "ok": True,
        "data": _mfy_to_response(mfy),
        "xato": None,
    }


# ============ GET /api/mfylar/{mfy_id} ============

@router.get("/mfylar/{mfy_id}")
async def get_mfy(
    mfy_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """MFY haqida batafsil ma'lumot (barcha ko'chalari bilan)."""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.models.hudud import Mfy, Kocha

    result = await db.execute(
        select(Mfy)
        .options(
            selectinload(Mfy.kochalar).selectinload(Kocha.xonadonlar),
        )
        .where(Mfy.id == mfy_id)
    )
    mfy = result.scalar_one_or_none()

    if mfy is None:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("MFY", mfy_id)

    return {
        "ok": True,
        "data": {
            "id": mfy.id,
            "raqami": mfy.raqami,
            "nomi": mfy.nomi,
            "markaz_lat": mfy.markaz_lat,
            "markaz_lng": mfy.markaz_lng,
            "xonadon_soni": mfy.xonadon_soni,
            "kochalar": [
                {
                    "id": k.id,
                    "nomi": k.nomi,
                    "xonadon_soni": len(k.xonadonlar) if k.xonadonlar else 0,
                }
                for k in (mfy.kochalar or [])
            ],
        },
        "xato": None,
    }


# ============ PATCH /api/mfylar/{mfy_id} ============

@router.patch("/mfylar/{mfy_id}")
async def update_mfy(
    mfy_id: int,
    body: MfyUpdate,
    request: Request,
    current_user=Depends(require_role("rahbar", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """MFY ma'lumotlarini yangilash."""
    mfy = await xonadon_service.get_mfy(db, mfy_id)
    eski_qiymat = {"raqami": mfy.raqami, "nomi": mfy.nomi}

    mfy = await xonadon_service.update_mfy(
        db,
        mfy,
        raqami=body.raqami,
        nomi=body.nomi,
        markaz_lat=body.markaz_lat,
        markaz_lng=body.markaz_lng,
    )

    await audit_yozish(
        db,
        user_id=current_user.id,
        amal="mfy.yangilash",
        obyekt_turi="mfy",
        obyekt_id=mfy.id,
        eski_qiymat=eski_qiymat,
        yangi_qiymat={"raqami": mfy.raqami, "nomi": mfy.nomi},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return {
        "ok": True,
        "data": _mfy_to_response(mfy),
        "xato": None,
    }


# ============ DELETE /api/mfylar/{mfy_id} ============

@router.delete("/mfylar/{mfy_id}")
async def delete_mfy(
    mfy_id: int,
    request: Request,
    current_user=Depends(require_role("superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """MFY ni o'chirish (faqat superadmin; xonadonlari bo'lmasa)."""
    mfy = await xonadon_service.get_mfy(db, mfy_id)
    nomi = f"{mfy.raqami}-son — {mfy.nomi}"

    await xonadon_service.delete_mfy(db, mfy)

    await audit_yozish(
        db,
        user_id=current_user.id,
        amal="mfy.ochirish",
        obyekt_turi="mfy",
        obyekt_id=mfy_id,
        eski_qiymat={"nomi": nomi},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return {
        "ok": True,
        "data": {"xabar": f"MFY o'chirildi: {nomi}"},
        "xato": None,
    }


# ============ GET /api/kochalar ============

@router.get("/kochalar")
async def list_kochalar(
    mfy_id: int | None = Query(None),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ko'chalar ro'yxati."""
    kochalar = await xonadon_service.list_kochalar(db, mfy_id=mfy_id)

    return {
        "ok": True,
        "data": [_kocha_to_response(k) for k in kochalar],
        "xato": None,
    }


# ============ POST /api/kochalar ============

@router.post("/kochalar")
async def create_kocha(
    body: KochaCreate,
    request: Request,
    current_user=Depends(require_role("rahbar", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Yangi ko'cha qo'shish."""
    kocha = await xonadon_service.create_kocha(
        db,
        mfy_id=body.mfy_id,
        nomi=body.nomi,
    )

    await audit_yozish(
        db,
        user_id=current_user.id,
        amal="kocha.yaratish",
        obyekt_turi="kochalar",
        obyekt_id=kocha.id,
        yangi_qiymat={"mfy_id": kocha.mfy_id, "nomi": kocha.nomi},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return {
        "ok": True,
        "data": {
            "id": kocha.id,
            "mfy_id": kocha.mfy_id,
            "nomi": kocha.nomi,
            "xonadon_soni": len(kocha.xonadonlar) if kocha.xonadonlar else 0,
        },
        "xato": None,
    }


# ============ PATCH /api/kochalar/{kocha_id} ============

@router.patch("/kochalar/{kocha_id}")
async def update_kocha(
    kocha_id: int,
    body: KochaUpdate,
    request: Request,
    current_user=Depends(require_role("rahbar", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Ko'cha nomini yangilash."""
    kocha = await xonadon_service.get_kocha(db, kocha_id)
    eski_qiymat = {"nomi": kocha.nomi}

    kocha = await xonadon_service.update_kocha(db, kocha, nomi=body.nomi)

    await audit_yozish(
        db,
        user_id=current_user.id,
        amal="kocha.yangilash",
        obyekt_turi="kochalar",
        obyekt_id=kocha.id,
        eski_qiymat=eski_qiymat,
        yangi_qiymat={"nomi": kocha.nomi},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return {
        "ok": True,
        "data": _kocha_to_response(kocha),
        "xato": None,
    }


# ============ DELETE /api/kochalar/{kocha_id} ============

@router.delete("/kochalar/{kocha_id}")
async def delete_kocha(
    kocha_id: int,
    request: Request,
    current_user=Depends(require_role("superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Ko'chani o'chirish (faqat superadmin; xonadonlari bo'lmasa)."""
    kocha = await xonadon_service.get_kocha(db, kocha_id)
    nomi = kocha.nomi

    await xonadon_service.delete_kocha(db, kocha)

    await audit_yozish(
        db,
        user_id=current_user.id,
        amal="kocha.ochirish",
        obyekt_turi="kochalar",
        obyekt_id=kocha_id,
        eski_qiymat={"nomi": nomi},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return {
        "ok": True,
        "data": {"xabar": f"Ko'cha o'chirildi: {nomi}"},
        "xato": None,
    }
