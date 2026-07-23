"""Tests for app.core.exceptions — all custom exception classes."""
import pytest
from app.core.exceptions import (
    AppException,
    AuthException,
    RoyxatException,
    NotFoundException,
    ConflictException,
    ForbiddenException,
    ValidationException,
)


class TestAppException:
    """Base exception: holds xato, status_code, optional data."""

    def test_default_data_is_none(self):
        exc = AppException(xato="xato yuz berdi")
        assert exc.xato == "xato yuz berdi"
        assert exc.status_code == 400
        assert exc.data is None

    def test_custom_status_code(self):
        exc = AppException(xato="xato", status_code=418)
        assert exc.status_code == 418

    def test_with_data(self):
        exc = AppException(xato="xato", data={"field": "error"})
        assert exc.data == {"field": "error"}

    def test_str_representation(self):
        exc = AppException(xato="xato matni")
        assert str(exc) == "xato matni"


class TestAuthException:
    """401 — authentication/authorization errors."""

    def test_status_code(self):
        exc = AuthException(xato="Token eskirgan")
        assert exc.status_code == 401

    def test_custom_status_passthrough(self):
        exc = AuthException(xato="Maxsus", status_code=403)
        assert exc.status_code == 403


class TestRoyxatException:
    """400 — registration errors."""

    def test_status_code(self):
        exc = RoyxatException(xato="Email band")
        assert exc.status_code == 400

    def test_xato_stored(self):
        exc = RoyxatException(xato="Noto'g'ri parol")
        assert exc.xato == "Noto'g'ri parol"
        assert exc.data is None


class TestNotFoundException:
    """404 — resource not found. Builds message from obyekt and optional id_."""

    def test_with_id(self):
        exc = NotFoundException(obyekt="Foydalanuvchi", id_=42)
        assert exc.xato == "Foydalanuvchi topilmadi (id=42)"
        assert exc.status_code == 404

    def test_without_id_none(self):
        exc = NotFoundException(obyekt="Foydalanuvchi", id_=None)
        assert exc.xato == "Foydalanuvchi topilmadi"
        assert exc.status_code == 404

    def test_without_id_omitted(self):
        exc = NotFoundException(obyekt="Mahsulot")
        assert exc.xato == "Mahsulot topilmadi"
        assert exc.status_code == 404

    def test_zero_id_is_falsy(self):
        """id=0 is falsy in Python, so omitted from message (same as id_=None)."""
        exc = NotFoundException(obyekt="Yozuv", id_=0)
        assert exc.xato == "Yozuv topilmadi"
        assert exc.status_code == 404


class TestConflictException:
    """409 — duplicate/collision errors."""

    def test_status_code(self):
        exc = ConflictException(xato="Bu email allaqachon mavjud")
        assert exc.status_code == 409

    def test_xato_stored(self):
        exc = ConflictException(xato="Dublikat")
        assert exc.xato == "Dublikat"


class TestForbiddenException:
    """403 — permission denied. Default message in Uzbek."""

    def test_default_message(self):
        exc = ForbiddenException()
        assert exc.xato == "Ushbu amalni bajarish uchun ruxsatingiz yo'q"
        assert exc.status_code == 403

    def test_custom_message(self):
        exc = ForbiddenException(xato="Faqat admin")
        assert exc.xato == "Faqat admin"
        assert exc.status_code == 403


class TestValidationException:
    """422 — validation errors. Accepts optional data dict."""

    def test_with_data(self):
        exc = ValidationException(
            xato="Maydonlar noto'g'ri",
            data={"email": "Noto'g'ri format"},
        )
        assert exc.status_code == 422
        assert exc.xato == "Maydonlar noto'g'ri"
        assert exc.data == {"email": "Noto'g'ri format"}

    def test_without_data(self):
        exc = ValidationException(xato="Validatsiya xatosi")
        assert exc.data is None
        assert exc.status_code == 422


class TestInheritance:
    """All custom exceptions are subclasses of AppException."""

    @pytest.mark.parametrize("exc", [
        AuthException("x"),
        RoyxatException("x"),
        NotFoundException("x"),
        ConflictException("x"),
        ForbiddenException(),
        ValidationException("x"),
    ])
    def test_all_inherit_app_exception(self, exc):
        assert isinstance(exc, AppException)

    def test_app_exception_is_exception(self):
        assert issubclass(AppException, Exception)
