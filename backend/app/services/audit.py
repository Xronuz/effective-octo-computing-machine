"""
XAVFSIZ XONADON — Audit yozish yordamchisi.
muammolar jadvalidagi DB trigger'dan tashqari amallar (users, topshiriq,
intizom, xonadon) uchun qo'lda audit_log yozuvi.
"""
import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog

logger = logging.getLogger("xavfsiz_xonadon")


async def audit_yozish(
    db: AsyncSession,
    *,
    user_id: Optional[int],
    amal: str,
    obyekt_turi: Optional[str] = None,
    obyekt_id: Optional[int] = None,
    eski_qiymat: Optional[dict] = None,
    yangi_qiymat: Optional[dict] = None,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    """
    audit_log jadvaliga bitta yozuv qo'shish (shu sessiya tranzaksiyasida).

    amal — 'user.tasdiqlash', 'user.bloklash', 'topshiriq.yaratish',
    'intizom.yaratish', 'xonadon.yaratish' kabi nuqtali nomlar.
    """
    yozuv = AuditLog(
        user_id=user_id,
        amal=amal,
        obyekt_turi=obyekt_turi,
        obyekt_id=obyekt_id,
        eski_qiymat=eski_qiymat,
        yangi_qiymat=yangi_qiymat,
        ip=ip,
        user_agent=user_agent,
    )
    db.add(yozuv)
    await db.flush()

    logger.info(f"Audit: {amal} obyekt={obyekt_turi}#{obyekt_id} user_id={user_id}")
