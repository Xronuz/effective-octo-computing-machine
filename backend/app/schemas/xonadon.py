"""
XAVFSIZ XONADON — Xonadon Pydantic schemalari.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class XonadonCreate(BaseModel):
    """Yangi xonadon qo'shish."""
    kocha_id: int
    uy_raqami: str = Field(..., min_length=1, max_length=20)
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lng: Optional[float] = Field(None, ge=-180, le=180)
    egasi_fio: Optional[str] = Field(None, max_length=180)
    egasi_tel: Optional[str] = Field(None, max_length=20)
    izoh: Optional[str] = Field(None, max_length=500)


class XonadonUpdate(BaseModel):
    """Xonadon ma'lumotlarini yangilash."""
    kocha_id: Optional[int] = None
    uy_raqami: Optional[str] = Field(None, min_length=1, max_length=20)
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lng: Optional[float] = Field(None, ge=-180, le=180)
    egasi_fio: Optional[str] = Field(None, max_length=180)
    egasi_tel: Optional[str] = Field(None, max_length=20)
    izoh: Optional[str] = Field(None, max_length=500)


class XonadonResponse(BaseModel):
    """Xonadon haqida ma'lumot."""
    id: int
    kocha_id: int
    uy_raqami: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    egasi_fio: Optional[str] = None
    egasi_tel: Optional[str] = None
    izoh: Optional[str] = None
    yaratilgan: datetime

    # Bog'liq ma'lumotlar
    full_address: Optional[str] = None
    kocha_nomi: Optional[str] = None
    mfy_nomi: Optional[str] = None
    mfy_id: Optional[int] = None
    ochiq_muammolar_soni: int = 0
    tekshirilgan_bugun: bool = False

    model_config = {"from_attributes": True}


class XonadonListResponse(BaseModel):
    """Sahifalangan xonadonlar ro'yxati."""
    items: list[XonadonResponse]
    total: int
    page: int
    size: int
    pages: int


class XonadonFilter(BaseModel):
    """Xonadonlarni filtrlash."""
    mfy_id: Optional[int] = None
    kocha_id: Optional[int] = None
    ochiq_muammo: Optional[bool] = None  # Faqat ochiq muammosi bor xonadonlar
    qidiruv: Optional[str] = Field(None, max_length=200, description="Manzil/egasi bo'yicha")
    page: int = Field(default=1, ge=1)
    size: int = Field(default=20, ge=1, le=100)
