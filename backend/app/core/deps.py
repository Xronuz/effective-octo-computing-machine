"""
XAVFSIZ XONADON — FastAPI Dependency Injection.
get_db, get_current_user, require_role va audit middleware.
"""
from fastapi import Depends, Header, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db as _get_db
from app.models.user import User, UserStatus
from app.core.security import decode_access_token
from app.core.exceptions import AuthException, ForbiddenException


# Re-export database's get_db for FastAPI Depends
get_db = _get_db


async def get_current_user(
    authorization: str = Header(..., description="Bearer <token>"),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    JWT tokendan foydalanuvchini aniqlash.
    Har bir himoyalangan endpoint uchun asosiy bog'liqlik.
    """
    if not authorization.startswith("Bearer "):
        raise AuthException("Autentifikatsiya talab qilinadi. Authorization header noto'g'ri.")

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise AuthException("Token topilmadi.")

    payload = decode_access_token(token)
    if payload is None:
        raise AuthException("Token muddati o'tgan yoki noto'g'ri.")

    user_id = payload.get("sub")
    if not user_id:
        raise AuthException("Token ichida foydalanuvchi ID topilmadi.")

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if user is None:
        raise AuthException("Foydalanuvchi topilmadi.")

    if user.holat == UserStatus.bloklangan:
        raise ForbiddenException("Hisobingiz bloklangan. Administrator bilan bog'laning.")

    if user.holat == UserStatus.kutilmoqda:
        raise ForbiddenException("Hisobingiz hali tasdiqlanmagan. Iltimos administrator tasdiqlashini kuting.")

    return user


def _rol_qiyosi(rol) -> str:
    """Enum .value yoki oddiy str qaytaradi — DB string va mock enum'ni bir xil solishtirish uchun."""
    return getattr(rol, 'value', rol)


def require_role(*allowed_roles: str):
    """
    Rol asosida ruxsat tekshiruvi.
    Foydalanish: Depends(require_role('rahbar', 'superadmin'))
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if _rol_qiyosi(current_user.rol) not in allowed_roles:
            raise ForbiddenException(
                f"Ushbu amal uchun {', '.join(allowed_roles)} roli talab qilinadi. "
                f"Sizning rolingiz: {_rol_qiyosi(current_user.rol)}"
            )
        return current_user

    return role_checker


async def get_optional_user(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Token mavjud bo'lsa foydalanuvchini qaytaradi, bo'lmasa None."""
    if not authorization or not authorization.startswith("Bearer "):
        return None

    try:
        token = authorization.removeprefix("Bearer ").strip()
        payload = decode_access_token(token)
        if payload is None:
            return None

        user_id = payload.get("sub")
        if not user_id:
            return None

        result = await db.execute(select(User).where(User.id == int(user_id)))
        return result.scalar_one_or_none()
    except Exception:
        return None
