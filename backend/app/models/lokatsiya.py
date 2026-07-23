"""
XAVFSIZ XONADON — Lokatsiya log modeli
Xodim GPS nuqtalari tarixi.
"""

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Float,
    SmallInteger,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


class LokatsiyaLog(Base):
    """
    Xodim GPS lokatsiyasi tarixi.
    90 kundan eski yozuvlar avtomatik o'chiriladi.
    """
    __tablename__ = "lokatsiya_log"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    xodim_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    aniqlik = Column(Float, nullable=True)       # metr
    tezlik = Column(Float, nullable=True)          # m/s
    batareya = Column(SmallInteger, nullable=True)  # foiz (0-100)
    mock_gps = Column(Boolean, default=False, nullable=False)
    qurilma_vaqti = Column(DateTime(timezone=True), nullable=False)
    qabul_vaqti = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Munosabatlar
    xodim = relationship("User", lazy="selectin")

    def __repr__(self):
        return f"<LokatsiyaLog(id={self.id}, xodim_id={self.xodim_id})>"
