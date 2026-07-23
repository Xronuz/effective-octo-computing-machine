"""
XAVFSIZ XONADON — Lokatsiya Pydantic schema validation tests.
"""
import pytest
from datetime import datetime, timezone
from pydantic import ValidationError

from app.schemas.lokatsiya import (
    LokatsiyaKiruvchi,
    LokatsiyaChiquvchi,
    AktivXodimResponse,
    LokatsiyaBatchKiruvchi,
    MarshrutNuqtaResponse,
)


# ============================================================
# LokatsiyaKiruvchi
# ============================================================

class TestLokatsiyaKiruvchi:
    """LokatsiyaKiruvchi schema validation tests."""

    def test_valid_full(self):
        """All fields with valid values."""
        ts = datetime(2026, 7, 16, 12, 0, 0, tzinfo=timezone.utc)
        obj = LokatsiyaKiruvchi(
            lat=41.3111,
            lng=69.2797,
            aniqlik=5.0,
            tezlik=1.5,
            batareya=85,
            mock_gps=False,
            qurilma_vaqti=ts,
        )
        assert obj.lat == 41.3111
        assert obj.lng == 69.2797
        assert obj.aniqlik == 5.0
        assert obj.tezlik == 1.5
        assert obj.batareya == 85
        assert obj.mock_gps is False
        assert obj.qurilma_vaqti == ts

    def test_minimal_defaults(self):
        """Only required fields: lat, lng, qurilma_vaqti."""
        ts = datetime(2026, 7, 16, 14, 0, 0, tzinfo=timezone.utc)
        obj = LokatsiyaKiruvchi(lat=40.0, lng=71.0, qurilma_vaqti=ts)
        assert obj.lat == 40.0
        assert obj.lng == 71.0
        assert obj.qurilma_vaqti == ts
        assert obj.aniqlik is None
        assert obj.tezlik is None
        assert obj.batareya is None
        assert obj.mock_gps is False  # default

    # --- lat boundary checks ---

    def test_lat_min_valid(self):
        ts = datetime.now()
        obj = LokatsiyaKiruvchi(lat=-90, lng=0, qurilma_vaqti=ts)
        assert obj.lat == -90

    def test_lat_max_valid(self):
        ts = datetime.now()
        obj = LokatsiyaKiruvchi(lat=90, lng=0, qurilma_vaqti=ts)
        assert obj.lat == 90

    @pytest.mark.parametrize("invalid_lat", [-91, 91, 1000])
    def test_lat_out_of_range(self, invalid_lat):
        ts = datetime.now()
        with pytest.raises(ValidationError):
            LokatsiyaKiruvchi(lat=invalid_lat, lng=0, qurilma_vaqti=ts)

    # --- lng boundary checks ---

    def test_lng_min_valid(self):
        ts = datetime.now()
        obj = LokatsiyaKiruvchi(lat=0, lng=-180, qurilma_vaqti=ts)
        assert obj.lng == -180

    def test_lng_max_valid(self):
        ts = datetime.now()
        obj = LokatsiyaKiruvchi(lat=0, lng=180, qurilma_vaqti=ts)
        assert obj.lng == 180

    @pytest.mark.parametrize("invalid_lng", [-181, 181, 500])
    def test_lng_out_of_range(self, invalid_lng):
        ts = datetime.now()
        with pytest.raises(ValidationError):
            LokatsiyaKiruvchi(lat=0, lng=invalid_lng, qurilma_vaqti=ts)

    # --- aniqlik boundary checks ---

    def test_aniqlik_negative_raises(self):
        ts = datetime.now()
        with pytest.raises(ValidationError):
            LokatsiyaKiruvchi(lat=41.0, lng=69.0, qurilma_vaqti=ts, aniqlik=-1)

    def test_aniqlik_over_1000_raises(self):
        ts = datetime.now()
        with pytest.raises(ValidationError):
            LokatsiyaKiruvchi(lat=41.0, lng=69.0, qurilma_vaqti=ts, aniqlik=1001)

    def test_aniqlik_zero_valid(self):
        ts = datetime.now()
        obj = LokatsiyaKiruvchi(lat=41.0, lng=69.0, qurilma_vaqti=ts, aniqlik=0)
        assert obj.aniqlik == 0

    def test_aniqlik_1000_valid(self):
        ts = datetime.now()
        obj = LokatsiyaKiruvchi(lat=41.0, lng=69.0, qurilma_vaqti=ts, aniqlik=1000)
        assert obj.aniqlik == 1000

    # --- tezlik boundary checks ---

    def test_tezlik_negative_raises(self):
        ts = datetime.now()
        with pytest.raises(ValidationError):
            LokatsiyaKiruvchi(lat=41.0, lng=69.0, qurilma_vaqti=ts, tezlik=-1)

    def test_tezlik_over_200_raises(self):
        ts = datetime.now()
        with pytest.raises(ValidationError):
            LokatsiyaKiruvchi(lat=41.0, lng=69.0, qurilma_vaqti=ts, tezlik=201)

    def test_tezlik_200_valid(self):
        ts = datetime.now()
        obj = LokatsiyaKiruvchi(lat=41.0, lng=69.0, qurilma_vaqti=ts, tezlik=200)
        assert obj.tezlik == 200

    # --- batareya boundary checks ---

    def test_batareya_negative_raises(self):
        ts = datetime.now()
        with pytest.raises(ValidationError):
            LokatsiyaKiruvchi(lat=41.0, lng=69.0, qurilma_vaqti=ts, batareya=-1)

    def test_batareya_over_100_raises(self):
        ts = datetime.now()
        with pytest.raises(ValidationError):
            LokatsiyaKiruvchi(lat=41.0, lng=69.0, qurilma_vaqti=ts, batareya=101)

    def test_batareya_0_valid(self):
        ts = datetime.now()
        obj = LokatsiyaKiruvchi(lat=41.0, lng=69.0, qurilma_vaqti=ts, batareya=0)
        assert obj.batareya == 0

    def test_batareya_100_valid(self):
        ts = datetime.now()
        obj = LokatsiyaKiruvchi(lat=41.0, lng=69.0, qurilma_vaqti=ts, batareya=100)
        assert obj.batareya == 100

    # --- mock_gps default ---

    def test_mock_gps_defaults_to_false(self):
        ts = datetime.now()
        obj = LokatsiyaKiruvchi(lat=41.0, lng=69.0, qurilma_vaqti=ts)
        assert obj.mock_gps is False

    def test_mock_gps_true(self):
        ts = datetime.now()
        obj = LokatsiyaKiruvchi(lat=41.0, lng=69.0, qurilma_vaqti=ts, mock_gps=True)
        assert obj.mock_gps is True


# ============================================================
# LokatsiyaBatchKiruvchi
# ============================================================

class TestLokatsiyaBatchKiruvchi:
    """LokatsiyaBatchKiruvchi schema validation tests."""

    def test_valid_single_item(self):
        ts = datetime.now()
        obj = LokatsiyaBatchKiruvchi(
            items=[LokatsiyaKiruvchi(lat=41.0, lng=69.0, qurilma_vaqti=ts)]
        )
        assert len(obj.items) == 1
        assert obj.items[0].lat == 41.0

    def test_empty_items_raises(self):
        with pytest.raises(ValidationError):
            LokatsiyaBatchKiruvchi(items=[])

    def test_over_500_items_raises(self):
        ts = datetime.now()
        item = LokatsiyaKiruvchi(lat=41.0, lng=69.0, qurilma_vaqti=ts)
        with pytest.raises(ValidationError):
            LokatsiyaBatchKiruvchi(items=[item] * 501)

    def test_exactly_500_items_valid(self):
        ts = datetime.now()
        item = LokatsiyaKiruvchi(lat=41.0, lng=69.0, qurilma_vaqti=ts)
        obj = LokatsiyaBatchKiruvchi(items=[item] * 500)
        assert len(obj.items) == 500


# ============================================================
# Response Models
# ============================================================

class TestResponseModels:
    """Lokatsiya response schemas — model_validate tests."""

    def test_lokatsiya_chiquvchi_from_dict(self):
        ts = "2026-07-16T12:00:00+00:00"
        obj = LokatsiyaChiquvchi.model_validate({
            "xodim_id": 1,
            "xodim_fio": "Ali Valiyev",
            "lat": 41.3111,
            "lng": 69.2797,
            "aniqlik": 5.0,
            "tezlik": 1.5,
            "batareya": 85,
            "mock_gps": False,
            "qurilma_vaqti": ts,
            "qabul_vaqti": ts,
        })
        assert obj.xodim_id == 1
        assert obj.xodim_fio == "Ali Valiyev"
        assert obj.lat == 41.3111
        assert obj.lng == 69.2797
        assert obj.aniqlik == 5.0
        assert obj.mock_gps is False

    def test_lokatsiya_chiquvchi_minimal(self):
        ts = "2026-07-16T12:00:00+00:00"
        obj = LokatsiyaChiquvchi.model_validate({
            "xodim_id": 2,
            "xodim_fio": "Vali Aliyev",
            "lat": 40.0,
            "lng": 71.0,
            "qurilma_vaqti": ts,
            "qabul_vaqti": ts,
        })
        assert obj.xodim_id == 2
        assert obj.aniqlik is None
        assert obj.batareya is None
        assert obj.mock_gps is False

    def test_aktiv_xodim_from_dict(self):
        ts = "2026-07-16T14:30:00+00:00"
        obj = AktivXodimResponse.model_validate({
            "xodim_id": 1,
            "xodim_fio": "Ali Valiyev",
            "lat": 41.3111,
            "lng": 69.2797,
            "aniqlik": 10.0,
            "batareya": 50,
            "ohirgi_vaqt": ts,
        })
        assert obj.xodim_id == 1
        assert obj.xodim_fio == "Ali Valiyev"
        assert obj.lat == 41.3111
        assert obj.batareya == 50

    def test_aktiv_xodim_minimal(self):
        ts = "2026-07-16T14:30:00+00:00"
        obj = AktivXodimResponse.model_validate({
            "xodim_id": 5,
            "xodim_fio": "Vali Aliyev",
            "lat": 40.0,
            "lng": 71.0,
            "ohirgi_vaqt": ts,
        })
        assert obj.aniqlik is None
        assert obj.batareya is None

    def test_marshrut_nuqta_from_dict(self):
        ts = "2026-07-16T10:00:00+00:00"
        obj = MarshrutNuqtaResponse.model_validate({
            "lat": 41.3111,
            "lng": 69.2797,
            "aniqlik": 5.0,
            "tezlik": 1.5,
            "batareya": 85,
            "qurilma_vaqti": ts,
            "qabul_vaqti": ts,
        })
        assert obj.lat == 41.3111
        assert obj.tezlik == 1.5
        assert obj.batareya == 85
