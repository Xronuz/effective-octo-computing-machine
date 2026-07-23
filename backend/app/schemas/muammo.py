"""
XAVFSIZ XONADON — Muammo Pydantic schemalari.
Muammo CRUD uchun so'rov/javob modellari.
"""
from datetime import date, datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


# ============ Muammo yaratish ============

class MuammoCreate(BaseModel):
    """Yangi muammo qayd etish (mobil ilovadan)."""
    xonadon_id: int
    turi: str = Field(..., min_length=1, max_length=40)
    tavsif: Optional[str] = Field(None, max_length=2000)
    xavf: str = Field(default="orta", min_length=1, max_length=20)
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    gps_aniqlik: Optional[float] = Field(None, ge=0)
    mock_gps: bool = False
    client_uuid: UUID = Field(..., description="Qurilma tomonidan generatsiya qilingan UUID (idempotency)")
    qurilma_vaqti: datetime
    ornida_bartaraf: bool = False
    muddat: Optional[date] = None
    has_keyin_foto: bool = False
    fotos_sha256_list: Optional[list[str]] = None

    @field_validator("turi")
    @classmethod
    def validate_turi(cls, v: str) -> str:
        allowed = {
            "ochiq_elektr_simi", "elektr_shchit_nosoz", "gaz_shlangi_nosoz",
            "gaz_hidi", "isitish_uskunasi", "mo_ri_tozalanmagan",
            "ot_ochirgich_yoq", "evakuatsiya_yoli_yopiq", "boshqa",
        }
        if v not in allowed:
            raise ValueError(f"Noto'g'ri muammo turi. Ruxsat etilgan: {', '.join(sorted(allowed))}")
        return v

    @field_validator("xavf")
    @classmethod
    def validate_xavf(cls, v: str) -> str:
        if v not in {"past", "orta", "yuqori", "kritik"}:
            raise ValueError("Xavf darajasi: past, orta, yuqori yoki kritik")
        return v


# ============ Muammo yangilash ============

class MuammoUpdate(BaseModel):
    """Muammo holatini yangilash (rahbar/xodim)."""
    status: Optional[str] = Field(None, min_length=1, max_length=20)
    ornida_bartaraf: Optional[bool] = None
    muddat: Optional[date] = None
    xavf: Optional[str] = Field(None, max_length=20)
    tashkilot: Optional[str] = Field(None, max_length=120)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in {"ochiq", "jarayonda", "yopilgan", "muddati_otgan"}:
            raise ValueError("Status: ochiq, jarayonda, yopilgan yoki muddati_otgan")
        return v

    @field_validator("xavf")
    @classmethod
    def validate_xavf(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in {"past", "orta", "yuqori", "kritik"}:
            raise ValueError("Xavf darajasi: past, orta, yuqori yoki kritik")
        return v


class MuammoYopish(BaseModel):
    """Muammoni bartaraf etilgan deb yopish (foto bilan)."""
    ornida_bartaraf: bool = True
    tavsif: Optional[str] = Field(None, max_length=2000)


# ============ Muammo javobi ============

class FotoResponse(BaseModel):
    """Muammo fotosi."""
    id: int
    turi: str
    fayl_yoli: str
    yuklangan: datetime

    model_config = {"from_attributes": True}


class MuammoResponse(BaseModel):
    """Muammo haqida to'liq ma'lumot."""
    id: int
    xonadon_id: int
    xodim_id: int
    turi: str
    turi_nomi: Optional[str] = None
    tavsif: Optional[str] = None
    xavf: str
    status: str
    ornida_bartaraf: bool
    muddat: Optional[date] = None
    muddat_qolgan_kun: Optional[int] = None
    tashkilot: Optional[str] = None
    tashkilotga_sana: Optional[datetime] = None
    lat: float
    lng: float
    gps_aniqlik: Optional[float] = None
    mock_gps: bool
    shubhali: bool
    client_uuid: str
    qurilma_vaqti: datetime
    sinxron_vaqti: datetime
    yopilgan_sana: Optional[datetime] = None

    fotolar: list[FotoResponse] = []

    # Xonadon manzili va xodim ismi qo'shib beriladi
    xonadon_manzili: Optional[str] = None
    xodim_fio: Optional[str] = None

    model_config = {"from_attributes": True}


class MuammoListResponse(BaseModel):
    """Sahifalangan muammolar ro'yxati."""
    items: list[MuammoResponse]
    total: int
    page: int
    size: int
    pages: int


# ============ Filtr ============

class MuammoFilter(BaseModel):
    """Muammolarni filtrlash parametrlari."""
    status: Optional[str] = Field(None, description="ochiq, jarayonda, yopilgan, muddati_otgan")
    turi: Optional[str] = Field(None, max_length=40)
    xavf: Optional[str] = Field(None, max_length=20)
    mfy_id: Optional[int] = None
    xodim_id: Optional[int] = None
    shubhali: Optional[bool] = None
    ornida_bartaraf: Optional[bool] = None
    sana_dan: Optional[date] = None
    sana_gacha: Optional[date] = None
    qidiruv: Optional[str] = Field(None, max_length=200, description="Manzil/tavsif bo'yicha")
    page: int = Field(default=1, ge=1)
    size: int = Field(default=20, ge=1, le=100)


# ============ Foto bog'lash ============

class MuammoFotoLink(BaseModel):
    """Yuklangan fotolarni muammoga bog'lash."""
    fayl_yoli: str = Field(..., max_length=500)
    # Server upload paytida original baytlardan hisoblab qaytargan hash — majburiy
    sha256: str = Field(..., min_length=64, max_length=64)
    exif_lat: Optional[float] = Field(None, ge=-90, le=90)
    exif_lng: Optional[float] = Field(None, ge=-180, le=180)
    exif_vaqt: Optional[str] = Field(None, max_length=40)
    olcham_byte: Optional[int] = Field(None, ge=0)


class FotolarniBoglash(BaseModel):
    """Yuklangan fotolarni muammoga bog'lash so'rovi."""
    fotolar: list[MuammoFotoLink] = Field(..., min_length=1, max_length=10)
