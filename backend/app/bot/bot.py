"""
XAVFSIZ XONADON — Telegram bot asosiy fayli.
aiogram 3.x: Bot, Dispatcher, Router, FSM, middleware.
Long-polling rejimida ishlaydi (webhook emas) — tuman FVV uchun soddaroq.
"""
import logging
import asyncio
from typing import Any

from aiogram import Bot, Dispatcher, F
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import Message, BotCommand

from app.config import settings

logger = logging.getLogger("xavfsiz_xonadon.bot")

# ============ Sessiya ============
# Har bir foydalanuvchi uchun: {"user_id": int, "rol": UserRole, "full_name": str, "lang": "uz"|"ru"}
# DIQQAT: bu yerda ORM obyekti saqlanmaydi — DB sessiyasi yopilgach u
# "detached" bo'lib qoladi va atributlari DetachedInstanceError beradi.
sessions: dict[int, dict[str, Any]] = {}

# ============ Bot va Dispatcher — bot token bo'lmasa ham dp ishlaydi ============
bot: Bot | None = None  # start_polling() ichida yaratiladi
storage = MemoryStorage()
dp = Dispatcher(storage=storage)


# ============ Bot yaratish ============

def _create_bot() -> Bot:
    return Bot(
        token=settings.TELEGRAM_BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )


# ============ Buyruqlar ro'yxati ============

async def set_commands(bot_instance: Bot):
    """Bot buyruqlarini o'rnatish."""
    await bot_instance.set_my_commands([
        BotCommand(command="start", description="Botni ishga tushirish"),
        BotCommand(command="kirish", description="Tizimga kirish"),
        BotCommand(command="chiqish", description="Tizimdan chiqish"),
        BotCommand(command="xonadonlar", description="Xonadonlar ro'yxati"),
        BotCommand(command="muammo", description="Yangi muammo qayd etish"),
        BotCommand(command="statistika", description="Statistika (admin)"),
        BotCommand(command="bloklash", description="Foydalanuvchini bloklash (admin)"),
        BotCommand(command="xabar", description="Barchaga xabar (admin)"),
        BotCommand(command="help", description="Yordam"),
        BotCommand(command="cancel", description="Amalni bekor qilish"),
    ])


# ============ Umumiy handlerlar ============

@dp.message(Command("start"))
async def cmd_start(message: Message):
    from app.bot.i18n import t
    lang = sessions.get(message.from_user.id, {}).get("lang", "uz")
    await message.answer(t("welcome", lang), reply_markup=None)
    await message.answer(
        "Iltimos tizimga kiring: /kirish" if lang == "uz" else "Пожалуйста, войдите: /kirish"
    )


@dp.message(Command("help"))
async def cmd_help(message: Message):
    from app.bot.i18n import t
    from app.models.user import UserRole

    user_id = message.from_user.id
    lang = sessions.get(user_id, {}).get("lang", "uz")
    rol = sessions.get(user_id, {}).get("rol")

    text = t("help", lang)
    if rol in (UserRole.rahbar, UserRole.superadmin):
        text += t("help_admin", lang)
    await message.answer(text)


@dp.message(Command("cancel"))
async def cmd_cancel(message: Message, state: FSMContext):
    from app.bot.i18n import t

    current_state = await state.get_state()
    user_id = message.from_user.id
    lang = sessions.get(user_id, {}).get("lang", "uz")

    if current_state is not None:
        await state.clear()
        await message.answer(t("cancel", lang))
    else:
        await message.answer(
            "Bekor qilish uchun hech qanday amal yo'q." if lang == "uz" else "Нет активных действий для отмены."
        )


@dp.message(Command("chiqish"))
@dp.message(F.text.in_(["❌ Chiqish", "❌ Выход"]))
async def cmd_logout(message: Message):
    from app.bot.i18n import t

    user_id = message.from_user.id
    lang = sessions.get(user_id, {}).get("lang", "uz")
    sessions.pop(user_id, None)
    await message.answer(t("logout_done", lang))


# ============ Routerlarni ro'yxatdan o'tkazish ============

from app.bot.handlers.auth import router as auth_router
from app.bot.handlers.admin import router as admin_router
from app.bot.handlers.xonadon import router as xonadon_router
from app.bot.handlers.muammo import router as muammo_router

dp.include_router(auth_router)
dp.include_router(admin_router)
dp.include_router(xonadon_router)
dp.include_router(muammo_router)


# ============ Polling ============

async def start_polling():
    """Botni long-polling rejimida ishga tushirish."""
    global bot

    if not settings.TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN sozlanmagan — bot ishga tushirilmayapti.")
        return

    try:
        from aiogram.utils.token import TokenValidationError
        bot = _create_bot()
    except TokenValidationError:
        logger.warning("TELEGRAM_BOT_TOKEN noto‘g‘ri formatda — bot ishga tushirilmayapti.")
        return
    except Exception as e:
        logger.warning(f"Bot yaratishda xatolik — bot ishga tushirilmayapti: {e}")
        return

    await set_commands(bot)
    logger.info("Telegram bot ishga tushmoqda (polling)...")

    # Delete webhook va pollingni boshlash
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)


async def stop_polling():
    """Botni to'xtatish."""
    global bot
    if bot is None:
        return
    logger.info("Telegram bot to'xtatilmoqda...")
    await dp.stop_polling()
    await bot.session.close()
    bot = None
