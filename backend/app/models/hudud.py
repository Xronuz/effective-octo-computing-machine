"""
XAVFSIZ XONADON — Hudud modellari
Mfy, Kocha, Xonadon jadvallari.
"""

from geoalchemy2 import Geometry
from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


class Mfy(Base):
    """
    Mahalla fuqarolar yig'ini — 53 ta.
    chegara: PostGIS POLYGON, EPSG:4326 (WGS84).
    """
    __tablename__ = "mfy"

    id = Column(Integer, primary_key=True, autoincrement=True)
    raqami = Column(Integer, unique=True, nullable=False)
    nomi = Column(String(150), nullable=False)
    chegara = Column(Geometry("POLYGON", srid=4326), nullable=True)
    markaz_lat = Column(Float, nullable=True)
    markaz_lng = Column(Float, nullable=True)
    xonadon_soni = Column(Integer, default=0, nullable=False)

    # Munosabatlar
    kochalar = relationship("Kocha", back_populates="mfy", lazy="selectin", cascade="all, delete-orphan")
    xodimlar = relationship("XodimMfy", back_populates="mfy", lazy="selectin")

    def __repr__(self):
        return f"<Mfy(id={self.id}, raqami={self.raqami}, nomi={self.nomi})>"


class Kocha(Base):
    __tablename__ = "kochalar"
    __table_args__ = (
        UniqueConstraint("mfy_id", "nomi", name="uq_mfy_kocha"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    mfy_id = Column(Integer, ForeignKey("mfy.id", ondelete="CASCADE"), nullable=False)
    nomi = Column(String(150), nullable=False)

    # Munosabatlar
    mfy = relationship("Mfy", back_populates="kochalar")
    xonadonlar = relationship("Xonadon", back_populates="kocha", lazy="selectin", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Kocha(id={self.id}, nomi={self.nomi})>"


class Xonadon(Base):
    __tablename__ = "xonadonlar"
    __table_args__ = (
        UniqueConstraint("kocha_id", "uy_raqami", name="uq_kocha_uy"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    kocha_id = Column(Integer, ForeignKey("kochalar.id", ondelete="CASCADE"), nullable=False)
    uy_raqami = Column(String(20), nullable=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    egasi_fio = Column(String(180), nullable=True)
    egasi_tel = Column(String(20), nullable=True)
    izoh = Column(Text, nullable=True)
    yaratilgan = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Munosabatlar
    kocha = relationship("Kocha", back_populates="xonadonlar")
    muammolar = relationship("Muammo", back_populates="xonadon", lazy="selectin")

    # MFY ga shortcut — kocha orqali
    @property
    def mfy(self):
        return self.kocha.mfy if self.kocha else None

    @property
    def full_address(self) -> str:
        """To'liq manzil: MFY nomi, ko'cha nomi, uy raqami."""
        if self.kocha and self.kocha.mfy:
            return f"{self.kocha.mfy.nomi}, {self.kocha.nomi} ko'chasi, {self.uy_raqami}-uy"
        elif self.kocha:
            return f"{self.kocha.nomi} ko'chasi, {self.uy_raqami}-uy"
        return f"{self.uy_raqami}-uy"

    def __repr__(self):
        return f"<Xonadon(id={self.id}, uy={self.uy_raqami})>"
