"""
XAVFSIZ XONADON — Telegram bot /muammo handleri.
FSM orqali muammo yaratish: xonadon → turi → tavsif → xavf → foto → gps → tasdiqlash.
"""
import html
import logging
import uuid
from datetime import date, datetime, timedelta, timezone

from aiogram import Router, F
from aiogram.types import Message, CallbackQuery, ReplyKeyboardRemove
from aiogram.filters import Command, StateFilter
from aiogram.fsm.context import FSMContext

from app.bot.bot import sessions
from app.bot.i18n import t
from app.bot.states import MuammoState
from app.bot.keyboards import (
    muammo_turi_keyboard,
    xavf_daraja_keyboard,
    tasdiqlash_keyboard,
    main_menu,
    admin_menu,
)
from app.core.exceptions import NotFoundException
from app.database import async_session_maker
from app.services.muammo import create_muammo
from app.services.xonadon import get_xonadon
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)
router = Router()

# Bot orqali yaratilgan muammolar uchun standart bartaraf etish muddati (kun)
BOT_MUAMMO_MUDDAT_KUN = 7


def _lang(user_id: int) -> str:
    return sessions.get(user_id, {}).get("lang", "uz")


def _is_authed(user_id: int) -> bool:
    return sessions.get(user_id, {}).get("user_id") is not None


def _is_admin(user_id: int) -> bool:
    return sessions.get(user_id, {}).get("rol") in (UserRole.rahbar, UserRole.superadmin)


def _keyboard(user_id: int, lang: str):
    return admin_menu(lang) if _is_admin(user_id) else main_menu(lang)


# ============ /muammo — Oqimni boshlash ============

@router.message(Command("muammo"))
@router.message(F.text.in_(["⚠️ Muammo", "⚠️ Проблема"]))
async def cmd_muammo(message: Message, state: FSMContext):
    user_id = message.from_user.id
    lang = _lang(user_id)

    if not _is_authed(user_id):
        await message.answer(t("not_authenticated", lang))
        return

    await state.set_state(MuammoState.xonadon)
    await message.answer(
        t("muammo_title", lang) + "\n\n" +
        ("Xonadon ID raqamini kiriting:" if lang == "uz" else "Введите ID дома:"),
        reply_markup=ReplyKeyboardRemove(),
    )


# ============ 1. Xonadon ID ============

@router.message(StateFilter(MuammoState.xonadon), F.text)
async def step_xonadon(message: Message, state: FSMContext):
    user_id = message.from_user.id
    lang = _lang(user_id)

    text = message.text.strip()
    if not text.isdigit():
        await message.answer(
            "❌ Iltimos, raqam kiriting." if lang == "uz" else "❌ Пожалуйста, введите число."
        )
        return

    xonadon_id = int(text)

    try:
        async with async_session_maker() as db:
            try:
                xonadon = await get_xonadon(db, xonadon_id)
            except NotFoundException:
                manzil = None
            else:
                # full_address sessiya ICHIDA olinadi — sessiya yopilgach
                # munosabatlar (kocha/mfy) yuklab bo'lmaydi (DetachedInstanceError)
                manzil = xonadon.full_address

        if manzil is None:
            await message.answer(
                f"❌ Xonadon #{xonadon_id} topilmadi. Qayta kiriting:" if lang == "uz"
                else f"❌ Дом #{xonadon_id} не найден. Введите снова:"
            )
            return

        await state.update_data(xonadon_id=xonadon_id)
        await state.set_state(MuammoState.turi)

        await message.answer(
            f"✅ <b>{manzil}</b>\n\n{t('muammo_turi', lang)}",
            reply_markup=muammo_turi_keyboard(lang),
        )

    except Exception as e:
        logger.error("Xonadon qidirishda xatolik: %s", e)
        await message.answer(
            "❌ Xatolik yuz berdi. Qayta urinib ko'ring." if lang == "uz"
            else "❌ Произошла ошибка. Попробуйте снова."
        )


# ============ 2. Muammo turi (callback) ============

@router.callback_query(F.data.startswith("muammo_turi:"), StateFilter(MuammoState.turi))
async def step_turi(callback: CallbackQuery, state: FSMContext):
    user_id = callback.from_user.id
    lang = _lang(user_id)

    turi = callback.data.split(":", 1)[1]

    await state.update_data(turi=turi)
    await state.set_state(MuammoState.tavsif)

    await callback.message.edit_text(t("muammo_tavsif", lang))
    await callback.answer()


# ============ 3. Tavsif ============

@router.message(StateFilter(MuammoState.tavsif), F.text)
async def step_tavsif(message: Message, state: FSMContext):
    user_id = message.from_user.id
    lang = _lang(user_id)

    text = message.text.strip()

    if text.startswith("/skip") or text.lower() in ("skip", "o'tkazish", "пропустить"):
        await state.update_data(tavsif=None)
    else:
        await state.update_data(tavsif=text)

    await state.set_state(MuammoState.xavf)
    await message.answer(t("muammo_xavf", lang), reply_markup=xavf_daraja_keyboard(lang))


# ============ 4. Xavf darajasi (callback) ============

@router.callback_query(F.data.startswith("xavf:"), StateFilter(MuammoState.xavf))
async def step_xavf(callback: CallbackQuery, state: FSMContext):
    user_id = callback.from_user.id
    lang = _lang(user_id)

    xavf = callback.data.split(":", 1)[1]
    await state.update_data(xavf=xavf)
    await state.set_state(MuammoState.foto)

    await callback.message.edit_text(t("muammo_foto", lang))
    await callback.answer()


# ============ 5. Foto ============

@router.message(StateFilter(MuammoState.foto), F.photo)
async def step_foto(message: Message, state: FSMContext):
    user_id = message.from_user.id
    lang = _lang(user_id)

    # Eng katta fotonani olish
    photo = message.photo[-1]
    file_id = photo.file_id

    data = await state.get_data()
    fotos = data.get("fotos", [])
    fotos.append(file_id)
    await state.update_data(fotos=fotos)

    await state.set_state(MuammoState.gps)
    await message.answer(t("muammo_gps", lang))


@router.message(StateFilter(MuammoState.foto), Command("skip"))
@router.message(StateFilter(MuammoState.foto), F.text.in_(["⏭️ O'tkazish", "⏭️ Пропустить"]))
async def step_foto_skip(message: Message, state: FSMContext):
    lang = _lang(message.from_user.id)
    await state.set_state(MuammoState.gps)
    await message.answer(t("muammo_gps", lang))


@router.message(StateFilter(MuammoState.foto))
async def step_foto_fallback(message: Message, state: FSMContext):
    """Foto holatida kutilmagan xabar — qayta so'raymiz (holat o'zgarmaydi)."""
    lang = _lang(message.from_user.id)
    await message.answer(t("muammo_foto", lang))


# ============ 6. GPS ============

@router.message(StateFilter(MuammoState.gps), F.location)
async def step_gps(message: Message, state: FSMContext):
    user_id = message.from_user.id
    lang = _lang(user_id)

    loc = message.location
    await state.update_data(lat=loc.latitude, lng=loc.longitude, gps_aniqlik=getattr(loc, 'horizontal_accuracy', None))

    await state.set_state(MuammoState.tasdiqlash)
    await _show_tasdiqlash(message, state, lang)


@router.message(StateFilter(MuammoState.gps))
async def step_gps_fallback(message: Message, state: FSMContext):
    """GPS holatida kutilmagan xabar — qayta so'raymiz (holat o'zgarmaydi)."""
    lang = _lang(message.from_user.id)
    await message.answer(t("muammo_gps", lang))


# ============ 7. Tasdiqlash ============

async def _show_tasdiqlash(message: Message, state: FSMContext, lang: str):
    """Yakuniy tasdiqlash ekrani."""
    data = await state.get_data()

    xonadon_id = data.get("xonadon_id")
    turi = data.get("turi")
    tavsif = html.escape(data.get("tavsif") or "—")
    xavf = data.get("xavf", "orta")
    foto_count = len(data.get("fotos", []))

    summary = (
        f"📋 <b>Tasdiqlash</b>\n\n"
        f"🏠 Xonadon: <b>#{xonadon_id}</b>\n"
        f"📌 Turi: <b>{turi}</b>\n"
        f"📝 Tavsif: <b>{tavsif}</b>\n"
        f"⚡ Xavf: <b>{xavf}</b>\n"
        f"📸 Fotosuratlar: <b>{foto_count} ta</b>\n"
        f"📍 GPS: <b>{data.get('lat'):.6f}, {data.get('lng'):.6f}</b>\n\n"
        + ("Ma'lumotlarni saqlashni tasdiqlaysizmi?" if lang == "uz" else "Подтверждаете сохранение?")
    )

    await message.answer(summary, reply_markup=tasdiqlash_keyboard(lang))


@router.callback_query(F.data.startswith("tasdiqlash:"), StateFilter(MuammoState.tasdiqlash))
async def step_tasdiqlash(callback: CallbackQuery, state: FSMContext):
    user_id = callback.from_user.id
    lang = _lang(user_id)
    choice = callback.data.split(":", 1)[1]

    if choice == "yoq":
        await state.clear()
        await callback.message.edit_text(
            "🚫 Bekor qilindi." if lang == "uz" else "🚫 Отменено."
        )
        await callback.message.answer(
            t("menu_main", lang) if lang == "uz" else "📋 Главное меню",
            reply_markup=_keyboard(user_id, lang)
        )
        await callback.answer()
        return

    # choice == "ha" — yaratish
    data = await state.get_data()
    xodim_id = sessions.get(user_id, {}).get("user_id")

    if xodim_id is None:
        await callback.message.edit_text(t("not_authenticated", lang))
        await state.clear()
        await callback.answer()
        return

    try:
        async with async_session_maker() as db:
            # Xodimni JORIY sessiyada qayta yuklaymiz — sessions'da saqlangan
            # ID orqali (detached ORM obyektini uzatib bo'lmaydi).
            # User munosabatlari lazy="selectin" — xodim_mfylar eager yuklanadi.
            xodim = await db.get(User, xodim_id)
            if xodim is None:
                await callback.message.edit_text(t("not_authenticated", lang))
                await state.clear()
                await callback.answer()
                return

            muammo, _dublikat = await create_muammo(
                db,
                xodim,
                xonadon_id=data["xonadon_id"],
                turi=data["turi"],
                tavsif=data.get("tavsif"),
                xavf=data.get("xavf", "orta"),
                lat=data.get("lat", 0),
                lng=data.get("lng", 0),
                gps_aniqlik=data.get("gps_aniqlik"),
                mock_gps=False,
                client_uuid=uuid.uuid4(),
                qurilma_vaqti=datetime.now(timezone.utc),
                muddat=date.today() + timedelta(days=BOT_MUAMMO_MUDDAT_KUN),
            )
            # commit shart — aks holda sessiya yopilishida rollback bo'ladi
            await db.commit()

            # Kerakli qiymatlarni sessiya yopilishidan OLDIN olamiz
            muammo_id = muammo.id
            turi_nomi = muammo.turi_nomi

        await callback.message.edit_text(
            t("muammo_created", lang, id=muammo_id,
              turi_nomi=turi_nomi,
              manzil=f"Xonadon #{data['xonadon_id']}")
        )

        await callback.message.answer(
            t("menu_main", lang) if lang == "uz" else "📋 Главное меню",
            reply_markup=_keyboard(user_id, lang)
        )

    except Exception as e:
        logger.error("Muammo yaratishda xatolik: %s", e)
        await callback.message.edit_text(
            t("muammo_error", lang, error=html.escape(str(e)))
        )

    await state.clear()
    await callback.answer()
