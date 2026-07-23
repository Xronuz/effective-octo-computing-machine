"""
XAVFSIZ XONADON — Auth schema testlari.
RoyxatRequest, KirishRequest, TokenResponse, RefreshRequest, PushTokenRequest.
"""
import pytest
from pydantic import ValidationError as PydanticValidationError
from app.schemas.auth import (
    RoyxatRequest,
    KirishRequest,
    RefreshRequest,
    PushTokenRequest,
    UserUpdateRequest,
    MfyBiriktirishRequest,
    ApiResponse,
)


class TestRoyxatRequest:
    """Ro'yxatdan o'tish so'rovi."""

    def test_valid_all_fields(self):
        r = RoyxatRequest(
            guvohnoma_raqami="XODIM001",
            parol="ValidPass1",
            familiya="Karimov",
            ism="Akmal",
            lavozim="Katta inspektor",
            telefon="+998901112233",
        )
        assert r.guvohnoma_raqami == "XODIM001"
        assert r.familiya == "Karimov"

    def test_valid_minimal(self):
        r = RoyxatRequest(
            guvohnoma_raqami="XOD001",
            parol="Pass1234",
            familiya="Ali",
            ism="Vali",
            lavozim="Inspektor",
        )
        assert r.telefon is None
        assert r.sharif is None

    def test_missing_required_raises(self):
        with pytest.raises(PydanticValidationError):
            RoyxatRequest(guvohnoma_raqami="XOD001", parol="Pass1")

    def test_short_password_raises(self):
        with pytest.raises(PydanticValidationError):
            RoyxatRequest(
                guvohnoma_raqami="XOD001",
                parol="Ab1",  # < 8
                familiya="Ali",
                ism="Vali",
                lavozim="Inspektor",
            )

    def test_password_no_digit_raises(self):
        with pytest.raises(PydanticValidationError) as exc:
            RoyxatRequest(
                guvohnoma_raqami="XOD001",
                parol="Abcdefgh",
                familiya="Ali",
                ism="Vali",
                lavozim="Inspektor",
            )
        assert "raqam" in str(exc.value).lower()

    def test_password_no_letter_raises(self):
        with pytest.raises(PydanticValidationError) as exc:
            RoyxatRequest(
                guvohnoma_raqami="XOD001",
                parol="12345678",
                familiya="Ali",
                ism="Vali",
                lavozim="Inspektor",
            )
        assert "harf" in str(exc.value).lower()

    def test_guvohnoma_lowercase_accepted_and_stored(self):
        # Pattern r"^[A-Z0-9]+$" means lowercase rejected by pattern
        with pytest.raises(PydanticValidationError):
            RoyxatRequest(
                guvohnoma_raqami="xodim001",
                parol="Pass1234",
                familiya="Ali",
                ism="Vali",
                lavozim="Inspektor",
            )


class TestKirishRequest:
    """Tizimga kirish so'rovi."""

    def test_valid(self):
        r = KirishRequest(guvohnoma_raqami="ADMIN001", parol="secretpass")
        assert r.guvohnoma_raqami == "ADMIN001"

    def test_missing_parol_raises(self):
        with pytest.raises(PydanticValidationError):
            KirishRequest(guvohnoma_raqami="ADMIN001")

    def test_missing_guvohnoma_raises(self):
        with pytest.raises(PydanticValidationError):
            KirishRequest(parol="secret")


class TestRefreshRequest:
    """Refresh token yangilash."""

    def test_valid(self):
        r = RefreshRequest(refresh_token="eyJhbGciOi...")
        assert r.refresh_token == "eyJhbGciOi..."

    def test_missing_raises(self):
        with pytest.raises(PydanticValidationError):
            RefreshRequest()


class TestPushTokenRequest:
    """Push token validatsiyasi."""

    def test_valid_expo_token(self):
        r = PushTokenRequest(push_token="ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]")
        assert r.push_token.startswith("ExponentPushToken[")

    def test_invalid_prefix_raises(self):
        with pytest.raises(PydanticValidationError):
            PushTokenRequest(push_token="not_expo_token")

    def test_empty_raises(self):
        with pytest.raises(PydanticValidationError):
            PushTokenRequest(push_token="")


class TestUserUpdateRequest:
    """Foydalanuvchi yangilash."""

    def test_partial_update(self):
        r = UserUpdateRequest(lavozim="Rahbar")
        assert r.lavozim == "Rahbar"
        assert r.telefon is None

    def test_empty_update_allowed(self):
        r = UserUpdateRequest()
        assert r.lavozim is None


class TestMfyBiriktirishRequest:
    """MFY biriktirish."""

    def test_valid(self):
        r = MfyBiriktirishRequest(mfy_ids=[1, 2, 3])
        assert r.mfy_ids == [1, 2, 3]

    def test_empty_list_raises(self):
        with pytest.raises(PydanticValidationError):
            MfyBiriktirishRequest(mfy_ids=[])

    def test_too_many_raises(self):
        with pytest.raises(PydanticValidationError):
            MfyBiriktirishRequest(mfy_ids=list(range(54)))  # max 53


class TestApiResponse:
    """API javob formati."""

    def test_success(self):
        r = ApiResponse(ok=True, data={"x": 1})
        assert r.ok is True
        assert r.xato is None

    def test_error(self):
        r = ApiResponse(ok=False, xato="Xatolik yuz berdi")
        assert r.ok is False
        assert r.data is None
