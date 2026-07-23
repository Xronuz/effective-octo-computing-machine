"""
XAVFSIZ XONADON — Telegram bot klaviaturalari.
ReplyKeyboard (doimiy) va InlineKeyboard (kontekst).
"""
from aiogram.types import (
    ReplyKeyboardMarkup,
    KeyboardButton,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
)
from aiogram.utils.keyboard import ReplyKeyboardBuilder, InlineKeyboardBuilder


# ============ Reply klaviaturalar (doimiy) ============

def main_menu(lang: str = "uz") -> ReplyKeyboardMarkup:
    """Asosiy menyu — barcha autentifikatsiyadan o'tgan foydalanuvchilar uchun."""
    builder = ReplyKeyboardBuilder()
    if lang == "ru":
        builder.row(
            KeyboardButton(text="🏠 Дома"),
            KeyboardButton(text="⚠️ Проблема"),
        )
        builder.row(
            KeyboardButton(text="👤 Профиль"),
            KeyboardButton(text="❌ Выход"),
        )
    else:
        builder.row(
            KeyboardButton(text="🏠 Xonadonlar"),
            KeyboardButton(text="⚠️ Muammo"),
        )
        builder.row(
            KeyboardButton(text="👤 Profil"),
            KeyboardButton(text="❌ Chiqish"),
        )
    builder.adjust(2)
    return builder.as_markup(resize_keyboard=True)


def admin_menu(lang: str = "uz") -> ReplyKeyboardMarkup:
    """Admin menyusi — rahbar/superadmin uchun."""
    builder = ReplyKeyboardBuilder()
    if lang == "ru":
        builder.row(
            KeyboardButton(text="📊 Статистика"),
            KeyboardButton(text="🚫 Блок"),
        )
        builder.row(
            KeyboardButton(text="📢 Рассылка"),
            KeyboardButton(text="🏠 Дома"),
        )
        builder.row(
            KeyboardButton(text="⚠️ Проблема"),
            KeyboardButton(text="❌ Выход"),
        )
    else:
        builder.row(
            KeyboardButton(text="📊 Statistika"),
            KeyboardButton(text="🚫 Bloklash"),
        )
        builder.row(
            KeyboardButton(text="📢 Xabar"),
            KeyboardButton(text="🏠 Xonadonlar"),
        )
        builder.row(
            KeyboardButton(text="⚠️ Muammo"),
            KeyboardButton(text="❌ Chiqish"),
        )
    builder.adjust(2)
    return builder.as_markup(resize_keyboard=True)


def guest_menu(lang: str = "uz") -> ReplyKeyboardMarkup:
    """Mehmon menyusi — autentifikatsiyadan o'tmaganlar uchun."""
    builder = ReplyKeyboardBuilder()
    if lang == "ru":
        builder.button(text="🔑 Войти")
        builder.button(text="🌐 Язык")
    else:
        builder.button(text="🔑 Kirish")
        builder.button(text="🌐 Til")
    builder.adjust(2)
    return builder.as_markup(resize_keyboard=True)


# ============ Inline klaviaturalar (kontekst) ============

def muammo_turi_keyboard(lang: str = "uz") -> InlineKeyboardMarkup:
    """Muammo turini tanlash."""
    builder = InlineKeyboardBuilder()
    items = [
        ("muammo_turi_ochiq_elektr_simi", "ochiq_elektr_simi"),
        ("muammo_turi_elektr_shchit_nosoz", "elektr_shchit_nosoz"),
        ("muammo_turi_gaz_shlangi_nosoz", "gaz_shlangi_nosoz"),
        ("muammo_turi_gaz_hidi", "gaz_hidi"),
        ("muammo_turi_isitish_uskunasi", "isitish_uskunasi"),
        ("muammo_turi_mo_ri_tozalanmagan", "mo_ri_tozalanmagan"),
        ("muammo_turi_ot_ochirgich_yoq", "ot_ochirgich_yoq"),
        ("muammo_turi_evakuatsiya_yoli_yopiq", "evakuatsiya_yoli_yopiq"),
        ("muammo_turi_boshqa", "boshqa"),
    ]
    labels = {
        "uz": {
            "muammo_turi_ochiq_elektr_simi": "⚡ Ochiq elektr simi",
            "muammo_turi_elektr_shchit_nosoz": "🔌 Elektr shchit nosoz",
            "muammo_turi_gaz_shlangi_nosoz": "🔥 Gaz shlangi nosoz",
            "muammo_turi_gaz_hidi": "💨 Gaz hidi",
            "muammo_turi_isitish_uskunasi": "🌡️ Isitish uskunasi",
            "muammo_turi_mo_ri_tozalanmagan": "🏚️ Mo'ri tozalanmagan",
            "muammo_turi_ot_ochirgich_yoq": "🧯 O't o'chirgich yo'q",
            "muammo_turi_evakuatsiya_yoli_yopiq": "🚪 Evakuatsiya yo'li yopiq",
            "muammo_turi_boshqa": "📋 Boshqa",
        },
        "ru": {
            "muammo_turi_ochiq_elektr_simi": "⚡ Открытый провод",
            "muammo_turi_elektr_shchit_nosoz": "🔌 Неисправный щит",
            "muammo_turi_gaz_shlangi_nosoz": "🔥 Неисправный шланг",
            "muammo_turi_gaz_hidi": "💨 Запах газа",
            "muammo_turi_isitish_uskunasi": "🌡️ Отоп. оборудование",
            "muammo_turi_mo_ri_tozalanmagan": "🏚️ Дымоход не чищен",
            "muammo_turi_ot_ochirgich_yoq": "🧯 Нет огнетушителя",
            "muammo_turi_evakuatsiya_yoli_yopiq": "🚪 Путь эвакуации закрыт",
            "muammo_turi_boshqa": "📋 Другое",
        },
    }
    for key, val in items:
        builder.button(
            text=labels[lang][key],
            callback_data=f"muammo_turi:{val}",
        )
    builder.adjust(2)
    return builder.as_markup()


def xavf_daraja_keyboard(lang: str = "uz") -> InlineKeyboardMarkup:
    """Xavf darajasini tanlash."""
    builder = InlineKeyboardBuilder()
    items = [
        ("past", "🟢 Past" if lang == "uz" else "🟢 Низкий"),
        ("orta", "🟡 O'rta" if lang == "uz" else "🟡 Средний"),
        ("yuqori", "🔴 Yuqori" if lang == "uz" else "🔴 Высокий"),
    ]
    for val, label in items:
        builder.button(text=label, callback_data=f"xavf:{val}")
    builder.adjust(3)
    return builder.as_markup()


def pagination_keyboard(page: int, total_pages: int, prefix: str = "xonadon") -> InlineKeyboardMarkup:
    """Sahifalash klaviaturasi."""
    builder = InlineKeyboardBuilder()
    if page > 1:
        builder.button(text="⬅️", callback_data=f"{prefix}_page:{page - 1}")
    builder.button(text=f"{page}/{total_pages}", callback_data="noop")
    if page < total_pages:
        builder.button(text="➡️", callback_data=f"{prefix}_page:{page + 1}")
    builder.adjust(3)
    return builder.as_markup()


def language_keyboard() -> InlineKeyboardMarkup:
    """Til tanlash."""
    builder = InlineKeyboardBuilder()
    builder.button(text="🇺🇿 O'zbek", callback_data="lang:uz")
    builder.button(text="🇷🇺 Русский", callback_data="lang:ru")
    builder.adjust(2)
    return builder.as_markup()


def tasdiqlash_keyboard(lang: str = "uz") -> InlineKeyboardMarkup:
    """Yakuniy tasdiqlash."""
    builder = InlineKeyboardBuilder()
    yes_text = "✅ Ha" if lang == "uz" else "✅ Да"
    no_text = "❌ Yo'q" if lang == "uz" else "❌ Нет"
    builder.button(text=yes_text, callback_data="tasdiqlash:ha")
    builder.button(text=no_text, callback_data="tasdiqlash:yoq")
    builder.adjust(2)
    return builder.as_markup()
