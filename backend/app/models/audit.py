"""
XAVFSIZ XONADON — Audit, Topshiriq va Intizom modellari
AuditLog — barcha o'zgarishlar jurnali.
Topshiriq — rahbardan xodimga vazifa.
Intizom — ogohlantirish/hayfsan/rag'bat.
"""

import enum

from sqlalchemy import (
    BigInteger,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM, INET, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


# ============ ENUM tiplar ============

class TopshiriqStatus(str, enum.Enum):
    yangi = "yangi"
    korildi = "korildi"
    bajarildi = "bajarildi"
    kechikkan = "kechikkan"


class IntizomTuri(str, enum.Enum):
    ogohlantirish = "ogohlantirish"
    hayfsan = "hayfsan"
    rag_bat = "ragbat"  # PostgreSQL ENUM da 'ragbat' deb saqlanadi


# ============ Audit Log ============

class AuditLog(Base):
    """
    Har bir POST/PATCH/DELETE amali uchun yozuv.
    O'chirib bo'lmaydi (qo'lda DELETE qilish taqiqlanadi).
    """
    __tablename__ = "audit_log"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    amal = Column(String(60), nullable=False)       # 'muammo.yaratish', 'user.blok'
    obyekt_turi = Column(String(40), nullable=True)   # 'muammolar', 'users'
    obyekt_id = Column(Integer, nullable=True)
    eski_qiymat = Column(JSONB, nullable=True)
    yangi_qiymat = Column(JSONB, nullable=True)
    ip = Column(INET, nullable=True)
    user_agent = Column(Text, nullable=True)
    vaqt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Munosabatlar
    user = relationship("User", lazy="selectin")

    def __repr__(self):
        return f"<AuditLog(id={self.id}, amal={self.amal})>"


# ============ Topshiriqlar ============

class Topshiriq(Base):
    __tablename__ = "topshiriqlar"

    id = Column(Integer, primary_key=True, autoincrement=True)
    rahbar_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    xodim_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mfy_id = Column(Integer, ForeignKey("mfy.id"), nullable=True)
    kocha_id = Column(Integer, ForeignKey("kochalar.id"), nullable=True)
    muammo_id = Column(Integer, ForeignKey("muammolar.id"), nullable=True)

    sarlavha = Column(String(200), nullable=False)
    matn = Column(Text, nullable=True)
    muddat = Column(Date, nullable=False)

    status = Column(
        PG_ENUM(TopshiriqStatus, name="topshiriq_status", create_type=False),
        nullable=False,
        default="yangi",
    )

    yaratilgan = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    korilgan = Column(DateTime(timezone=True), nullable=True)
    bajarilgan = Column(DateTime(timezone=True), nullable=True)

    # Munosabatlar
    rahbar = relationship("User", foreign_keys=[rahbar_id], lazy="selectin")
    xodim = relationship("User", foreign_keys=[xodim_id], lazy="selectin")
    mfy = relationship("Mfy", lazy="selectin")
    kocha = relationship("Kocha", lazy="selectin")
    muammo = relationship("Muammo", lazy="selectin")

    def __repr__(self):
        return f"<Topshiriq(id={self.id}, status={self.status})>"


# ============ Intizom ============

class Intizom(Base):
    __tablename__ = "intizom"

    id = Column(Integer, primary_key=True, autoincrement=True)
    xodim_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    muammo_id = Column(Integer, ForeignKey("muammolar.id"), nullable=True)

    turi = Column(
        # values_callable — bazaga enum qiymati ("ragbat") yuboriladi,
        # member nomi ("rag_bat") emas; aks holda statistika so'rovlari xato beradi
        PG_ENUM(
            IntizomTuri,
            name="intizom_turi",
            create_type=False,
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
    )

    sabab = Column(Text, nullable=False)
    bergan_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sana = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Munosabatlar
    xodim = relationship("User", foreign_keys=[xodim_id], lazy="selectin")
    bergan = relationship("User", foreign_keys=[bergan_id], lazy="selectin")
    muammo = relationship("Muammo", lazy="selectin")

    def __repr__(self):
        return f"<Intizom(id={self.id}, turi={self.turi})>"
