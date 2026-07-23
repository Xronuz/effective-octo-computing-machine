"""
XAVFSIZ XONADON — Foto yuklash API marshrutizatori.
POST /api/upload/foto       — bitta foto yuklash
POST /api/upload/fotolar    — ko'p foto yuklash (max 5 ta)
"""
import logging

from fastapi import APIRouter, Depends, UploadFile, File
from app.core.deps import get_current_user
from app.models.user import User
from app.services import upload as upload_service

logger = logging.getLogger("xavfsiz_xonadon")
router = APIRouter()


# ============ POST /api/upload/foto ============

@router.post("/foto")
async def upload_foto(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Bitta foto yuklash."""
    info = await upload_service.save_upload(file)
    return {
        "ok": True,
        "data": info,
        "xato": None,
    }


# ============ POST /api/upload/fotolar ============

@router.post("/fotolar")
async def upload_fotolar(
    files: list[UploadFile] = File(..., max_length=5),
    current_user: User = Depends(get_current_user),
):
    """Ko'p foto yuklash (maksimum 5 ta)."""
    results = []
    errors = []

    for file in files:
        try:
            info = await upload_service.save_upload(file)
            results.append(info)
        except Exception as e:
            errors.append({
                "fayl_nomi": file.filename,
                "xato": str(e),
            })

    return {
        "ok": len(errors) == 0,
        "data": {
            "yuklangan": results,
            "yuklanmagan": errors,
            "jami": len(results),
        },
        "xato": "; ".join(e["xato"] for e in errors) if errors else None,
    }
