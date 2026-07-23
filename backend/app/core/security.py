"""
XAVFSIZ XONADON — Xavfsizlik moduli.
JWT tokenni yaratish/decode, bcrypt parol hash, RBAC roli tekshiruvi.
Barcha funksiyalar custom AppException ishlatadi (FastAPI HTTPException emas).
"""
import re
import logging
import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
import bcrypt

from app.config import settings
from app.core.exceptions import AuthException

logger = logging.getLogger("xavfsiz_xonadon")

# ============ Parol hash ============


def hash_password(parol: str) -> str:
    """Parolni bcrypt bilan hashlash (cost konfiguratsiyadan)."""
    # bcrypt 72 bayt limiti — uzun parollarni kesish
    parol_bytes = parol.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=settings.BCRYPT_COST)
    return bcrypt.hashpw(parol_bytes, salt).decode("utf-8")


def verify_password(plain_parol: str, hashed_parol: str) -> bool:
    """Parol to'g'riligini tekshirish."""
    parol_bytes = plain_parol.encode("utf-8")[:72]
    return bcrypt.checkpw(parol_bytes, hashed_parol.encode("utf-8"))


def validate_password_strength(parol: str) -> None:
    """
    Parol minimal talablarga javob berishini tekshirish:
    - 8 belgidan kam bo'lmasin
    - kamida 1 ta raqam
    - kamida 1 ta lotin harfi
    Xatolik bo'lsa AppException.
    """
    errors = []
    if len(parol) < 8:
        errors.append("Parol kamida 8 ta belgidan iborat bo'lishi kerak")
    if not re.search(r"[a-zA-Z]", parol):
        errors.append("Parolda kamida 1 ta lotin harfi bo'lishi kerak")
    if not re.search(r"\d", parol):
        errors.append("Parolda kamida 1 ta raqam bo'lishi kerak")
    if errors:
        raise AuthException("; ".join(errors), status_code=422)


# ============ JWT yaratish ============

def create_access_token(user_id: int, role: str) -> str:
    """Access token yaratish. Muddati: ACCESS_TOKEN_EXPIRE_MINUTES."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "role": role,
        "typ": "access",
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: int) -> tuple[str, str, datetime]:
    """Refresh token yaratish. Qaytaradi: (token_str, jti, expiration).

    JTI (unique token id) DB'da saqlanadi — revoke/rotation uchun.
    """
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    jti = uuid.uuid4().hex
    payload = {
        "sub": str(user_id),
        "typ": "refresh",
        "exp": expire,
        "jti": jti,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM), jti, expire


# ============ JWT decode ============

def decode_access_token(token: str) -> dict | None:
    """
    Access tokenni ochish va validatsiya qilish.
    Xatolik bo'lsa AuthException, yaroqsiz bo'lsa None.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("typ") != "access":
            raise AuthException("Bu token access token emas.")
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Access token muddati o'tgan")
        raise AuthException("Token muddati o'tgan. Iltimos qaytadan kiring.")
    except JWTError as e:
        logger.warning(f"Access token xato: {e}")
        raise AuthException("Noto'g'ri yoki yaroqsiz token.")


def decode_refresh_token(token: str) -> dict | None:
    """
    Refresh tokenni ochish va validatsiya qilish.
    Xatolik bo'lsa None (accessdan farqli — yangilash jarayonida xato bo'lsa qayta kirish kerak).
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("typ") != "refresh":
            return None
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Refresh token muddati o'tgan")
        return None
    except JWTError:
        return None


# ============ Parol validatsiyasi ============

def validate_guvohnoma_raqami(raqam: str) -> str:
    """Guvohnoma raqami formatini tekshirish va normallashtirish."""
    raqam = raqam.strip().upper()
    if not re.match(r"^[A-Z0-9]{3,20}$", raqam):
        raise AuthException("Guvohnoma raqami faqat lotin harflar va raqamlardan iborat bo'lishi kerak (3-20 belgi).", status_code=422)
    return raqam
