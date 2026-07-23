"""
XAVFSIZ XONADON — Auth Pydantic schemalari.
Barcha so'rov/javob modellari.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# ============ Auth ============

class RoyxatRequest(BaseModel):
    """Xodim ro'yxatdan o'tish so'rovi."""
    guvohnoma_raqami: str = Field(..., min_length=3, max_length=20, pattern=r"^[A-Z0-9]+$")
    parol: str = Field(..., min_length=8, max_length=100)
    familiya: str = Field(..., min_length=1, max_length=60)
    ism: str = Field(..., min_length=1, max_length=60)
    sharif: Optional[str] = Field(None, max_length=60)
    lavozim: str = Field(..., min_length=2, max_length=120)
    telefon: Optional[str] = Field(None, max_length=20)

    @field_validator("parol")
    @classmethod
    def parol_murakkabligi(cls, v: str) -> str:
        """Parol kamida bitta harf va bitta raqam bo'lishi kerak."""
        if not any(c.isalpha() for c in v):
            raise ValueError("Parol kamida bitta harf bo'lishi kerak")
        if not any(c.isdigit() for c in v):
            raise ValueError("Parol kamida bitta raqam bo'lishi kerak")
        return v


class KirishRequest(BaseModel):
    """Tizimga kirish so'rovi."""
    guvohnoma_raqami: str = Field(..., min_length=1, max_length=20)
    parol: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    """JWT token javobi."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class RefreshRequest(BaseModel):
    """Refresh token yangilash so'rovi."""
    refresh_token: str


class PushTokenRequest(BaseModel):
    """Expo push token saqlash."""
    push_token: str = Field(..., min_length=1)

    @field_validator("push_token")
    @classmethod
    def validate_expo_token(cls, v: str) -> str:
        if not v.startswith("ExponentPushToken["):
            raise ValueError("Noto'g'ri Expo push token formati")
        return v


# ============ User ============

class UserResponse(BaseModel):
    """Foydalanuvchi haqida umumiy ma'lumot."""
    id: int
    guvohnoma_raqami: str
    familiya: str
    ism: str
    sharif: Optional[str] = None
    lavozim: str
    telefon: Optional[str] = None
    profil_foto_url: Optional[str] = None
    rol: str
    holat: str
    yaratilgan: datetime
    oxirgi_kirish: Optional[datetime] = None
    full_name: str

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    """Foydalanuvchi ma'lumotlarini yangilash."""
    lavozim: Optional[str] = Field(None, max_length=120)
    telefon: Optional[str] = Field(None, max_length=20)


class MfyBiriktirishRequest(BaseModel):
    """Xodimga MFY biriktirish so'rovi."""
    mfy_ids: list[int] = Field(..., min_length=1, max_length=53)


# ============ Javob formati ============

class ApiResponse(BaseModel):
    """Barcha API javoblarining asosiy formati."""
    ok: bool
    data: Optional[object] = None
    xato: Optional[str] = None


# ============ Pagination ============

class PaginatedResponse(BaseModel):
    """Sahifalangan javob formati."""
    items: list
    total: int
    page: int
    size: int
    pages: int
