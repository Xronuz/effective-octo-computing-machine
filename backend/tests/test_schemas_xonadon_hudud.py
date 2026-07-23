"""
XAVFSIZ XONADON — Xonadon & Hudud schema testlari.
XonadonCreate, XonadonUpdate, XonadonFilter, KochaCreate, MfyResponse.
"""
import pytest
from pydantic import ValidationError as PydanticValidationError
from app.schemas.xonadon import XonadonCreate, XonadonUpdate, XonadonFilter, XonadonResponse
from app.schemas.hudud import KochaCreate, KochaResponse, MfyResponse


class TestXonadonCreate:
    """Yangi xonadon qo'shish schemasi."""

    def test_valid_full(self):
        x = XonadonCreate(
            kocha_id=1, uy_raqami="15A", lat=40.9, lng=71.1,
            egasi_fio="Ali Valiyev", egasi_tel="+998901112233", izoh="2-qavat"
        )
        assert x.kocha_id == 1
        assert x.uy_raqami == "15A"
        assert x.egasi_fio == "Ali Valiyev"

    def test_valid_minimal(self):
        x = XonadonCreate(kocha_id=1, uy_raqami="15")
        assert x.egasi_fio is None
        assert x.lat is None

    def test_empty_uy_raqami_raises(self):
        with pytest.raises(PydanticValidationError):
            XonadonCreate(kocha_id=1, uy_raqami="")

    def test_lat_out_of_range_raises(self):
        with pytest.raises(PydanticValidationError):
            XonadonCreate(kocha_id=1, uy_raqami="15", lat=91)

    def test_lng_out_of_range_raises(self):
        with pytest.raises(PydanticValidationError):
            XonadonCreate(kocha_id=1, uy_raqami="15", lng=-181)

    def test_boundary_lat_ok(self):
        x = XonadonCreate(kocha_id=1, uy_raqami="15", lat=90, lng=180)
        assert x.lat == 90 and x.lng == 180

    def test_missing_required_raises(self):
        with pytest.raises(PydanticValidationError):
            XonadonCreate(uy_raqami="15")  # no kocha_id

    def test_long_strings_accepted_up_to_max(self):
        # uy_raqami max 20
        x = XonadonCreate(kocha_id=1, uy_raqami="A" * 20)
        assert len(x.uy_raqami) == 20

    def test_too_long_uy_raqami_raises(self):
        with pytest.raises(PydanticValidationError):
            XonadonCreate(kocha_id=1, uy_raqami="A" * 21)


class TestXonadonUpdate:
    """Xonadon yangilash (barcha maydonlar optional)."""

    def test_single_field(self):
        x = XonadonUpdate(egasi_fio="Vali Aliyev")
        assert x.egasi_fio == "Vali Aliyev"
        assert x.kocha_id is None
        assert x.uy_raqami is None

    def test_all_empty(self):
        x = XonadonUpdate()
        assert all(v is None for k, v in x.model_dump().items())

    def test_multiple_fields(self):
        x = XonadonUpdate(kocha_id=2, uy_raqami="20B", lat=41.0)
        assert x.kocha_id == 2
        assert x.uy_raqami == "20B"


class TestXonadonFilter:
    """Xonadonlar filtr."""

    def test_defaults(self):
        f = XonadonFilter()
        assert f.page == 1
        assert f.size == 20
        assert f.mfy_id is None

    def test_with_filters(self):
        f = XonadonFilter(mfy_id=5, ochiq_muammo=True, page=3, size=10)
        assert f.mfy_id == 5
        assert f.ochiq_muammo is True
        assert f.page == 3

    def test_page_below_1_raises(self):
        with pytest.raises(PydanticValidationError):
            XonadonFilter(page=0)

    def test_size_above_100_raises(self):
        with pytest.raises(PydanticValidationError):
            XonadonFilter(size=101)


class TestKochaCreate:
    """Ko'cha qo'shish schemasi."""

    def test_valid(self):
        k = KochaCreate(mfy_id=1, nomi="Mustaqillik")
        assert k.mfy_id == 1
        assert k.nomi == "Mustaqillik"

    def test_empty_nomi_raises(self):
        with pytest.raises(PydanticValidationError):
            KochaCreate(mfy_id=1, nomi="")

    def test_missing_mfy_id_raises(self):
        with pytest.raises(PydanticValidationError):
            KochaCreate(nomi="Mustaqillik")

    def test_missing_nomi_raises(self):
        with pytest.raises(PydanticValidationError):
            KochaCreate(mfy_id=1)

    def test_long_nomi_accepted(self):
        k = KochaCreate(mfy_id=1, nomi="K" * 150)
        assert len(k.nomi) == 150

    def test_too_long_nomi_raises(self):
        with pytest.raises(PydanticValidationError):
            KochaCreate(mfy_id=1, nomi="K" * 151)


class TestMfyResponse:
    """MFY javob formati."""

    def test_minimal(self):
        m = MfyResponse(id=1, raqami=1, nomi="Test MFY")
        assert m.id == 1
        assert m.xonadon_soni == 0  # default
        assert m.kochalar_soni == 0
        assert m.chegara is None  # default — chegara NULL

    def test_chegara_geojson(self):
        """chegara GeoJSON dict ko'rinishida qabul qilinadi."""
        geojson = {
            "type": "Polygon",
            "coordinates": [[[71.0, 40.0], [71.1, 40.0], [71.1, 40.1], [71.0, 40.1], [71.0, 40.0]]],
        }
        m = MfyResponse(id=1, raqami=1, nomi="Test MFY", chegara=geojson)
        assert m.chegara["type"] == "Polygon"
        # JSON seriyalashda ham saqlanadi
        dumped = m.model_dump(mode="json")
        assert dumped["chegara"]["coordinates"][0][0] == [71.0, 40.0]

    def test_chegara_multipolygon(self):
        """MultiPolygon GeoJSON ham qabul qilinadi."""
        geojson = {"type": "MultiPolygon", "coordinates": [[[[71.0, 40.0], [71.1, 40.0], [71.1, 40.1], [71.0, 40.0]]]]}
        m = MfyResponse(id=2, raqami=2, nomi="Test MFY 2", chegara=geojson)
        assert m.chegara["type"] == "MultiPolygon"


class TestKochaResponse:
    """Ko'cha javob formati."""

    def test_minimal(self):
        k = KochaResponse(id=1, mfy_id=1, nomi="Test Kocha")
        assert k.id == 1
        assert k.xonadon_soni == 0
