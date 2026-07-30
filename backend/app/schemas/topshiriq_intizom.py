"""
XAVFSIZ XONADON — Topshiriq va Intizom Pydantic schemalari.
Topshiriq va Intizom CRUD uchun so'rov/javob modellari.
"""
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator


# ============ Topshiriq yaratish ============

class TopshiriqCreate(BaseModel):
    """Yangi topshiriq yaratish. rahbar_id server tomonidan olinadi."""
    xodim_id: int
    mfy_id: Optional[int] = None
    kocha_id: Optional[int] = None
    muammo_id: Optional[int] = None
    sarlavha: str = Field(..., min_length=1, max_length=200)
    matn: Optional[str] = Field(None, max_length=2000)
    muddat: date

    # Validatsiyalar


# ============ Topshiriq yangilash ============

class TopshiriqUpdate(BaseModel):
    """Topshiriq holatini yangilash."""
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = {"yangi", "korildi", "bajarildi", "kechikkan"}
        if v not in allowed:
            raise ValueError(f"Status: {', '.join(sorted(allowed))}")
        return v


# ============ Topshiriq javobi ============

class TopshiriqResponse(BaseModel):
    """Topshiriq haqida to'liq ma'lumot."""
    id: int
    rahbar_id: int
    xodim_id: int
    mfy_id: Optional[int] = None
    kocha_id: Optional[int] = None
    muammo_id: Optional[int] = None
    sarlavha: str
    matn: Optional[str] = None
    muddat: date
    status: str
    yaratilgan: datetime
    korilgan: Optional[datetime] = None
    bajarilgan: Optional[datetime] = None

    # Qo'shimcha maydonlar (JOIN lar orqali)
    rahbar_fio: Optional[str] = None
    xodim_fio: Optional[str] = None
    mfy_nomi: Optional[str] = None
    kocha_nomi: Optional[str] = None

    model_config = {"from_attributes": True}


class TopshiriqListResponse(BaseModel):
    """Sahifalangan topshiriqlar ro'yxati."""
    items: List[TopshiriqResponse]
    total: int
    page: int
    size: int
    pages: int


# ============ Topshiriq filtr ============

class TopshiriqFilter(BaseModel):
    """Topshiriqlarni filtrlash parametrlari."""
    xodim_id: Optional[int] = None
    mfy_id: Optional[int] = None
    kocha_id: Optional[int] = None
    status: Optional[str] = Field(None, description="yangi|korildi|bajarildi|kechikkan")
    muddat_dan: Optional[date] = None
    muddat_gacha: Optional[date] = None
    page: int = Field(default=1, ge=1)
    size: int = Field(default=20, ge=1, le=100)


# ============ Intizom yaratish ============

class IntizomCreate(BaseModel):
    """Yangi intizom yaratish. bergan_id server tomonidan olinadi."""
    xodim_id: int
    muammo_id: Optional[int] = None
    turi: str
    sabab: str = Field(..., max_length=2000)

    @field_validator("turi")
    @classmethod
    def validate_turi(cls, v: str) -> str:
        allowed = {"ogohlantirish", "hayfsan", "ragbat"}
        if v not in allowed:
            raise ValueError(f"Turi: {', '.join(sorted(allowed))}")
        return v


# ============ Intizom javobi ============

class IntizomResponse(BaseModel):
    """Intizom haqida to'liq ma'lumot."""
    id: int
    xodim_id: int
    muammo_id: Optional[int] = None
    turi: str
    sabab: str
    bergan_id: int
    sana: datetime
    
    # Qo'shimcha maydonlar (JOIN lar orqali)
    xodim_fio: Optional[str] = None
    bergan_fio: Optional[str] = None

    model_config = {"from_attributes": True}


class IntizomListResponse(BaseModel):
    """Sahifalangan intizomlar ro'yxati."""
    items: List[IntizomResponse]
    total: int
    page: int
    size: int
    pages: int


# ============ Intizom filtr ============

class IntizomFilter(BaseModel):
    """Intizomlarni filtrlash parametrlari."""
    xodim_id: Optional[int] = None
    turi: Optional[str] = Field(None, description="ogohlantirish|hayfsan|ragbat")
    sana_dan: Optional[datetime] = None
    sana_gacha: Optional[datetime] = None
    page: int = Field(default=1, ge=1)
    size: int = Field(default=20, ge=1, le=100)