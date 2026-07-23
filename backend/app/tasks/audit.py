"""
XAVFSIZ XONADON — Fon vazifalari (APScheduler)

Har kuni avtomatik bajariladigan ishlar:
- Lokatsiya loglarni tozalash (LOKATSIYA_SAQLASH_KUN kunlik)
- Bakap ishga tushirish (agar BACKUP_ENCRYPT_PASSWORD berilgan bo'lsa)
"""

import logging
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import delete, text

from app.config import settings
from app.database import async_session_maker
from app.models.lokatsiya import LokatsiyaLog
from app.models.audit import AuditLog

logger = logging.getLogger("xavfsiz_xonadon.tasks")

# Global scheduler — barcha vaqtlar Asia/Tashkent da
scheduler = AsyncIOScheduler(timezone=ZoneInfo("Asia/Tashkent"))


async def _cleanup_old_locations() -> None:
    """
    90 kundan (yoki LOKATSIYA_SAQLASH_KUN) eski lokatsiya loglarini o'chirish.
    Har kuni soat 03:00 da ishga tushadi.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=settings.LOKATSIYA_SAQLASH_KUN)

    async with async_session_maker() as session:
        try:
            stmt = delete(LokatsiyaLog).where(LokatsiyaLog.qabul_vaqti < cutoff)
            result = await session.execute(stmt)
            await session.commit()
            deleted = result.rowcount
            if deleted > 0:
                logger.info(f"LokatsiyaLog tozalandi: {deleted} ta yozuv (>{settings.LOKATSIYA_SAQLASH_KUN} kun)")
            else:
                logger.debug("LokatsiyaLog: o'chiriladigan yozuv yo'q")
        except Exception as e:
            await session.rollback()
            logger.error(f"LokatsiyaLog tozalashda xatolik: {e}")


async def _cleanup_old_audit_logs() -> None:
    """
    180 kundan eski audit loglarni o'chirish.
    Har yakshanba kuni soat 04:00 da ishga tushadi.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=180)

    async with async_session_maker() as session:
        try:
            stmt = delete(AuditLog).where(AuditLog.vaqt < cutoff)
            result = await session.execute(stmt)
            await session.commit()
            deleted = result.rowcount
            if deleted > 0:
                logger.info(f"AuditLog tozalandi: {deleted} ta yozuv (>180 kun)")
        except Exception as e:
            await session.rollback()
            logger.error(f"AuditLog tozalashda xatolik: {e}")


async def _vacuum_tables() -> None:
    """
    Har yakshanba soat 05:00 da PostgreSQL VACUUM ANALYZE.
    """
    async with async_session_maker() as session:
        try:
            await session.execute(text("VACUUM ANALYZE"))
            await session.commit()
            logger.info("VACUUM ANALYZE bajarildi")
        except Exception as e:
            await session.rollback()
            logger.error(f"VACUUM da xatolik: {e}")


def start_scheduler() -> None:
    """Barcha fon vazifalarini ro'yxatdan o'tkazish va ishga tushirish."""

    # ---------- Har kuni 03:00 — lokatsiya tozalash ----------
    scheduler.add_job(
        _cleanup_old_locations,
        trigger=CronTrigger(hour=3, minute=0),
        id="cleanup_locations",
        name="Lokatsiya loglarni tozalash",
        replace_existing=True,
    )

    # ---------- Har yakshanba 04:00 — audit tozalash ----------
    scheduler.add_job(
        _cleanup_old_audit_logs,
        trigger=CronTrigger(day_of_week="sun", hour=4, minute=0),
        id="cleanup_audit",
        name="Audit loglarni tozalash",
        replace_existing=True,
    )

    # ---------- Har yakshanba 05:00 — VACUUM ----------
    scheduler.add_job(
        _vacuum_tables,
        trigger=CronTrigger(day_of_week="sun", hour=5, minute=0),
        id="vacuum_tables",
        name="PostgreSQL VACUUM ANALYZE",
        replace_existing=True,
    )

    # ---------- Boshlab va log ----------
    if not scheduler.running:
        scheduler.start()
        logger.info("APScheduler ishga tushdi (lokatsiya tozalash, audit tozalash, VACUUM)")
    else:
        logger.info("APScheduler avvaldan ishlayapti")


def stop_scheduler() -> None:
    """Schedulerni to'xtatish (shutdown)."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler to'xtatildi")
