"""
XAVFSIZ XONADON — Fon vazifalari (muammo/Telegram/backup)

Mavjud APScheduler (app.tasks.audit) ga qo'shiladigan ishlar:
- muddat_tekshiruvi     — har soatda: muddati o'tgan muammolarni belgilash + Telegram
- muddat_ogohlantirish  — har kuni 08:00: 1 kun qolgan muammolar bo'yicha xodimga eslatma
- kunlik_hisobot        — har kuni 18:30: Telegram guruhga qisqa hisobot
- backup                — har kuni 02:00: scripts/backup.sh ni ishga tushirish
"""

import asyncio
import logging
import os
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import async_session_maker
from app.models.muammo import Muammo, MuammoStatus
from app.models.hudud import Xonadon, Kocha
from app.services.telegram_xabar import (
    _guruhga_yubor,
    _get_bot,
    _manzil,
    _turi_nomi,
    _sana,
    muddati_otdi_xabar,
)

logger = logging.getLogger("xavfsiz_xonadon.tasks")

TOSHKENT = ZoneInfo("Asia/Tashkent")

# Loyiha root'idagi backup skripti (Docker konteynerda bo'lmasligi mumkin).
# ESLATMA: prod'da kunlik backup uchun docker-compose.prod.yml dagi alohida
# `backup` konteyneri (crond, 02:00) javobgar. Bu job faqat dev muhitida
# (skript mavjud bo'lganda) ishlaydi; prod backend konteynerida skript yo'q —
# faqat warning yoziladi (xavfli holat emas).
BACKUP_SCRIPT = Path(__file__).resolve().parents[3] / "scripts" / "backup.sh"


def _muammo_query():
    """Xabar uchun kerakli munosabatlar yuklangan muammo so'rovi."""
    return select(Muammo).options(
        # Manzil uchun: xonadon → kocha → mfy
        selectinload(Muammo.xonadon).selectinload(Xonadon.kocha).selectinload(Kocha.mfy),
        selectinload(Muammo.xodim),
        selectinload(Muammo.fotolar),
    )


async def muddat_tekshiruvi() -> None:
    """
    Har soatda: muddati o'tgan (muddat < bugun) ochiq/jarayonda muammolarni
    'muddati_otgan' statusiga o'tkazish va har biri uchun Telegram xabar.
    Faqat shu tekshiruvda statusi O'ZGARGAN yozuvlarga xabar yuboriladi.
    """
    bugun = datetime.now(TOSHKENT).date()

    async with async_session_maker() as session:
        try:
            result = await session.execute(
                _muammo_query().where(
                    Muammo.muddat.isnot(None),
                    Muammo.muddat < bugun,
                    Muammo.status.in_([MuammoStatus.ochiq, MuammoStatus.jarayonda]),
                )
            )
            muammolar = list(result.unique().scalars().all())

            for muammo in muammolar:
                muammo.status = MuammoStatus.muddati_otgan
                kechikkan = (bugun - muammo.muddat).days
                try:
                    await muddati_otdi_xabar(muammo, kechikkan_kun=kechikkan)
                except Exception as e:
                    logger.error(f"Muddati o'tdi xabari xatolik (muammo_id={muammo.id}): {e}")

                # WebSocket broadcast — o'ng panel jonli yangilanishi
                try:
                    from app.ws.manager import broadcast_xavfsiz
                    await broadcast_xavfsiz({
                        "type": "muddat_otdi",
                        "muammo_id": muammo.id,
                        "xodim_id": muammo.xodim_id,
                    })
                except Exception as e:
                    logger.error(f"WebSocket broadcast (muddat o'tdi) xatolik (muammo_id={muammo.id}): {e}")

            await session.commit()
            if muammolar:
                logger.info(f"Muddat tekshiruvi: {len(muammolar)} ta muammo 'muddati_otgan' qilindi")
            else:
                logger.debug("Muddat tekshiruvi: muddati o'tgan muammo yo'q")
        except Exception as e:
            await session.rollback()
            logger.error(f"Muddat tekshiruvida xatolik: {e}")


async def muddat_ogohlantirish() -> None:
    """
    Har kuni 08:00 (Asia/Tashkent): muddatiga 1 kun qolgan ochiq/jarayonda
    muammolar bo'yicha mas'ul xodimga eslatma.
    Alohida push xizmati (app/services/push.py) mavjud emas — xodimning
    telegram_chat_id'siga Telegram orqali yuboriladi.
    """
    ertaga = datetime.now(TOSHKENT).date() + timedelta(days=1)

    async with async_session_maker() as session:
        try:
            result = await session.execute(
                _muammo_query().where(
                    Muammo.muddat == ertaga,
                    Muammo.status.in_([MuammoStatus.ochiq, MuammoStatus.jarayonda]),
                )
            )
            muammolar = list(result.unique().scalars().all())

            bot = _get_bot()
            yuborildi = 0
            for muammo in muammolar:
                xodim = muammo.xodim
                matn = (
                    "⏰ <b>MUDDAT ESLATMASI</b>\n"
                    f"📍 {_manzil(muammo)}\n"
                    f"⚠️ {_turi_nomi(muammo)}\n"
                    f"📅 Muddat: {_sana(muammo.muddat)} — 1 kun qoldi\n"
                    "Iltimos, muammoni o'z vaqtida bartaraf eting."
                )
                if bot is not None and xodim is not None and xodim.telegram_chat_id:
                    try:
                        await bot.send_message(chat_id=xodim.telegram_chat_id, text=matn)
                        yuborildi += 1
                    except Exception as e:
                        logger.error(f"Xodimga eslatma yuborishda xatolik (muammo_id={muammo.id}): {e}")
                else:
                    logger.info(
                        "Eslatma yuborilmadi (bot yoki telegram_chat_id yo'q): "
                        "muammo_id=%s, xodim_id=%s", muammo.id, muammo.xodim_id
                    )

            if muammolar:
                logger.info(f"Muddat ogohlantirish: {len(muammolar)} ta muammo, {yuborildi} ta eslatma yuborildi")
        except Exception as e:
            logger.error(f"Muddat ogohlantirishda xatolik: {e}")


async def kunlik_hisobot() -> None:
    """
    Har kuni 18:30 (Asia/Tashkent): Telegram guruhga qisqa kunlik hisobot —
    bugungi tekshiruvlar, ochiq muammolar, bugun yopilganlar.
    """
    hozir = datetime.now(TOSHKENT)
    kun_boshi = hozir.replace(hour=0, minute=0, second=0, microsecond=0)
    kun_oxiri = kun_boshi + timedelta(days=1)

    async with async_session_maker() as session:
        try:
            # Bugun qayd etilgan tekshiruvlar (muammolar)
            tekshiruv_res = await session.execute(
                select(func.count(Muammo.id)).where(
                    Muammo.sinxron_vaqti >= kun_boshi,
                    Muammo.sinxron_vaqti < kun_oxiri,
                )
            )
            tekshiruvlar = tekshiruv_res.scalar() or 0

            # Hozirgi ochiq muammolar (ochiq + jarayonda + muddati_otgan)
            ochiq_res = await session.execute(
                select(func.count(Muammo.id)).where(
                    Muammo.status.in_([
                        MuammoStatus.ochiq,
                        MuammoStatus.jarayonda,
                        MuammoStatus.muddati_otgan,
                    ])
                )
            )
            ochiq_muammolar = ochiq_res.scalar() or 0

            # Bugun yopilgan muammolar
            yopilgan_res = await session.execute(
                select(func.count(Muammo.id)).where(
                    Muammo.yopilgan_sana >= kun_boshi,
                    Muammo.yopilgan_sana < kun_oxiri,
                )
            )
            yopilganlar = yopilgan_res.scalar() or 0

            matn = (
                f"📊 <b>KUNLIK HISOBOT</b> — {hozir.strftime('%d.%m.%Y')}\n"
                f"🔍 Bugungi tekshiruvlar: {tekshiruvlar} ta\n"
                f"⚠️ Ochiq muammolar: {ochiq_muammolar} ta\n"
                f"✅ Bugun yopilgan: {yopilganlar} ta"
            )
            await _guruhga_yubor(matn)
            logger.info(
                f"Kunlik hisobot: tekshiruv={tekshiruvlar}, ochiq={ochiq_muammolar}, yopilgan={yopilganlar}"
            )
        except Exception as e:
            logger.error(f"Kunlik hisobotda xatolik: {e}")


async def backup() -> None:
    """
    Har kuni 02:00 (Asia/Tashkent): loyiha root'idagi scripts/backup.sh ni
    subprocess orqali ishga tushirish. Skript topilmasa yoki xato bo'lsa —
    faqat log warning (Docker muhitida skript bo'lmasligi mumkin).
    """
    if not BACKUP_SCRIPT.is_file():
        logger.warning(f"Backup skripti topilmadi, o'tkazib yuborildi: {BACKUP_SCRIPT}")
        return

    try:
        jarayon = await asyncio.create_subprocess_exec(
            "bash", str(BACKUP_SCRIPT),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=os.environ.copy(),
        )
        stdout, stderr = await asyncio.wait_for(jarayon.communicate(), timeout=600)
        if jarayon.returncode == 0:
            logger.info("Backup muvaffaqiyatli bajarildi")
        else:
            logger.warning(
                f"Backup skripti xato bilan tugadi (code={jarayon.returncode}): "
                f"{stderr.decode(errors='replace')[:500]}"
            )
    except asyncio.TimeoutError:
        jarayon.kill()
        logger.warning("Backup skripti 600 soniyada tugamadi — to'xtatildi")
    except Exception as e:
        logger.warning(f"Backup ishga tushirishda xatolik: {e}")


def register_muammo_jobs(scheduler) -> None:
    """Muammo/Telegram/backup ishlarini mavjud scheduler'ga qo'shish."""

    # ---------- Har soatda — muddat tekshiruvi ----------
    scheduler.add_job(
        muddat_tekshiruvi,
        trigger=IntervalTrigger(hours=1),
        id="muddat_tekshiruvi",
        name="Muddati o'tgan muammolarni belgilash",
        replace_existing=True,
    )

    # ---------- Har kuni 08:00 — muddat ogohlantirish ----------
    scheduler.add_job(
        muddat_ogohlantirish,
        trigger=CronTrigger(hour=8, minute=0),
        id="muddat_ogohlantirish",
        name="Muddatiga 1 kun qolgan muammolar eslatmasi",
        replace_existing=True,
    )

    # ---------- Har kuni 18:30 — kunlik hisobot ----------
    scheduler.add_job(
        kunlik_hisobot,
        trigger=CronTrigger(hour=18, minute=30),
        id="kunlik_hisobot",
        name="Telegram guruhga kunlik hisobot",
        replace_existing=True,
    )

    # ---------- Har kuni 02:00 — backup ----------
    scheduler.add_job(
        backup,
        trigger=CronTrigger(hour=2, minute=0),
        id="backup",
        name="Kunlik backup (scripts/backup.sh)",
        replace_existing=True,
    )

    logger.info("Muammo fon vazifalari ro'yxatdan o'tdi (muddat, ogohlantirish, hisobot, backup)")
