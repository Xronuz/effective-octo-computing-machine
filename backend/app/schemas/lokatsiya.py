"""
XAVFSIZ XONADON — Lokatsiya Pydantic schemalari.
Xodim GPS yuborish va qabul qilish.
"""
from datetime import datetime
from pydantic import BaseModel, Field


class LokatsiyaKiruvchi(BaseModel):
    """Mobil ilovadan keladigan GPS ma'lumot."""
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    aniqlik: float | None = Field(None, ge=0, le=1000, description="Metr")
    tezlik: float | None = Field(None, ge=0, le=200, description="m/s")
    batareya: int | None = Field(None, ge=0, le=100)
    mock_gps: bool = False
    qurilma_vaqti: datetime


class LokatsiyaChiquvchi(BaseModel):
    """WebSocket orqali jonli xarita uchun."""
    xodim_id: int
    xodim_fio: str
    lat: float
    lng: float
    aniqlik: float | None = None
    tezlik: float | None = None
    batareya: int | None = None
    mock_gps: bool = False
    qurilma_vaqti: datetime | str
    qabul_vaqti: datetime | str

    model_config = {"from_attributes": True}


class AktivXodimResponse(BaseModel):
    """Hozir faol xodimlar ro'yxati."""
    xodim_id: int
    xodim_fio: str
    lat: float
    lng: float
    aniqlik: float | None = None
    batareya: int | None = None
    ohirgi_vaqt: datetime | str
    # Xarita markerida avatar ko'rsatish uchun — web tomoni buni kutardi,
    # lekin javobda umuman qaytmasdi (marker doim bosh harflar bilan chizilardi)
    profil_foto_url: str | None = None


class LokatsiyaBatchKiruvchi(BaseModel):
    """Mobil ilovadan offline paytda to'plangan GPS nuqtalar."""
    items: list[LokatsiyaKiruvchi] = Field(..., min_length=1, max_length=500)


class MarshrutNuqtaResponse(BaseModel):
    """Kunlik marshrut nuqtasi (polyline uchun)."""
    lat: float
    lng: float
    aniqlik: float | None = None
    tezlik: float | None = None
    batareya: int | None = None
    qurilma_vaqti: datetime | str
    qabul_vaqti: datetime | str