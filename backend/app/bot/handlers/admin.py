"""
XAVFSIZ XONADON — Admin buyruqlar handleri
/statistika, /bloklash, /xabar — faqat rahbar va superadmin uchun.
"""

import asyncio
import html
import logging
from datetime import datetime, timedelta

from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message
from sqlalchemy import select, func, update

from app.bot.bot import bot, sessions
from app.bot.i18n import t

# Broadcast uchun: bir vaqtda ko'pi bilan 30 ta xabar yuborish
_BROADCAST_SEMAPHORE = asyncio.Semaphore(30)
from app.database import async_session_maker
from app.models.user import User, UserRole, UserStatus
from app.models.hudud import Xonadon
from app.models.muammo import Muammo
from app.models.lokatsiya import LokatsiyaLog

logger = logging.getLogger(__name__)
router = Router()


# =============================================================================
# Yordamchi funksiyalar
# =============================================================================

def _get_lang(user_id: int) -> str:
    """Foydalanuvchining tilini qaytaradi (default 'uz')."""
    session = sessions.get(user_id)
    if session is None:
        return "uz"
    return session.get("lang", "uz")


async def is_admin(user_id: int) -> bool:
    """Foydalanuvchi rahbar yoki superadmin ekanligini tekshiradi."""
    session = sessions.get(user_id)
    if session is None:
        return False
    return session.get("rol") in (UserRole.rahbar, UserRole.superadmin)


def _admin_lang(user_id: int) -> str:
    """Adminning tilini qaytaradi (sessiyadan)."""
    return _get_lang(user_id)


async def _reply_no_permission(message: Message, user_id: int) -> None:
    """Ruxsat yo'qligi haqida xabar yuborish."""
    lang = _admin_lang(user_id)
    await message.answer(t("no_permission", lang))


# =============================================================================
# 1. /statistika — Umumiy statistika
# =============================================================================

@router.message(Command("statistika"))
@router.message(F.text == "📊 Statistika")
async def cmd_statistika(message: Message) -> None:
    """Bot statistikasini ko'rsatish: xonadonlar, ochiq muammolar, xodimlar."""
    user_id = message.from_user.id
    if not await is_admin(user_id):
        await _reply_no_permission(message, user_id)
        return

    lang = _admin_lang(user_id)
    now = datetime.now()

    try:
        async with async_session_maker() as db:
            # 1. Jami xonadonlar
            result = await db.execute(select(func.count(Xonadon.id)))
            total_xonadonlar = result.scalar() or 0

            # 2. Ochiq muammolar
            result = await db.execute(
                select(func.count(Muammo.id)).where(Muammo.status == "ochiq")
            )
            total_ochiq_muammo = result.scalar() or 0

            # 3. Jami xodimlar (xodim roliga ega faol foydalanuvchilar)
            result = await db.execute(
                select(func.count(User.id)).where(
                    User.rol == UserRole.xodim,
                    User.holat == UserStatus.faol,
                )
            )
            total_xodimlar = result.scalar() or 0

            # 4. Faol xodimlar — so'nggi 15 daqiqada lokatsiya yozganlar
            cutoff = now - timedelta(minutes=15)
            subq = (
                select(LokatsiyaLog.xodim_id)
                .where(LokatsiyaLog.qabul_vaqti >= cutoff)
                .distinct()
                .subquery()
            )
            result = await db.execute(select(func.count()).select_from(subq))
            total_faol_xodim = result.scalar() or 0

    except Exception as e:
        logger.error("Statistika olishda xatolik: %s", e)
        error_msg = (
            f"❌ Statistikani olishda xatolik: {html.escape(str(e))}"
            if lang == "uz"
            else f"❌ Ошибка получения статистики: {html.escape(str(e))}"
        )
        await message.answer(error_msg)
        return

    # Formatlash
    time_str = now.strftime("%d.%m.%Y %H:%M")
    text = t("statistika_title", lang)
    text += t(
        "statistika_line", lang,
        label="🏠 Jami xonadonlar" if lang == "uz" else "🏠 Всего домов",
        value=total_xonadonlar,
    )
    text += t(
        "statistika_line", lang,
        label="⚠️ Ochiq muammolar" if lang == "uz" else "⚠️ Открытые проблемы",
        value=total_ochiq_muammo,
    )
    text += t(
        "statistika_line", lang,
        label="👥 Xodimlar" if lang == "uz" else "👥 Сотрудники",
        value=total_xodimlar,
    )
    text += t(
        "statistika_line", lang,
        label="🟢 Faol xodimlar" if lang == "uz" else "🟢 Активные сотрудники",
        value=total_faol_xodim,
    )
    text += t("statistika_bottom", lang, time=time_str)

    await message.answer(text)


# =============================================================================
# 2. /bloklash {id} — Foydalanuvchini bloklash
# =============================================================================

@router.message(Command("bloklash"))
@router.message(F.text == "🚫 Bloklash")
async def cmd_bloklash(message: Message) -> None:
    """Foydalanuvchini bloklash. /bloklash {id} yoki matn bilan ko'rsatma."""
    user_id = message.from_user.id
    if not await is_admin(user_id):
        await _reply_no_permission(message, user_id)
        return

    lang = _admin_lang(user_id)

    # Agar buyruq argument bilan kelgan bo'lsa: /bloklash 42
    if message.text and message.text.startswith("/bloklash"):
        parts = message.text.strip().split(maxsplit=1)
        if len(parts) < 2:
            await message.answer(
                "❌ Iltimos, bloklash uchun foydalanuvchi ID sini kiriting.\n"
                "Namuna: /bloklash 42"
                if lang == "uz"
                else "❌ Пожалуйста, введите ID пользователя для блокировки.\n"
                "Пример: /bloklash 42"
            )
            return

        target_id_str = parts[1].strip()
        if not target_id_str.isdigit():
            await message.answer(
                "❌ Noto'g'ri ID formati. Faqat raqam kiriting."
                if lang == "uz"
                else "❌ Неверный формат ID. Введите только число."
            )
            return

        target_id = int(target_id_str)
        try:
            async with async_session_maker() as db:
                result = await db.execute(select(User).where(User.id == target_id))
                user = result.scalar_one_or_none()

                if user is None:
                    await message.answer(
                        t("bloklash_error", lang, error=f"Foydalanuvchi #{target_id} topilmadi")
                        if lang == "uz"
                        else t("bloklash_error", lang, error=f"Пользователь #{target_id} не найден")
                    )
                    return

                if user.holat == UserStatus.bloklangan:
                    await message.answer(
                        f"⚠️ Foydalanuvchi #{target_id} allaqachon bloklangan."
                        if lang == "uz"
                        else f"⚠️ Пользователь #{target_id} уже заблокирован."
                    )
                    return

                # Bloklash
                stmt = (
                    update(User)
                    .where(User.id == target_id)
                    .values(holat=UserStatus.bloklangan)
                )
                await db.execute(stmt)
                await db.commit()

            await message.answer(t("bloklash_success", lang, user_id=target_id))

        except Exception as e:
            logger.error("Bloklashda xatolik (user_id=%d): %s", target_id, e)
            await message.answer(t("bloklash_error", lang, error=html.escape(str(e))))

    else:
        # Tugma orqali kelgan bo'lsa — ko'rsatma berish
        await message.answer(
            "Iltimos, bloklash uchun foydalanuvchi ID sini yuboring:\n"
            "Namuna: Bloklash 42"
            if lang == "uz"
            else "Пожалуйста, отправьте ID пользователя для блокировки:\n"
            "Пример: Блок 42"
        )


# =============================================================================
# 3. /xabar {text} — Barcha foydalanuvchilarga xabar yuborish
# =============================================================================

@router.message(Command("xabar"))
@router.message(F.text == "📢 Xabar")
async def cmd_xabar(message: Message) -> None:
    """Barcha foydalanuvchilarga xabar yuborish. /xabar {text}."""
    user_id = message.from_user.id
    if not await is_admin(user_id):
        await _reply_no_permission(message, user_id)
        return

    lang = _admin_lang(user_id)

    # Agar buyruq argument bilan kelgan bo'lsa: /xabar Yangi buyruq...
    if message.text and message.text.startswith("/xabar"):
        parts = message.text.strip().split(maxsplit=1)
        if len(parts) < 2 or not parts[1].strip():
            await message.answer(
                "❌ Iltimos, xabar matnini kiriting.\n"
                "Namuna: /xabar Yangi topshiriq!"
                if lang == "uz"
                else "❌ Пожалуйста, введите текст сообщения.\n"
                "Пример: /xabar Новое задание!"
            )
            return

        xabar_text = parts[1].strip()

        try:
            # Barcha telegram_chat_id ga ega foydalanuvchilarni olish
            async with async_session_maker() as db:
                result = await db.execute(
                    select(User.telegram_chat_id)
                    .where(
                        User.telegram_chat_id.isnot(None),
                        User.holat == UserStatus.faol,
                    )
                )
                chat_ids = [row[0] for row in result.fetchall()]

            if not chat_ids:
                await message.answer(
                    "❌ Xabar yuborish uchun foydalanuvchi topilmadi."
                    if lang == "uz"
                    else "❌ Пользователи для рассылки не найдены."
                )
                return

            # Bot mavjudligini tekshirish (lazy-init)
            _bot = bot
            if _bot is None:
                await message.answer(
                    "❌ Bot hali ishga tushmagan. Keyinroq urinib ko'ring."
                    if lang == "uz"
                    else "❌ Бот еще не запущен. Попробуйте позже."
                )
                return

            # Xabarni barchaga yuborish (asyncio.gather + semaphore)
            # html.escape — xabar matnida '<' kabi belgilar HTML parse xatosiga olib kelmasligi uchun
            msg_text = (
                f"📢 <b>Xabar</b>\n\n{html.escape(xabar_text)}"
                if lang == "uz"
                else f"📢 <b>Сообщение</b>\n\n{html.escape(xabar_text)}"
            )
            sent_count = 0
            failed_count = 0
            lock = asyncio.Lock()

            async def _send_one(chat_id: int):
                nonlocal sent_count, failed_count
                async with _BROADCAST_SEMAPHORE:
                    try:
                        await _bot.send_message(chat_id=chat_id, text=msg_text)
                        async with lock:
                            sent_count += 1
                    except Exception as e:
                        logger.warning(
                            "Xabar yuborishda xatolik (chat_id=%s): %s", chat_id, e
                        )
                        async with lock:
                            failed_count += 1

            await asyncio.gather(*(_send_one(cid) for cid in chat_ids))

            # Natija
            result_text = t("xabar_sent", lang, count=sent_count)
            if failed_count:
                result_text += (
                    f"\n⚠️ {failed_count} ta yuborilmadi."
                    if lang == "uz"
                    else f"\n⚠️ {failed_count} не отправлено."
                )
            await message.answer(result_text)

        except Exception as e:
            logger.error("Xabar yuborishda xatolik: %s", e)
            await message.answer(t("xabar_error", lang, error=html.escape(str(e))))

    else:
        # Tugma orqali kelgan bo'lsa — ko'rsatma berish
        await message.answer(
            "Iltimos, yubormoqchi bo'lgan xabaringizni yozing:\n"
            "Namuna: Xabar Bugun soat 18:00 da yig'ilish!"
            if lang == "uz"
            else "Пожалуйста, напишите текст сообщения для рассылки:\n"
            "Пример: Рассылка Сегодня в 18:00 собрание!"
        )
