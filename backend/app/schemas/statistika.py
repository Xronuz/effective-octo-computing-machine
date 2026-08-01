"""
XAVFSIZ XONADON — Statistika Pydantic schemalari.
Analitika sahifasi uchun agregat javob modellari.
"""
from typing import Optional, List
from pydantic import BaseModel, Field


# ============ Umumiy statistika ============

class UmumiyStatistika(BaseModel):
    """Dashboard uchun umumiy ko'rsatkichlar.

    Diqqat: `muammo_soni` — faqat HAQIQIY muammolar (tekshiruv_natijasi =
    muammo_topildi). Barcha tashriflar soni uchun `tashrif_soni` ishlating.
    """
    xonadon_soni: int = Field(description="Jami xonadonlar soni")
    kocha_soni: int = Field(description="Jami ko'chalar soni")
    muammo_soni: int = Field(description="Muammo topilgan tashriflar soni")
    tashrif_soni: int = Field(default=0, description="Jami tashriflar soni (barcha natijalar)")
    muammosiz_soni: int = Field(default=0, description="Tekshirilgan, muammo topilmagan tashriflar")
    kira_olmadi_soni: int = Field(default=0, description="Xonadonga kira olmagan tashriflar")
    ochiq_muammolar: int = Field(description="Ochiq + jarayonda muammolar soni")
    yopilgan_muammolar: int = Field(description="Yopilgan/tuzatilgan muammolar soni")
    xodim_soni: int = Field(description="Faol xodimlar soni")
    mfy_soni: int = Field(description="MFY lar soni")
    tekshirilgan_xonadon: int = Field(
        description="Kamida 1 marta HAQIQATDA tekshirilgan xonadonlar (kira olmagan tashriflar sanalmaydi)"
    )
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


# ============ Kunlik tashrif statistikasi ============

class TashrifNatijaStat(BaseModel):
    """Bir kesim bo'yicha tashrif natijalari taqsimoti."""
    jami: int = Field(default=0, description="Jami tashriflar")
    muammosiz: int = Field(default=0, description="Tekshirildi, muammo topilmadi")
    muammoli: int = Field(default=0, description="Muammo topildi")
    kira_olmadi: int = Field(default=0, description="Xonadonga kira olmadi")


class XodimKunlikStat(TashrifNatijaStat):
    """Kun ichida bitta xodim bajargan ishlar."""
    xodim_id: int
    xodim_fio: str
    tekshirilgan_xonadon: int = Field(
        default=0,
        description="Haqiqatda tekshirilgan noyob xonadonlar (kira olmagan tashriflar sanalmaydi)",
    )
    oxirgi_faollik: Optional[str] = None


class KunlikStatistika(TashrifNatijaStat):
    """Tanlangan kun (Toshkent) bo'yicha umumiy hisobot + xodimlar kesimi."""
    sana: str = Field(description="YYYY-MM-DD (Toshkent kuni)")
    tekshirilgan_xonadon: int = Field(
        default=0, description="Haqiqatda tekshirilgan noyob xonadonlar"
    )
    xodimlar: List[XodimKunlikStat] = Field(default_factory=list)
