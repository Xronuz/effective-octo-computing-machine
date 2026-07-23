"""
XAVFSIZ XONADON — Statistika Pydantic schemalari.
Analitika sahifasi uchun agregat javob modellari.
"""
from typing import Optional, List
from pydantic import BaseModel, Field


# ============ Umumiy statistika ============

class UmumiyStatistika(BaseModel):
    """Dashboard uchun umumiy ko'rsatkichlar."""
    xonadon_soni: int = Field(description="Jami xonadonlar soni")
    muammo_soni: int = Field(description="Jami muammolar soni")
    ochiq_muammolar: int = Field(description="Ochiq + jarayonda muammolar soni")
    yopilgan_muammolar: int = Field(description="Yopilgan/tuzatilgan muammolar soni")
    xodim_soni: int = Field(description="Faol xodimlar soni")
    mfy_soni: int = Field(description="MFY lar soni")
    tekshirilgan_xonadon: int = Field(description="Kamida 1 marta tekshirilgan xonadonlar soni")
    foiz: float = Field(description="Tekshirilgan foizi (0-100)")


class MuammoTuriStat(BaseModel):
    """Muammo turi bo'yicha statistika."""
    turi: str
    soni: int


class MuammoXavfStat(BaseModel):
    """Xavf darajasi bo'yicha statistika."""
    xavf: str
    soni: int


class MuammoStatusStat(BaseModel):
    """Status bo'yicha statistika."""
    status: str
    soni: int


class MFYStatistika(BaseModel):
    """Har bir MFY bo'yicha statistika."""
    mfy_id: int
    mfy_nomi: str
    xonadon_soni: int
    tekshirilgan: int
    ochiq_muammo: int
    yopilgan_muammo: int
    foiz: float


class TopshiriqStat(BaseModel):
    """Topshiriqlar bo'yicha statistika."""
    jami: int
    yangi: int
    korildi: int
    bajarildi: int
    kechikkan: int


class IntizomStat(BaseModel):
    """Intizom bo'yicha statistika."""
    jami: int
    ogohlantirish: int
    hayfsan: int
    ragbat: int


class VaqtDavriStat(BaseModel):
    """Vaqt bo'yicha muammolar dinamikasi."""
    davr: str = Field(description="YYYY-MM yoki kun")
    ochilgan: int
    yopilgan: int


# ============ Asosiy javob ============

class StatistikaResponse(BaseModel):
    """To'liq statistika javobi."""
    umumiy: UmumiyStatistika
    muammo_turlari: List[MuammoTuriStat]
    muammo_xavf: List[MuammoXavfStat]
    muammo_status: List[MuammoStatusStat]
    mfylar: List[MFYStatistika]
    topshiriqlar: TopshiriqStat
    intizom: IntizomStat
    vaqt_dinamika: List[VaqtDavriStat] = Field(default_factory=list)


class XodimStatistika(BaseModel):
    """Xodim bo'yicha statistika."""
    xodim_id: int
    xodim_fio: str
    jami_muammo: int
    ochiq_muammo: int
    yopilgan_muammo: int
    jami_tekshirish: int
    oxirgi_faollik: Optional[str] = None
