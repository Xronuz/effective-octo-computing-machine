"""
XAVFSIZ XONADON — Telegram bot /xonadonlar handlerlari.
Ro'yxat, tafsilot, sahifalash.
"""
import html
import logging
from aiogram import Router, F
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.filters import Command
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.bot.bot import sessions
from app.bot.i18n import t
from app.bot.keyboards import main_menu, admin_menu
from app.database import async_session_maker
from app.services.xonadon import list_xonadonlar, get_xonadon
from app.models.user import UserRole

logger = logging.getLogger(__name__)
router = Router()


def _lang(user_id: int) -> str:
    return sessions.get(user_id, {}).get("lang", "uz")


def _is_authed(user_id: int) -> bool:
    return sessions.get(user_id, {}).get("user_id") is not None


def _is_admin(user_id: int) -> bool:
    return sessions.get(user_id, {}).get("rol") in (UserRole.rahbar, UserRole.superadmin)


def _keyboard(user_id: int, lang: str):
    return admin_menu(lang) if _is_admin(user_id) else main_menu(lang)


# ============ /xonadonlar ============

@router.message(Command("xonadonlar"))
@router.message(F.text.in_(["🏠 Xonadonlar", "🏠 Дома"]))
async def cmd_xonadonlar(message: Message):
    user_id = message.from_user.id
    lang = _lang(user_id)

    if not _is_authed(user_id):
        await message.answer(t("not_authenticated", lang))
        return

    await _show_page(message, page=1, lang=lang)


async def _fetch_page(db, page: int):
    """Sahifa ma'lumotlarini oddiy qiymatlar (tuple) ko'rinishida qaytaradi.

    ORM obyektlari sessiya yopilgach ishlamaydi (DetachedInstanceError),
    shuning uchun barcha kerakli qiymatlar sessiya ICHIDA olinadi.
    """
    items, total = await list_xonadonlar(db, page=page, size=5)
    rows = [
        (
            x.id,
            x.full_address,
            sum(1 for m in (x.muammolar or []) if m.status.value in ("ochiq", "jarayonda")),
        )
        for x in items
    ]
    return rows, total


async def _show_page(message: Message, page: int, lang: str):
    """Xonadonlar ro'yxatini sahifalab ko'rsatish."""
    try:
        async with async_session_maker() as db:
            rows, total = await _fetch_page(db, page)

        if not rows:
            await message.answer(t("xonadonlar_empty", lang))
            return

        from math import ceil
        total_pages = max(1, ceil(total / 5))

        text_lines = [t("xonadonlar_title", lang, page=page, pages=total_pages, total=total)]
        for x_id, manzil, ochiq_soni in rows:
            text_lines.append(
                f"\n🏠 <b>{manzil}</b>\n"
                f"  ├ Ochilgan muammolar: <b>{ochiq_soni}</b>\n"
                f"  └ ID: {x_id}"
            )

        text = "\n".join(text_lines)

        # Inline tugmalar: har bir xonadon uchun + sahifalash
        builder = InlineKeyboardBuilder()
        for x_id, manzil, _ in rows:
            btn_text = f"📋 {manzil[:30]}..." if len(manzil) > 30 else f"📋 {manzil}"
            builder.button(text=btn_text, callback_data=f"xonadon:{x_id}")

        builder.adjust(1)

        # Sahifalash qatori
        row = []
        if page > 1:
            row.append(InlineKeyboardButton(text="⬅️", callback_data=f"xonadon_page:{page - 1}"))
        row.append(InlineKeyboardButton(text=f"{page}/{total_pages}", callback_data="noop"))
        if page < total_pages:
            row.append(InlineKeyboardButton(text="➡️", callback_data=f"xonadon_page:{page + 1}"))
        builder.row(*row)

        await message.answer(text, reply_markup=builder.as_markup())

    except Exception as e:
        logger.error("Xonadonlar ro'yxatida xatolik: %s", e)
        await message.answer(
            f"❌ Xatolik: {html.escape(str(e))}" if lang == "uz"
            else f"❌ Ошибка: {html.escape(str(e))}"
        )


# ============ Xonadon tafsiloti ============

@router.callback_query(F.data.startswith("xonadon:"))
async def cb_xonadon_detail(callback: CallbackQuery):
    user_id = callback.from_user.id
    lang = _lang(user_id)

    if not _is_authed(user_id):
        await callback.answer(t("not_authenticated", lang), show_alert=True)
        return

    try:
        xonadon_id = int(callback.data.split(":")[1])
    except (IndexError, ValueError):
        await callback.answer("Noto'g'ri ID", show_alert=True)
        return

    try:
        async with async_session_maker() as db:
            xonadon = await get_xonadon(db, xonadon_id)

            # Barcha qiymatlar sessiya ICHIDA olinadi — sessiya yopilgach
            # ORM obyekti atributlari ishlamaydi (DetachedInstanceError)
            kocha = xonadon.kocha
            mfy = kocha.mfy if kocha else None
            detail = {
                "address": xonadon.full_address,
                "mfy": mfy.nomi if mfy else "—",
                "street": kocha.nomi if kocha else "—",
                "owner": xonadon.egasi_fio or "—",
                "phone": xonadon.egasi_tel or "—",
                "problems": sum(
                    1 for m in (xonadon.muammolar or [])
                    if m.status.value in ("ochiq", "jarayonda")
                ),
            }

        text = t("xonadon_detail", lang, **detail)

        # Muammolar ro'yxatiga havola
        builder = InlineKeyboardBuilder()
        builder.button(
            text="⚠️ Muammolar" if lang == "uz" else "⚠️ Проблемы",
            callback_data=f"muammolar_xonadon:{xonadon_id}"
        )
        builder.button(text="🔙 Orqaga" if lang == "uz" else "🔙 Назад", callback_data="xonadon_page:1")
        builder.adjust(2)

        await callback.message.edit_text(text, reply_markup=builder.as_markup())
        await callback.answer()

    except Exception as e:
        logger.error("Xonadon tafsilotida xatolik: %s", e)
        await callback.answer(
            f"Xatolik: {e}" if lang == "uz" else f"Ошибка: {e}",
            show_alert=True,
        )


# ============ Sahifalash callback ============

@router.callback_query(F.data.startswith("xonadon_page:"))
async def cb_xonadon_page(callback: CallbackQuery):
    user_id = callback.from_user.id
    lang = _lang(user_id)

    if not _is_authed(user_id):
        await callback.answer(t("not_authenticated", lang), show_alert=True)
        return

    try:
        page = int(callback.data.split(":")[1])
    except (IndexError, ValueError):
        await callback.answer("Noto'g'ri sahifa", show_alert=True)
        return

    try:
        async with async_session_maker() as db:
            rows, total = await _fetch_page(db, page)

        if not rows:
            await callback.message.edit_text(t("xonadonlar_empty", lang))
            await callback.answer()
            return

        from math import ceil
        total_pages = max(1, ceil(total / 5))

        text_lines = [t("xonadonlar_title", lang, page=page, pages=total_pages, total=total)]
        for x_id, manzil, ochiq_soni in rows:
            text_lines.append(
                f"\n🏠 <b>{manzil}</b>\n"
                f"  ├ Ochilgan muammolar: <b>{ochiq_soni}</b>\n"
                f"  └ ID: {x_id}"
            )

        text = "\n".join(text_lines)

        builder = InlineKeyboardBuilder()
        for x_id, manzil, _ in rows:
            btn_text = f"📋 {manzil[:30]}..." if len(manzil) > 30 else f"📋 {manzil}"
            builder.button(text=btn_text, callback_data=f"xonadon:{x_id}")

        builder.adjust(1)

        row = []
        if page > 1:
            row.append(InlineKeyboardButton(text="⬅️", callback_data=f"xonadon_page:{page - 1}"))
        row.append(InlineKeyboardButton(text=f"{page}/{total_pages}", callback_data="noop"))
        if page < total_pages:
            row.append(InlineKeyboardButton(text="➡️", callback_data=f"xonadon_page:{page + 1}"))
        builder.row(*row)

        await callback.message.edit_text(text, reply_markup=builder.as_markup())
        await callback.answer()

    except Exception as e:
        logger.error("Xonadon sahifalashda xatolik: %s", e)
        await callback.answer(
            f"Xatolik: {e}" if lang == "uz" else f"Ошибка: {e}",
            show_alert=True,
        )


# ============ noop ============

@router.callback_query(F.data == "noop")
async def cb_noop(callback: CallbackQuery):
    await callback.answer()
