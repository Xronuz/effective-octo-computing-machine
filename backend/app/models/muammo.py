"""
XAVFSIZ XONADON — Muammolar modeli
Muammo, Foto jadvallari. Barcha ENUM tiplar, indekslar, validatsiya logikasi.
"""

import enum

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM, UUID
from sqlalchemy.orm import relationship

from app.database import Base


# ============ ENUM tiplar (PostgreSQL da yaratiladi) ============

class MuammoTuri(str, enum.Enum):
    ochiq_elektr_simi = "ochiq_elektr_simi"
    elektr_shchit_nosoz = "elektr_shchit_nosoz"
    gaz_shlangi_nosoz = "gaz_shlangi_nosoz"
    gaz_hidi = "gaz_hidi"
    isitish_uskunasi = "isitish_uskunasi"
    mo_ri_tozalanmagan = "mo_ri_tozalanmagan"
    ot_ochirgich_yoq = "ot_ochirgich_yoq"
    evakuatsiya_yoli_yopiq = "evakuatsiya_yoli_yopiq"
    boshqa = "boshqa"


# O'zbekcha nomlar — interfeysda ko'rsatish uchun
MUAMMO_TURI_NOMLARI = {
    MuammoTuri.ochiq_elektr_simi: "Ochiq elektr simi",
    MuammoTuri.elektr_shchit_nosoz: "Elektr shchit nosozligi",
    MuammoTuri.gaz_shlangi_nosoz: "Gaz shlangi nosozligi",
    MuammoTuri.gaz_hidi: "Gaz hidi",
    MuammoTuri.isitish_uskunasi: "Isitish uskunasi nosozligi",
    MuammoTuri.mo_ri_tozalanmagan: "Mo'ri tozalanmagan",
    MuammoTuri.ot_ochirgich_yoq: "O't o'chirgich yo'q",
    MuammoTuri.evakuatsiya_yoli_yopiq: "Evakuatsiya yo'li yopiq",
    MuammoTuri.boshqa: "Boshqa",
}


class MuammoStatus(str, enum.Enum):
    ochiq = "ochiq"
    jarayonda = "jarayonda"
    yopilgan = "yopilgan"
    muddati_otgan = "muddati_otgan"


class XavfDarajasi(str, enum.Enum):
    past = "past"
    orta = "orta"
    yuqori = "yuqori"
    kritik = "kritik"


class FotoTuri(str, enum.Enum):
    oldin = "oldin"
    keyin = "keyin"


# ============ Muammo ============

class Muammo(Base):
    __tablename__ = "muammolar"

    id = Column(Integer, primary_key=True, autoincrement=True)
    xonadon_id = Column(Integer, ForeignKey("xonadonlar.id"), nullable=False)
    xodim_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    turi = Column(
        PG_ENUM(MuammoTuri, name="muammo_turi", create_type=False),
        nullable=False,
    )
    tavsif = Column(Text, nullable=True)

    xavf = Column(
        PG_ENUM(XavfDarajasi, name="xavf_darajasi", create_type=False),
        nullable=False,
        default="orta",
    )
    status = Column(
        PG_ENUM(MuammoStatus, name="muammo_status", create_type=False),
        nullable=False,
        default="ochiq",
    )

    ornida_bartaraf = Column(Boolean, default=False, nullable=False)

    # Muddat
    muddat = Column(Date, nullable=True)
    muddat_belgilagan_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Tashkilotga yo'naltirish
    tashkilot = Column(String(120), nullable=True)
    tashkilotga_sana = Column(DateTime(timezone=True), nullable=True)

    # Geo
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    gps_aniqlik = Column(Float, nullable=True)
    mock_gps = Column(Boolean, default=False, nullable=False)
    shubhali = Column(Boolean, default=False, nullable=False)

    # Offline sinxronlash
    client_uuid = Column(UUID(as_uuid=True), unique=True, nullable=False)
    qurilma_vaqti = Column(DateTime(timezone=True), nullable=False)
    sinxron_vaqti = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Yopilgan
    yopilgan_sana = Column(DateTime(timezone=True), nullable=True)
    yopgan_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # ============ Munosabatlar ============
    xonadon = relationship("Xonadon", back_populates="muammolar", lazy="selectin")
    xodim = relationship("User", back_populates="muammolar", foreign_keys=[xodim_id], lazy="selectin")
    muddat_belgilagan = relationship("User", foreign_keys=[muddat_belgilagan_id])
    yopgan = relationship("User", foreign_keys=[yopgan_id])

    fotolar = relationship("Foto", back_populates="muammo", lazy="selectin", cascade="all, delete-orphan")

    @property
    def turi_nomi(self) -> str:
        """Muammo turining o'zbekcha nomi."""
        return MUAMMO_TURI_NOMLARI.get(self.turi, self.turi.value)

    @property
    def muddat_qolgan_kun(self) -> int | None:
        """Muddatga qolgan kunlar soni. Salbiy = kechikkan."""
        if self.muddat is None:
            return None
        from datetime import date
        delta = self.muddat - date.today()
        return delta.days

    def __repr__(self):
        return f"<Muammo(id={self.id}, turi={self.turi}, status={self.status})>"


# ============ Foto ============

class Foto(Base):
    __tablename__ = "fotolar"

    id = Column(Integer, primary_key=True, autoincrement=True)
    muammo_id = Column(Integer, ForeignKey("muammolar.id", ondelete="CASCADE"), nullable=False)

    turi = Column(
        PG_ENUM(FotoTuri, name="foto_turi", create_type=False),
        nullable=False,
    )
    fayl_yoli = Column(Text, nullable=False)
    sha256 = Column(String(64), nullable=False)
    exif_lat = Column(Float, nullable=True)
    exif_lng = Column(Float, nullable=True)
    exif_vaqt = Column(DateTime(timezone=True), nullable=True)
    olcham_byte = Column(Integer, nullable=True)
    yuklangan = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Munosabatlar
    muammo = relationship("Muammo", back_populates="fotolar")

    def __repr__(self):
        return f"<Foto(id={self.id}, turi={self.turi})>"
