"""
XAVFSIZ XONADON — Security moduli testlari.
hash_password, verify_password, validate_password_strength,
validate_guvohnoma_raqami, JWT yaratish/decode.
"""
import pytest
from unittest.mock import patch
from app.core.security import (
    hash_password,
    verify_password,
    validate_password_strength,
    validate_guvohnoma_raqami,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
)
from app.core.exceptions import AuthException
from app.config import settings


class TestHashPassword:
    """Parol hashlash va tekshirish."""

    def test_hash_returns_different_salts(self):
        h1 = hash_password("test1234")
        h2 = hash_password("test1234")
        assert h1 != h2  # unique salts

    def test_verify_correct_password(self):
        h = hash_password("test1234")
        assert verify_password("test1234", h) is True

    def test_verify_wrong_password(self):
        h = hash_password("test1234")
        assert verify_password("wrongpass", h) is False

    def test_hash_starts_with_bcrypt_prefix(self):
        h = hash_password("test1234")
        assert h.startswith("$2b$") or h.startswith("$2a$")


class TestValidatePasswordStrength:
    """Parol kuchi validatsiyasi."""

    def test_too_short_raises(self):
        with pytest.raises(AuthException) as exc:
            validate_password_strength("Ab1")
        assert "kamida 8 ta" in exc.value.xato.lower()

    def test_no_digit_raises(self):
        with pytest.raises(AuthException) as exc:
            validate_password_strength("Abcdefgh")
        assert "raqam" in exc.value.xato.lower()

    def test_no_letter_raises(self):
        with pytest.raises(AuthException) as exc:
            validate_password_strength("12345678")
        assert "lotin harfi" in exc.value.xato.lower()

    def test_valid_password_passes(self):
        # Must not raise
        validate_password_strength("ValidPass1")

    def test_multiple_errors_combined(self):
        with pytest.raises(AuthException) as exc:
            validate_password_strength("ab")
        # Both "too short" and "no digit"
        assert ";" in exc.value.xato


class TestValidateGuvohnomaRaqami:
    """Guvohnoma raqami formatini tekshirish."""

    def test_empty_raises(self):
        with pytest.raises(AuthException):
            validate_guvohnoma_raqami("")

    def test_too_short_raises(self):
        with pytest.raises(AuthException):
            validate_guvohnoma_raqami("AB")

    def test_special_chars_raises(self):
        with pytest.raises(AuthException):
            validate_guvohnoma_raqami("AB@123")

    def test_valid_returns_uppercased(self):
        result = validate_guvohnoma_raqami("admin001")
        assert result == "ADMIN001"

    def test_valid_already_upper(self):
        result = validate_guvohnoma_raqami("XODIM005")
        assert result == "XODIM005"


class TestJWTAccess:
    """Access token yaratish va decode qilish."""

    def test_create_and_decode(self):
        token = create_access_token(user_id=42, role="xodim")
        payload = decode_access_token(token)
        assert payload["sub"] == "42"
        assert payload["role"] == "xodim"
        assert payload["typ"] == "access"

    def test_decode_rejects_refresh_token(self):
        token, _, _ = create_refresh_token(user_id=42)
        with pytest.raises(AuthException) as exc:
            decode_access_token(token)
        assert "access token emas" in exc.value.xato.lower()


class TestJWTRefresh:
    """Refresh token yaratish va decode qilish."""

    def test_create_and_decode(self):
        token, jti, exp = create_refresh_token(user_id=42)
        payload = decode_refresh_token(token)
        assert payload["sub"] == "42"
        assert payload["typ"] == "refresh"
        assert payload["jti"] == jti

    def test_decode_rejects_access_token(self):
        token = create_access_token(user_id=42, role="xodim")
        payload = decode_refresh_token(token)
        assert payload is None


class TestJWTExpired:
    """Muddati o'tgan tokenlar."""

    def test_decode_expired_access_token(self):
        from jose import jwt as jose
        from datetime import datetime, timedelta, timezone
        past = datetime.now(timezone.utc) - timedelta(hours=1)
        payload = {"sub": "1", "rol": "xodim", "typ": "access", "exp": past}
        token = jose.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
        with pytest.raises(AuthException) as exc:
            decode_access_token(token)
        assert "muddati" in exc.value.xato.lower()


class TestJWTVariousRoles:
    """Turli rollar bilan JWT."""

    @pytest.mark.parametrize("role", ["xodim", "rahbar", "superadmin"])
    def test_each_role(self, role):
        token = create_access_token(user_id=1, role=role)
        payload = decode_access_token(token)
        assert payload["role"] == role
