"""
XAVFSIZ XONADON — Custom istisno klasslari va FastAPI handlerlari.
Barcha javoblar { "ok": bool, "data": ..., "xato": str|null } formatida.
"""
import logging
from typing import Optional

from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("xavfsiz_xonadon")


class AppException(Exception):
    """Ilova darajasidagi barcha istisnolar uchun asosiy klass."""

    def __init__(self, xato: str, status_code: int = 400, data: Optional[dict] = None):
        self.xato = xato
        self.status_code = status_code
        self.data = data
        super().__init__(xato)


# ============ Auth istisnolari ============

class AuthException(AppException):
    """Autentifikatsiya/avtorizatsiya xatolari."""
    def __init__(self, xato: str, status_code: int = 401):
        super().__init__(xato=xato, status_code=status_code)


class RoyxatException(AppException):
    """Ro'yxatdan o'tish xatolari."""
    def __init__(self, xato: str):
        super().__init__(xato=xato, status_code=400)


# ============ Resurs istisnolari ============

class NotFoundException(AppException):
    """Resurs topilmadi."""
    def __init__(self, obyekt: str, id_: int = None):
        xato = f"{obyekt} topilmadi" + (f" (id={id_})" if id_ else "")
        super().__init__(xato=xato, status_code=404)


class ConflictException(AppException):
    """Dublikat resurs."""
    def __init__(self, xato: str):
        super().__init__(xato=xato, status_code=409)


class ForbiddenException(AppException):
    """Ruxsat yo'q."""
    def __init__(self, xato: str = "Ushbu amalni bajarish uchun ruxsatingiz yo'q"):
        super().__init__(xato=xato, status_code=403)


class ValidationException(AppException):
    """Validatsiya xatosi."""
    def __init__(self, xato: str, data: Optional[dict] = None):
        super().__init__(xato=xato, status_code=422, data=data)


# ============ FastAPI handlerlar ============

async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """AppException uchun handler — barcha app istisnolari shu yerdan o'tadi."""
    logger.warning(f"AppException: {exc.xato} (status={exc.status_code}, path={request.url.path})")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "ok": False,
            "xato": exc.xato,
            "data": exc.data,
        },
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Kutilmagan xatolar handleri — 500 qaytaradi va to'liq log yozadi."""
    logger.exception(f"Kutilmagan xato: {exc} (path={request.url.path})")
    return JSONResponse(
        status_code=500,
        content={
            "ok": False,
            "xato": "Ichki server xatosi. Iltimos keyinroq urinib ko'ring.",
            "data": None,
        },
    )
