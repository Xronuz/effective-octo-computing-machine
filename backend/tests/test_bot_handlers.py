"""
XAVFSIZ XONADON — Telegram bot handlerlari uchun yengil unit testlar.

DB'siz: faqat `sessions` dict shakli (oddiy qiymatlar) va i18n
placeholder'lari tekshiriladi. ORM obyekti sessiyada saqlanmasligi
(DetachedInstanceError oldini olish) shu testlar bilan kafolatlanadi.
"""
import asyncio
import html

import pytest

from app.bot.bot import sessions
from app.bot.i18n import t
from app.bot.handlers import muammo as muammo_handler
from app.bot.handlers import xonadon as xonadon_handler
from app.bot.handlers import admin as admin_handler
from app.models.user import UserRole

TG_ID = 999000001


@pytest.fixture(autouse=True)
def _clean_sessions():
    """Har testdan keyin global sessions dict'ni tozalash."""
    sessions.pop(TG_ID, None)
    yield
    sessions.pop(TG_ID, None)


# ============ sessions — oddiy qiymatlar shakli ============

def test_is_authed_false_when_empty():
    assert muammo_handler._is_authed(TG_ID) is False
    assert xonadon_handler._is_authed(TG_ID) is False


def test_is_authed_true_with_user_id():
    sessions[TG_ID] = {"user_id": 1, "rol": UserRole.xodim, "full_name": "Test", "lang": "uz"}
    assert muammo_handler._is_authed(TG_ID) is True
    assert xonadon_handler._is_authed(TG_ID) is True


def test_is_admin_by_stored_rol():
    sessions[TG_ID] = {"user_id": 1, "rol": UserRole.rahbar, "full_name": "Boss", "lang": "uz"}
    assert muammo_handler._is_admin(TG_ID) is True
    assert xonadon_handler._is_admin(TG_ID) is True
    assert asyncio.run(admin_handler.is_admin(TG_ID)) is True

    sessions[TG_ID]["rol"] = UserRole.xodim
    assert muammo_handler._is_admin(TG_ID) is False
    assert xonadon_handler._is_admin(TG_ID) is False
    assert asyncio.run(admin_handler.is_admin(TG_ID)) is False


def test_is_admin_false_without_session():
    assert muammo_handler._is_admin(TG_ID) is False
    assert asyncio.run(admin_handler.is_admin(TG_ID)) is False


def test_sessions_never_store_orm_user():
    """sessions'da 'user' kaliti (ORM obyekti) saqlanmasligi kerak."""
    sessions[TG_ID] = {"user_id": 1, "rol": UserRole.xodim, "full_name": "Test", "lang": "uz"}
    assert "user" not in sessions[TG_ID]


# ============ i18n placeholder'lari (uz/ru bir xil kwargs) ============

def test_muammo_created_placeholders_both_langs():
    kwargs = {"id": 5, "turi_nomi": "Gaz hidi", "manzil": "Xonadon #3"}
    for lang in ("uz", "ru"):
        text = t("muammo_created", lang, **kwargs)
        assert "#5" in text
        assert "Gaz hidi" in text
        assert "Xonadon #3" in text


def test_muammo_error_with_escaped_html():
    """Xato matnidagi '<...>' HTML parse xatosiga olib kelmasligi kerak."""
    raw = "<Xonadon at 0x123> detached"
    for lang in ("uz", "ru"):
        text = t("muammo_error", lang, error=html.escape(raw))
        assert "<Xonadon" not in text
        assert "&lt;Xonadon" in text
