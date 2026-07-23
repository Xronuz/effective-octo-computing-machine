"""
XAVFSIZ XONADON — Hudud Pydantic schemalari.
Mfy, Kocha ro'yxatlari.
"""
from typing import Optional
from pydantic import BaseModel, Field


class KochaResponse(BaseModel):
    """Ko'cha haqida qisqa ma'lumot."""
    id: int
    mfy_id: int
    nomi: str
    xonadon_soni: Optional[int] = 0

    model_config = {"from_attributes": True}


class KochaCreate(BaseModel):
    """Yangi ko'cha qo'shish."""
    mfy_id: int
    nomi: str = Field(..., min_length=1, max_length=150)


class KochaUpdate(BaseModel):
    """Ko'cha nomini yangilash."""
    nomi: str = Field(..., min_length=1, max_length=150)


class MfyCreate(BaseModel):
    """Yangi MFY qo'shish."""
    raqami: int = Field(..., ge=1)
    nomi: str = Field(..., min_length=1, max_length=150)
    markaz_lat: Optional[float] = None
    markaz_lng: Optional[float] = None


class MfyUpdate(BaseModel):
    """MFY ma'lumotlarini yangilash (faqat yuborilgan maydonlar)."""
    raqami: Optional[int] = Field(None, ge=1)
    nomi: Optional[str] = Field(None, min_length=1, max_length=150)
    markaz_lat: Optional[float] = None
    markaz_lng: Optional[float] = None


class MfyResponse(BaseModel):
    """MFY haqida ma'lumot."""
    id: int
    raqami: int
    nomi: str
    markaz_lat: Optional[float] = None
    markaz_lng: Optional[float] = None
    xonadon_soni: int = 0
    kochalar_soni: Optional[int] = 0
    chegara: Optional[dict] = None  # GeoJSON Polygon/MultiPolygon (PostGIS chegara), NULL bo'lsa None

    model_config = {"from_attributes": True}
