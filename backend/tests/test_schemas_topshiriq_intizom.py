"""XAVFSIZ XONADON — Topshiriq va Intizom Pydantic schema validation tests."""
import pytest
from datetime import date, datetime
from pydantic import ValidationError

from app.schemas.topshiriq_intizom import (
    TopshiriqCreate,
    TopshiriqUpdate,
    TopshiriqResponse,
    TopshiriqListResponse,
    TopshiriqFilter,
    IntizomCreate,
    IntizomResponse,
    IntizomListResponse,
    IntizomFilter,
)


# ============================================================
# TopshiriqCreate
# ============================================================

class TestTopshiriqCreate:
    """TopshiriqCreate schema validation tests."""

    def test_valid_full(self):
        """TopshiriqCreate accepts all fields with valid values."""
        obj = TopshiriqCreate(
            xodim_id=1,
            mfy_id=5,
            muammo_id=10,
            sarlavha="Topshiriq sarlavhasi",
            matn="Topshiriq matni",
            muddat=date(2025, 12, 31),
        )
        assert obj.xodim_id == 1
        assert obj.mfy_id == 5
        assert obj.muammo_id == 10
        assert obj.sarlavha == "Topshiriq sarlavhasi"
        assert obj.matn == "Topshiriq matni"
        assert obj.muddat == date(2025, 12, 31)

    def test_minimal_defaults(self):
        """TopshiriqCreate with only required fields uses defaults for optional fields."""
        obj = TopshiriqCreate(
            xodim_id=1,
            sarlavha="Minimal sarlavha",
            muddat=date(2025, 12, 31),
        )
        assert obj.xodim_id == 1
        assert obj.mfy_id is None
        assert obj.muammo_id is None
        assert obj.sarlavha == "Minimal sarlavha"
        assert obj.matn is None
        assert obj.muddat == date(2025, 12, 31)

    @pytest.mark.parametrize("invalid_sarlavha", [
        "",  # empty string
        "a" * 201,  # exceeds max_length
    ])
    def test_invalid_sarlavha(self, invalid_sarlavha):
        """TopshiriqCreate raises ValidationError for invalid sarlavha values."""
        with pytest.raises(ValidationError):
            TopshiriqCreate(
                xodim_id=1,
                sarlavha=invalid_sarlavha,
                muddat=date(2025, 12, 31),
            )

    @pytest.mark.parametrize("invalid_matn", [
        "a" * 2001,  # exceeds max_length
    ])
    def test_invalid_matn(self, invalid_matn):
        """TopshiriqCreate raises ValidationError for invalid matn values."""
        with pytest.raises(ValidationError):
            TopshiriqCreate(
                xodim_id=1,
                sarlavha="Valid",
                matn=invalid_matn,
                muddat=date(2025, 12, 31),
            )


# ============================================================
# TopshiriqUpdate
# ============================================================

class TestTopshiriqUpdate:
    """TopshiriqUpdate schema validation tests."""

    @pytest.mark.parametrize("valid_status", [
        "yangi",
        "korildi",
        "bajarildi",
        "kechikkan",
    ])
    def test_valid_status(self, valid_status):
        """TopshiriqUpdate accepts valid status values."""
        obj = TopshiriqUpdate(status=valid_status)
        assert obj.status == valid_status

    @pytest.mark.parametrize("invalid_status", [
        "yangi_",
        "korildi_",
        "bajarildi_",
        "kechikkan_",
        "yangi ",
        "korildi ",
        "bajarildi ",
        "kechikkan ",
        "",
        "YANGI",  # case-sensitive
        "KORILDI",
        "BAJARILDI",
        "KECHIKKAN",
    ])
    def test_invalid_status(self, invalid_status):
        """TopshiriqUpdate raises ValidationError for invalid status values."""
        with pytest.raises(ValidationError, match="Status:"):
            TopshiriqUpdate(status=invalid_status)


# ============================================================
# TopshiriqResponse
# ============================================================

class TestTopshiriqResponse:
    """TopshiriqResponse schema validation tests."""

    def test_valid_response(self):
        """TopshiriqResponse accepts valid data via model_validate."""
        data = {
            "id": 1,
            "rahbar_id": 2,
            "xodim_id": 3,
            "mfy_id": 4,
            "muammo_id": 5,
            "sarlavha": "Test sarlavha",
            "matn": "Test matn",
            "muddat": date(2025, 12, 31),
            "status": "yangi",
            "yaratilgan": datetime(2025, 1, 1, 10, 0, 0),
            "korilgan": datetime(2025, 1, 2, 10, 0, 0),
            "bajarilgan": datetime(2025, 1, 3, 10, 0, 0),
            "rahbar_fio": "Rahbar FIO",
            "xodim_fio": "Xodim FIO",
            "mfy_nomi": "MFI Nomi",
        }
        obj = TopshiriqResponse.model_validate(data)
        assert obj.id == 1
        assert obj.rahbar_id == 2
        assert obj.xodim_id == 3
        assert obj.mfy_id == 4
        assert obj.muammo_id == 5
        assert obj.sarlavha == "Test sarlavha"
        assert obj.matn == "Test matn"
        assert obj.muddat == date(2025, 12, 31)
        assert obj.status == "yangi"
        assert obj.yaratilgan == datetime(2025, 1, 1, 10, 0, 0)
        assert obj.korilgan == datetime(2025, 1, 2, 10, 0, 0)
        assert obj.bajarilgan == datetime(2025, 1, 3, 10, 0, 0)
        assert obj.rahbar_fio == "Rahbar FIO"
        assert obj.xodim_fio == "Xodim FIO"
        assert obj.mfy_nomi == "MFI Nomi"

    def test_optional_fields_none(self):
        """TopshiriqResponse handles optional fields as None."""
        data = {
            "id": 1,
            "rahbar_id": 2,
            "xodim_id": 3,
            "mfy_id": None,
            "muammo_id": None,
            "sarlavha": "Test sarlavha",
            "matn": None,
            "muddat": date(2025, 12, 31),
            "status": "yangi",
            "yaratilgan": datetime(2025, 1, 1, 10, 0, 0),
            "korilgan": None,
            "bajarilgan": None,
            "rahbar_fio": None,
            "xodim_fio": None,
            "mfy_nomi": None,
        }
        obj = TopshiriqResponse.model_validate(data)
        assert obj.mfy_id is None
        assert obj.muammo_id is None
        assert obj.matn is None
        assert obj.korilgan is None
        assert obj.bajarilgan is None
        assert obj.rahbar_fio is None
        assert obj.xodim_fio is None
        assert obj.mfy_nomi is None


# ============================================================
# TopshiriqListResponse
# ============================================================

class TestTopshiriqListResponse:
    """TopshiriqListResponse schema validation tests."""

    def test_pages_calculation(self):
        """TopshiriqListResponse calculates pages correctly."""
        # Test with zero total
        data_zero = {
            "items": [],
            "total": 0,
            "page": 1,
            "size": 20,
            "pages": 0,
        }
        obj_zero = TopshiriqListResponse.model_validate(data_zero)
        assert obj_zero.total == 0
        assert obj_zero.pages == 0

        # Test with total=45, size=20 -> pages=3
        data_45 = {
            "items": [],
            "total": 45,
            "page": 2,
            "size": 20,
            "pages": 3,
        }
        obj_45 = TopshiriqListResponse.model_validate(data_45)
        assert obj_45.total == 45
        assert obj_45.pages == 3

        # Test with total=40, size=20 -> pages=2
        data_40 = {
            "items": [],
            "total": 40,
            "page": 1,
            "size": 20,
            "pages": 2,
        }
        obj_40 = TopshiriqListResponse.model_validate(data_40)
        assert obj_40.total == 40
        assert obj_40.pages == 2


# ============================================================
# TopshiriqFilter
# ============================================================

class TestTopshiriqFilter:
    """TopshiriqFilter schema validation tests."""

    def test_defaults(self):
        """TopshiriqFilter defaults page=1, size=20."""
        obj = TopshiriqFilter()
        assert obj.page == 1
        assert obj.size == 20
        assert obj.xodim_id is None
        assert obj.mfy_id is None
        assert obj.status is None
        assert obj.muddat_dan is None
        assert obj.muddat_gacha is None

    def test_with_values(self):
        """TopshiriqFilter accepts all filter fields."""
        obj = TopshiriqFilter(
            xodim_id=1,
            mfy_id=5,
            status="bajarildi",
            muddat_dan=date(2025, 1, 1),
            muddat_gacha=date(2025, 12, 31),
            page=3,
            size=50,
        )
        assert obj.xodim_id == 1
        assert obj.mfy_id == 5
        assert obj.status == "bajarildi"
        assert obj.muddat_dan == date(2025, 1, 1)
        assert obj.muddat_gacha == date(2025, 12, 31)
        assert obj.page == 3
        assert obj.size == 50

    @pytest.mark.parametrize("invalid_page", [
        0,  # below minimum
        -1,  # negative
    ])
    def test_page_below_one(self, invalid_page):
        """TopshiriqFilter raises when page < 1."""
        with pytest.raises(ValidationError):
            TopshiriqFilter(page=invalid_page)

    @pytest.mark.parametrize("invalid_size", [
        0,  # below minimum
        101,  # above maximum
    ])
    def test_size_out_of_range(self, invalid_size):
        """TopshiriqFilter raises when size < 1 or size > 100."""
        with pytest.raises(ValidationError):
            TopshiriqFilter(size=invalid_size)


# ============================================================
# IntizomCreate
# ============================================================

class TestIntizomCreate:
    """IntizomCreate schema validation tests."""

    def test_valid_full(self):
        """IntizomCreate accepts all fields with valid values."""
        obj = IntizomCreate(
            xodim_id=1,
            muammo_id=5,
            turi="ogohlantirish",
            sabab="Xavfli holat aniqlandi",
        )
        assert obj.xodim_id == 1
        assert obj.muammo_id == 5
        assert obj.turi == "ogohlantirish"
        assert obj.sabab == "Xavfli holat aniqlandi"

    def test_minimal_defaults(self):
        """IntizomCreate with only required fields uses defaults for optional fields."""
        obj = IntizomCreate(
            xodim_id=1,
            turi="hayfsan",
            sabab="Minimal sabab",
        )
        assert obj.xodim_id == 1
        assert obj.muammo_id is None
        assert obj.turi == "hayfsan"
        assert obj.sabab == "Minimal sabab"

    @pytest.mark.parametrize("invalid_turi", [
        "ogohlantirish_",
        "hayfsan_",
        "ragbat_",
        "ogohlantirish ",
        "hayfsan ",
        "ragbat ",
        "",
        "OGOHLANTIRISH",  # case-sensitive
        "HAYFSAN",
        "RAGBAT",
        "not_valid",
    ])
    def test_invalid_turi(self, invalid_turi):
        """IntizomCreate raises ValidationError for invalid turi values."""
        with pytest.raises(ValidationError, match="Turi:"):
            IntizomCreate(
                xodim_id=1,
                turi=invalid_turi,
                sabab="Valid sabab",
            )

    @pytest.mark.parametrize("invalid_sabab", [
        "a" * 2001,  # exceeds max_length
    ])
    def test_invalid_sabab(self, invalid_sabab):
        """IntizomCreate raises ValidationError for invalid sabab values."""
        with pytest.raises(ValidationError):
            IntizomCreate(
                xodim_id=1,
                turi="ogohlantirish",
                sabab=invalid_sabab,
            )


# ============================================================
# IntizomResponse
# ============================================================

class TestIntizomResponse:
    """IntizomResponse schema validation tests."""

    def test_valid_response(self):
        """IntizomResponse accepts valid data via model_validate."""
        data = {
            "id": 1,
            "xodim_id": 2,
            "muammo_id": 3,
            "turi": "ragbat",
            "sabab": "Ajoyib ish bajarildi",
            "bergan_id": 4,
            "sana": datetime(2025, 1, 1, 10, 0, 0),
            "xodim_fio": "Xodim FIO",
            "bergan_fio": "Bergan FIO",
        }
        obj = IntizomResponse.model_validate(data)
        assert obj.id == 1
        assert obj.xodim_id == 2
        assert obj.muammo_id == 3
        assert obj.turi == "ragbat"
        assert obj.sabab == "Ajoyib ish bajarildi"
        assert obj.bergan_id == 4
        assert obj.sana == datetime(2025, 1, 1, 10, 0, 0)
        assert obj.xodim_fio == "Xodim FIO"
        assert obj.bergan_fio == "Bergan FIO"

    def test_optional_fields_none(self):
        """IntizomResponse handles optional fields as None."""
        data = {
            "id": 1,
            "xodim_id": 2,
            "muammo_id": None,
            "turi": "ogohlantirish",
            "sabab": "Test sabab",
            "bergan_id": 3,
            "sana": datetime(2025, 1, 1, 10, 0, 0),
            "xodim_fio": None,
            "bergan_fio": None,
        }
        obj = IntizomResponse.model_validate(data)
        assert obj.muammo_id is None
        assert obj.xodim_fio is None
        assert obj.bergan_fio is None


# ============================================================
# IntizomListResponse
# ============================================================

class TestIntizomListResponse:
    """IntizomListResponse schema validation tests."""

    def test_pages_calculation(self):
        """IntizomListResponse calculates pages correctly."""
        # Test with zero total
        data_zero = {
            "items": [],
            "total": 0,
            "page": 1,
            "size": 20,
            "pages": 0,
        }
        obj_zero = IntizomListResponse.model_validate(data_zero)
        assert obj_zero.total == 0
        assert obj_zero.pages == 0

        # Test with total=45, size=20 -> pages=3
        data_45 = {
            "items": [],
            "total": 45,
            "page": 2,
            "size": 20,
            "pages": 3,
        }
        obj_45 = IntizomListResponse.model_validate(data_45)
        assert obj_45.total == 45
        assert obj_45.pages == 3

        # Test with total=40, size=20 -> pages=2
        data_40 = {
            "items": [],
            "total": 40,
            "page": 1,
            "size": 20,
            "pages": 2,
        }
        obj_40 = IntizomListResponse.model_validate(data_40)
        assert obj_40.total == 40
        assert obj_40.pages == 2


# ============================================================
# IntizomFilter
# ============================================================

class TestIntizomFilter:
    """IntizomFilter schema validation tests."""

    def test_defaults(self):
        """IntizomFilter defaults page=1, size=20."""
        obj = IntizomFilter()
        assert obj.page == 1
        assert obj.size == 20
        assert obj.xodim_id is None
        assert obj.turi is None
        assert obj.sana_dan is None
        assert obj.sana_gacha is None

    def test_with_values(self):
        """IntizomFilter accepts all filter fields."""
        obj = IntizomFilter(
            xodim_id=1,
            turi="hayfsan",
            sana_dan=datetime(2025, 1, 1, 0, 0, 0),
            sana_gacha=datetime(2025, 12, 31, 23, 59, 59),
            page=2,
            size=50,
        )
        assert obj.xodim_id == 1
        assert obj.turi == "hayfsan"
        assert obj.sana_dan == datetime(2025, 1, 1, 0, 0, 0)
        assert obj.sana_gacha == datetime(2025, 12, 31, 23, 59, 59)
        assert obj.page == 2
        assert obj.size == 50

    @pytest.mark.parametrize("invalid_page", [
        0,  # below minimum
        -1,  # negative
    ])
    def test_page_below_one(self, invalid_page):
        """IntizomFilter raises when page < 1."""
        with pytest.raises(ValidationError):
            IntizomFilter(page=invalid_page)

    @pytest.mark.parametrize("invalid_size", [
        0,  # below minimum
        101,  # above maximum
    ])
    def test_size_out_of_range(self, invalid_size):
        """IntizomFilter raises when size < 1 or size > 100."""
        with pytest.raises(ValidationError):
            IntizomFilter(size=invalid_size)