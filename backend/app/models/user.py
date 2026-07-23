"""
XAVFSIZ XONADON — Foydalanuvchilar modeli
Users, XodimMfy (xodim <-> MFY biriktirish)
"""

import enum

from sqlalchemy import (
    Boolean,
    BigInteger,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM

from app.database import Base


# ============ ENUM tiplar ============

class UserRole(str, enum.Enum):
    superadmin = "superadmin"
    rahbar = "rahbar"
    xodim = "xodim"


class UserStatus(str, enum.Enum):
    kutilmoqda = "kutilmoqda"
    faol = "faol"
    bloklangan = "bloklangan"


# ============ Users jadvali ============

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    guvohnoma_raqami = Column(String(20), unique=True, nullable=False)
    parol_hash = Column(String(255), nullable=False)
    familiya = Column(String(60), nullable=False)
    ism = Column(String(60), nullable=False)
    sharif = Column(String(60), nullable=True)
    lavozim = Column(String(120), nullable=False)
    telefon = Column(String(20), nullable=True)
    profil_foto_url = Column(Text, nullable=True)

    rol = Column(
        PG_ENUM(UserRole, name="user_role", create_type=False),
        nullable=False,
        default="xodim",
    )
    holat = Column(
        PG_ENUM(UserStatus, name="user_status", create_type=False),
        nullable=False,
        default="kutilmoqda",
    )

    telegram_chat_id = Column(BigInteger, nullable=True)
    push_token = Column(Text, nullable=True)
    yaratilgan = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    oxirgi_kirish = Column(DateTime(timezone=True), nullable=True)

    # ============ Munosabatlar ============
    xodim_mfylar = relationship("XodimMfy", back_populates="xodim", foreign_keys="XodimMfy.xodim_id", lazy="selectin")
    muammolar = relationship("Muammo", back_populates="xodim", foreign_keys="Muammo.xodim_id", lazy="selectin")
    refresh_tokens = relationship('RefreshToken', back_populates='user', foreign_keys='RefreshToken.user_id', lazy='selectin')

    @property
    def full_name(self) -> str:
        """F.I.Sh formatida to'liq ism."""
        parts = [self.familiya, self.ism]
        if self.sharif:
            parts.append(self.sharif)
        return " ".join(parts)

    @property
    def short_name(self) -> str:
        """Familiya I.I. formatida qisqa ism."""
        initials = f"{self.ism[0]}." if self.ism else ""
        if self.sharif:
            initials += f"{self.sharif[0]}."
        return f"{self.familiya} {initials}".strip()

    def __repr__(self):
        return f"<User(id={self.id}, rol={self.rol}, holat={self.holat})>"


# ============ Xodim <-> MFY biriktirish ============

class XodimMfy(Base):
    __tablename__ = "xodim_mfy"
    __table_args__ = (
        UniqueConstraint("xodim_id", "mfy_id", name="uq_xodim_mfy"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    xodim_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mfy_id = Column(Integer, ForeignKey("mfy.id", ondelete="CASCADE"), nullable=False)
    biriktirgan_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    sana = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    faol = Column(Boolean, default=True, nullable=False)

    # Munosabatlar
    xodim = relationship("User", back_populates="xodim_mfylar", foreign_keys=[xodim_id])
    mfy = relationship("Mfy", back_populates="xodimlar", lazy="selectin")
    biriktirgan = relationship("User", foreign_keys=[biriktirgan_id])

    def __repr__(self):
        return f"<XodimMfy(xodim_id={self.xodim_id}, mfy_id={self.mfy_id})>"


# ============ Refresh Token modeli ============

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    token_jti = Column(String(64), unique=True, nullable=False, index=True)
    revoked = Column(Boolean, default=False, nullable=False)
    yaratilgan = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    muddati = Column(DateTime(timezone=True), nullable=False)

    # Munosabatlar
    user = relationship('User', back_populates='refresh_tokens', foreign_keys=[user_id])

    def __repr__(self):
        return f"<RefreshToken(id={self.id}, user_id={self.user_id}, token_jti='{self.token_jti[:8]}..., revoked={self.revoked}, muddati={self.muddati})>"