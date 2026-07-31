"""
XAVFSIZ XONADON — Telegram avtopost xizmati.
TZ bo'yicha guruhga avtomatik xabarlar: yangi muammo, bartaraf etildi,
muddati o'tdi. TELEGRAM_GROUP_CHAT_ID bo'sh bo'lsa — faqat log.
"""
import logging
from datetime import date, datetime
from pathlib import Path
from typing import Optional

from app.config import settings
from app.models.muammo import Muammo, MUAMMO_TURI_NOMLARI, FotoTuri

logger = logging.getLogger("xavfsiz_xonadon.telegram")


# ============ Ichki yordamchilar ============

def _get_bot():
    """Ishlayotgan bot instansiyasini olish (polling bilan bir jarayonda)."""
    from app.bot.bot import bot
    return bot


def _enum_qiymat(qiymat) -> str:
    """ENUM member yoki str — ikkalasidan ham string qiymat olish."""
    return getattr(qiymat, "value", qiymat)


def _turi_nomi(muammo: Muammo) -> str:
    """Muammo turining o'zbekcha nomi (str/enum xavfsiz).

    Yangi checklist oqimida `turi` bo'sh bo'ladi — bandlar ro'yxati
    (`taklif_etilgan_tadbirlar`) mavjud bo'lsa, o'sha bandlar ko'rsatiladi.
    """
    qiymat = _enum_qiymat(getattr(muammo, "turi", None))
    for kalit, nomi in MUAMMO_TURI_NOMLARI.items():
        if kalit.value == qiymat:
            return nomi
    if qiymat:
        return str(qiymat)
    bandlar = getattr(muammo, "taklif_etilgan_tadbirlar", None)
    if bandlar:
        return f"Yo'riqnoma bandlari: {bandlar}"
    return "Noma'lum"


def _manzil(muammo: Muammo) -> str:
    """Xonadon manzili — munosabat yuklanmagan bo'lsa zaxira matn."""
    try:
        xonadon = muammo.xonadon
        if xonadon is not None:
            return xonadon.full_address
    except Exception:
        pass
    return f"Xonadon #{muammo.xonadon_id}"


def _xodim_fio(muammo: Muammo) -> str:
    """Mas'ul xodim F.I.Sh (qisqa formatda)."""
    try:
        xodim = muammo.xodim
        if xodim is not None:
            return xodim.short_name
    except Exception:
        pass
    return f"Xodim #{muammo.xodim_id}"


def _sana_vaqt(dt: Optional[datetime]) -> str:
    """'10.07.2026, 10:15' formatida."""
    if dt is None:
        return "—"
    return dt.strftime("%d.%m.%Y, %H:%M")


def _sana(d: Optional[date]) -> str:
    """'14.07.2026' formatida."""
    if d is None:
        return "—"
    return d.strftime("%d.%m.%Y")


def _foto_abs_yol(fayl_yoli: str) -> Optional[Path]:
    """Nisbiy foto yo'lidan xavfsiz absolyut yo'l (traversal himoyali)."""
    from app.services.upload import get_file_abs_path
    try:
        return get_file_abs_path(fayl_yoli)
    except Exception as e:
        logger.warning("Foto yo'lini aniqlashda xatolik (%s): %s", fayl_yoli, e)
        return None


def _fotolarni_tanlash(muammo: Muammo, *afzal_turlar: FotoTuri) -> Optional[str]:
    """Berilgan tartibda birinchi mos foto yo'lini tanlash."""
    try:
        fotolar = list(muammo.fotolar or [])
    except Exception:
        return None
    for tur in afzal_turlar:
        for foto in fotolar:
            if _enum_qiymat(foto.turi) == tur.value:
                return foto.fayl_yoli
    return fotolar[0].fayl_yoli if fotolar else None


async def _guruhga_yubor(matn: str, foto_yoli: Optional[str] = None) -> None:
    """Guruhga matn (yoki foto + caption) yuborish. Xatolik tashlanmaydi."""
    chat_id = settings.TELEGRAM_GROUP_CHAT_ID
    if not chat_id:
        logger.info("TELEGRAM_GROUP_CHAT_ID sozlanmagan — xabar yuborilmadi: %s", matn.splitlines()[0])
        return

    bot = _get_bot()
    if bot is None:
        logger.warning("Telegram bot ishga tushmagan — guruh xabari yuborilmadi: %s", matn.splitlines()[0])
        return

    try:
        abs_yol = _foto_abs_yol(foto_yoli) if foto_yoli else None
        if foto_yoli and abs_yol is None:
            logger.warning("Foto topilmadi, faqat matn yuboriladi: %s", foto_yoli)

        if abs_yol is not None:
            from aiogram.types import FSInputFile
            await bot.send_photo(
                chat_id=int(chat_id),
                photo=FSInputFile(abs_yol),
                caption=matn,
            )
        else:
            await bot.send_message(chat_id=int(chat_id), text=matn)
    except Exception as e:
        logger.error("Telegram guruhga xabar yuborishda xatolik: %s", e)


# ============ Avtopost funksiyalari (TZ formati) ============

async def yangi_muammo_xabar(muammo: Muammo) -> None:
    """🔴 YANGI MUAMMO — guruhga avtopost."""
    matn = (
        "🔴 <b>YANGI MUAMMO</b>\n"
        f"📍 {_manzil(muammo)}\n"
        f"⚠️ {_turi_nomi(muammo)} (xavf: {_enum_qiymat(muammo.xavf)})\n"
        f"👤 {_xodim_fio(muammo)}\n"
        f"🕐 {_sana_vaqt(muammo.qurilma_vaqti)}\n"
        f"📅 Muddat: {_sana(muammo.muddat)}"
    )
    foto = _fotolarni_tanlash(muammo, FotoTuri.oldin)
    await _guruhga_yubor(matn, foto)


async def bartaraf_xabar(muammo: Muammo) -> None:
    """✅ BARTARAF ETILDI — oldin/keyin foto bilan guruhga avtopost."""
    matn = (
        "✅ <b>BARTARAF ETILDI</b>\n"
        f"📍 {_manzil(muammo)}\n"
        f"⚠️ {_turi_nomi(muammo)}\n"
        f"👤 {_xodim_fio(muammo)}\n"
        f"🕐 {_sana_vaqt(muammo.yopilgan_sana)}"
    )
    foto = _fotolarni_tanlash(muammo, FotoTuri.oldin, FotoTuri.keyin)
    await _guruhga_yubor(matn, foto)


async def muddati_otdi_xabar(muammo: Muammo, kechikkan_kun: Optional[int] = None) -> None:
    """🚨 MUDDATI O'TDI — necha kun kechikkanini ko'rsatib guruhga avtopost."""
    if kechikkan_kun is None:
        qolgan = muammo.muddat_qolgan_kun
        kechikkan_kun = -qolgan if qolgan is not None else 0
    matn = (
        "🚨 <b>MUDDATI O'TDI</b>\n"
        f"📍 {_manzil(muammo)}\n"
        f"⚠️ {_turi_nomi(muammo)} (xavf: {_enum_qiymat(muammo.xavf)})\n"
        f"👤 {_xodim_fio(muammo)}\n"
        f"📅 Muddat: {_sana(muammo.muddat)}\n"
        f"⏰ Kechikkan: {kechikkan_kun} kun"
    )
    foto = _fotolarni_tanlash(muammo, FotoTuri.oldin)
    await _guruhga_yubor(matn, foto)
