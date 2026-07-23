"""
XAVFSIZ XONADON — Telegram bot i18n (O'zbek/Rus).
Har bir foydalanuvchining tili sessiya davomida eslab qolinadi.
"""

MESSAGES = {
    "uz": {
        "welcome": (
            "🏠🔥 <b>XAVFSIZ XONADON</b> botiga xush kelibsiz!\n\n"
            "Uychi tumani FVV bo'limi xodimlari uchun raqamli nazorat platformasi.\n\n"
        ),
        "not_authenticated": "Iltimos avval tizimga kiring: /kirish",
        "auth_prompt_guvohnoma": "📛 Guvohnoma raqamingizni kiriting:\n(yoki bekor qilish uchun /cancel)",
        "auth_prompt_parol": "🔐 Parolingizni kiriting:",
        "auth_success": "✅ Xush kelibsiz, {full_name}! ({rol})\n\nAsosiy menyu:",
        "auth_fail": "❌ Kirishda xatolik: {error}\nQayta urinib ko'ring: /kirish",
        "auth_blocked": "🚫 Hisobingiz bloklangan.",
        "auth_pending": "⏳ Hisobingiz hali tasdiqlanmagan. Administrator tasdiqlashini kuting.",
        "auth_wrong": "❌ Guvohnoma raqami yoki parol noto'g'ri.",
        "already_authenticated": "Siz allaqachon tizimga kirgansiz, {full_name}.",
        "logout_done": "👋 Tizimdan chiqdingiz.",
        "menu_main": "📋 Asosiy menyu",
        "menu_admin": "⚙️ Admin menyu",
        "xonadonlar_title": "🏠 <b>Xonadonlar ro'yxati</b>\n\nSahifa {page}/{pages} · Jami: {total} ta",
        "xonadonlar_empty": "❌ Xonadon topilmadi.",
        "xonadon_detail": (
            "🏠 <b>{address}</b>\n"
            "├ MFY: {mfy}\n"
            "├ Ko'cha: {street}\n"
            "├ Egasi: {owner}\n"
            "├ Tel: {phone}\n"
            "└ Ochiq muammolar: {problems}\n"
        ),
        "muammo_title": "⚠️ <b>Muammo qayd etish</b>",
        "muammo_turi": "Muammo turini tanlang:",
        "muammo_tavsif": "📝 Muammo tavsifini yozing (ixtiyoriy, skip uchun /skip):",
        "muammo_xavf": "⚡ Xavf darajasini tanlang:",
        "muammo_foto": "📸 Muammo fotosini yuboring (yoki /skip):",
        "muammo_gps": "📍 GPS lokatsiyangizni yuboring (Telegram 'Lokatsiya yuborish' tugmasi orqali):",
        "muammo_created": "✅ Muammo #{id} muvaffaqiyatli yaratildi!\n{turi_nomi} — {manzil}",
        "muammo_error": "❌ Muammo yaratishda xatolik: {error}",
        "statistika_title": "📊 <b>Statistika</b>\n\n",
        "statistika_line": "├ {label}: <b>{value}</b>\n",
        "statistika_bottom": "└ Oxirgi yangilanish: {time}",
        "bloklash_success": "✅ Foydalanuvchi #{user_id} bloklandi.",
        "bloklash_error": "❌ Bloklashda xatolik: {error}",
        "xabar_sent": "✅ Xabar {count} ta foydalanuvchiga yuborildi.",
        "xabar_error": "❌ Xabar yuborishda xatolik: {error}",
        "no_permission": "⛔ Bu amal uchun ruxsatingiz yo'q.",
        "unknown_command": "❓ Noma'lum buyruq. /help orqali yordam oling.",
        "cancel": "🚫 Amal bekor qilindi.",
        "help": (
            "📖 <b>Buyruqlar:</b>\n\n"
            "/start — Botni ishga tushirish\n"
            "/kirish — Tizimga kirish\n"
            "/chiqish — Tizimdan chiqish\n"
            "/xonadonlar — Xonadonlar ro'yxati\n"
            "/muammo — Yangi muammo qayd etish\n"
            "/help — Yordam\n"
            "/cancel — Amalni bekor qilish\n"
        ),
        "help_admin": (
            "\n<b>Admin buyruqlari:</b>\n\n"
            "/statistika — Statistika\n"
            "/bloklash {id} — Foydalanuvchini bloklash\n"
            "/xabar {text} — Barchaga xabar yuborish\n"
        ),
        "pagination": "⬅️ {page}/{pages} ➡️",
        "next_page": "➡️",
        "prev_page": "⬅️",
        "muammo_turi_ochiq_elektr_simi": "⚡ Ochiq elektr simi",
        "muammo_turi_elektr_shchit_nosoz": "🔌 Elektr shchit nosoz",
        "muammo_turi_gaz_shlangi_nosoz": "🔥 Gaz shlangi nosoz",
        "muammo_turi_gaz_hidi": "💨 Gaz hidi",
        "muammo_turi_isitish_uskunasi": "🌡️ Isitish uskunasi",
        "muammo_turi_mo_ri_tozalanmagan": "🏚️ Mo'ri tozalanmagan",
        "muammo_turi_ot_ochirgich_yoq": "🧯 O't o'chirgich yo'q",
        "muammo_turi_evakuatsiya_yoli_yopiq": "🚪 Evakuatsiya yo'li yopiq",
        "muammo_turi_boshqa": "📋 Boshqa",
        "xavf_past": "🟢 Past",
        "xavf_orta": "🟡 O'rta",
        "xavf_yuqori": "🔴 Yuqori",
        "accept_photo": "📸 Fotosurat qabul qilindi.",
        "accept_skip": "⏭️ O'tkazib yuborildi.",
        "loading": "⏳ Yuklanmoqda...",
    },
    "ru": {
        "welcome": (
            "🏠🔥 Добро пожаловать в бот <b>XAVFSIZ XONADON</b>!\n\n"
            "Цифровая платформа контроля для сотрудников УВД Уйчинского района.\n\n"
        ),
        "not_authenticated": "Пожалуйста, сначала войдите в систему: /kirish",
        "auth_prompt_guvohnoma": "📛 Введите номер удостоверения:\n(или /cancel для отмены)",
        "auth_prompt_parol": "🔐 Введите пароль:",
        "auth_success": "✅ Добро пожаловать, {full_name}! ({rol})\n\nГлавное меню:",
        "auth_fail": "❌ Ошибка входа: {error}\nПопробуйте снова: /kirish",
        "auth_blocked": "🚫 Ваш аккаунт заблокирован.",
        "auth_pending": "⏳ Ваш аккаунт ещё не подтверждён. Дождитесь подтверждения администратора.",
        "auth_wrong": "❌ Неверный номер удостоверения или пароль.",
        "already_authenticated": "Вы уже вошли в систему, {full_name}.",
        "logout_done": "👋 Вы вышли из системы.",
        "menu_main": "📋 Главное меню",
        "menu_admin": "⚙️ Меню администратора",
        "xonadonlar_title": "🏠 <b>Список домов</b>\n\nСтраница {page}/{pages} · Всего: {total}",
        "xonadonlar_empty": "❌ Дома не найдены.",
        "xonadon_detail": (
            "🏠 <b>{address}</b>\n"
            "├ МСГ: {mfy}\n"
            "├ Улица: {street}\n"
            "├ Владелец: {owner}\n"
            "├ Тел: {phone}\n"
            "└ Открытые проблемы: {problems}\n"
        ),
        "muammo_title": "⚠️ <b>Регистрация проблемы</b>",
        "muammo_turi": "Выберите тип проблемы:",
        "muammo_tavsif": "📝 Опишите проблему (необязательно, /skip для пропуска):",
        "muammo_xavf": "⚡ Выберите уровень опасности:",
        "muammo_foto": "📸 Отправьте фото проблемы (или /skip):",
        "muammo_gps": "📍 Отправьте вашу геолокацию (через кнопку Telegram 'Отправить локацию'):",
        "muammo_created": "✅ Проблема #{id} успешно создана!\n{turi_nomi} — {manzil}",
        "muammo_error": "❌ Ошибка при создании проблемы: {error}",
        "statistika_title": "📊 <b>Статистика</b>\n\n",
        "statistika_line": "├ {label}: <b>{value}</b>\n",
        "statistika_bottom": "└ Последнее обновление: {time}",
        "bloklash_success": "✅ Пользователь #{user_id} заблокирован.",
        "bloklash_error": "❌ Ошибка блокировки: {error}",
        "xabar_sent": "✅ Сообщение отправлено {count} пользователям.",
        "xabar_error": "❌ Ошибка отправки сообщения: {error}",
        "no_permission": "⛔ У вас нет прав для этого действия.",
        "unknown_command": "❓ Неизвестная команда. Используйте /help.",
        "cancel": "🚫 Действие отменено.",
        "help": (
            "📖 <b>Команды:</b>\n\n"
            "/start — Запуск бота\n"
            "/kirish — Вход в систему\n"
            "/chiqish — Выход\n"
            "/xonadonlar — Список домов\n"
            "/muammo — Новая проблема\n"
            "/help — Помощь\n"
            "/cancel — Отмена\n"
        ),
        "help_admin": (
            "\n<b>Команды администратора:</b>\n\n"
            "/statistika — Статистика\n"
            "/bloklash {id} — Заблокировать пользователя\n"
            "/xabar {text} — Отправить всем сообщение\n"
        ),
        "pagination": "⬅️ {page}/{pages} ➡️",
        "next_page": "➡️",
        "prev_page": "⬅️",
        "muammo_turi_ochiq_elektr_simi": "⚡ Открытый провод",
        "muammo_turi_elektr_shchit_nosoz": "🔌 Неисправный щит",
        "muammo_turi_gaz_shlangi_nosoz": "🔥 Неисправный шланг",
        "muammo_turi_gaz_hidi": "💨 Запах газа",
        "muammo_turi_isitish_uskunasi": "🌡️ Отоп. оборудование",
        "muammo_turi_mo_ri_tozalanmagan": "🏚️ Дымоход не чищен",
        "muammo_turi_ot_ochirgich_yoq": "🧯 Нет огнетушителя",
        "muammo_turi_evakuatsiya_yoli_yopiq": "🚪 Путь эвакуации закрыт",
        "muammo_turi_boshqa": "📋 Другое",
        "xavf_past": "🟢 Низкий",
        "xavf_orta": "🟡 Средний",
        "xavf_yuqori": "🔴 Высокий",
        "accept_photo": "📸 Фото принято.",
        "accept_skip": "⏭️ Пропущено.",
        "loading": "⏳ Загрузка...",
    },
}


def t(key: str, lang: str = "uz", **kwargs) -> str:
    """Tarjima matnini olish. format kwargs orqali."""
    msgs = MESSAGES.get(lang, MESSAGES["uz"])
    text = msgs.get(key, MESSAGES["uz"].get(key, key))
    if kwargs:
        return text.format(**kwargs)
    return text
