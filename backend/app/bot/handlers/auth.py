"""
XAVFSIZ XONADON — Telegram bot /kirish autentifikatsiya handlerlari.
aiogram 3.x FSM: AuthState.guvohnoma → AuthState.parol.
"""
from aiogram import Router, F
from aiogram.types import Message
from aiogram.fsm.context import FSMContext
from aiogram.filters import Command, StateFilter

from sqlalchemy import select

from app.bot.bot import sessions
from app.bot.i18n import t
from app.bot.states import AuthState
from app.bot.keyboards import main_menu, admin_menu, guest_menu
from app.core.security import verify_password
from app.database import async_session_maker
from app.models.user import User, UserRole, UserStatus

router = Router()


def _lang(user_id: int) -> str:
    return sessions.get(user_id, {}).get("lang", "uz")


# ============ /kirish ============

@router.message(Command("kirish"))
async def cmd_kirish(message: Message, state: FSMContext):
    user_id = message.from_user.id
    lang = _lang(user_id)

    session = sessions.get(user_id, {})
    if session.get("user_id") is not None:
        is_admin = session.get("rol") in (UserRole.rahbar, UserRole.superadmin)
        await message.answer(
            t("already_authenticated", lang, full_name=session.get("full_name", "")),
            reply_markup=admin_menu(lang) if is_admin else main_menu(lang),
        )
        return

    await state.set_state(AuthState.guvohnoma)
    await message.answer(t("auth_prompt_guvohnoma", lang), reply_markup=guest_menu(lang))


# Kirish tugmasi orqali
@router.message(F.text.in_(["🔑 Kirish", "🔑 Войти"]))
async def btn_kirish(message: Message, state: FSMContext):
    user_id = message.from_user.id
    lang = _lang(user_id)

    if sessions.get(user_id, {}).get("user_id") is not None:
        session = sessions[user_id]
        is_admin = session.get("rol") in (UserRole.rahbar, UserRole.superadmin)
        await message.answer(
            t("already_authenticated", lang, full_name=session.get("full_name", "")),
            reply_markup=admin_menu(lang) if is_admin else main_menu(lang),
        )
        return

    await state.set_state(AuthState.guvohnoma)
    await message.answer(t("auth_prompt_guvohnoma", lang))


# ============ Guvohnoma raqami ============

@router.message(StateFilter(AuthState.guvohnoma), F.text)
async def process_guvohnoma(message: Message, state: FSMContext):
    lang = _lang(message.from_user.id)
    guvohnoma = message.text.strip().upper()

    if len(guvohnoma) < 2:
        await message.answer(t("auth_prompt_guvohnoma", lang))
        return

    await state.update_data(guvohnoma=guvohnoma)
    await state.set_state(AuthState.parol)

    # Parol yashirin — yulduzchalar uchun yozilgan xabarni o'chirish
    await message.answer(t("auth_prompt_parol", lang))
    try:
        await message.delete()
    except Exception:
        pass


# ============ Parol ============

@router.message(StateFilter(AuthState.parol), F.text)
async def process_parol(message: Message, state: FSMContext):
    user_id = message.from_user.id
    lang = _lang(user_id)
    parol = message.text.strip()

    data = await state.get_data()
    guvohnoma = data.get("guvohnoma", "")

    # Parolni yashirish
    try:
        await message.delete()
    except Exception:
        pass

    async with async_session_maker() as db:
        result = await db.execute(
            select(User).where(User.guvohnoma_raqami == guvohnoma)
        )
        user = result.scalar_one_or_none()

        if not user or not verify_password(parol, user.parol_hash):
            await message.answer(t("auth_wrong", lang))
            await state.clear()
            return

        if user.holat == UserStatus.bloklangan:
            await message.answer(t("auth_blocked", lang))
            await state.clear()
            return

        if user.holat == UserStatus.kutilmoqda:
            await message.answer(t("auth_pending", lang))
            await state.clear()
            return

        # Muvaffaqiyatli kirish — sessiyani saqlash.
        # DIQQAT: sessiyada faqat oddiy qiymatlar saqlanadi — DB sessiyasi
        # yopilgach ORM obyekti "detached" bo'lib, atributlari ishlamaydi.
        sessions[user_id] = {
            "user_id": user.id,
            "rol": user.rol,
            "full_name": user.full_name,
            "lang": "uz",
        }

        # Telegram chat_id ni saqlash (commit shart — aks holda rollback bo'ladi)
        if user.telegram_chat_id != user_id:
            user.telegram_chat_id = user_id
            await db.commit()

        is_admin = user.rol in (UserRole.rahbar, UserRole.superadmin)
        keyboard = admin_menu(lang) if is_admin else main_menu(lang)

        await message.answer(
            t("auth_success", lang, full_name=user.full_name, rol=str(user.rol)),
            reply_markup=keyboard,
        )

    await state.clear()
