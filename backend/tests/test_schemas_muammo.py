"""
XAVFSIZ XONADON — Muammo Pydantic schema validation tests.
"""
import pytest
from datetime import date, datetime
from pydantic import ValidationError

from app.schemas.muammo import (
    MuammoCreate,
    MuammoUpdate,
    MuammoYopish,
    MuammoFilter,
    FotolarniBoglash,
    MuammoFotoLink,
)


# ============================================================
# MuammoCreate
# ============================================================

class TestMuammoCreate:
    """MuammoCreate schema validation tests."""

    def test_valid_full(self):
        """MuammoCreate accepts all fields with valid values."""
        ts = datetime(2025, 6, 1, 12, 30, 0)
        obj = MuammoCreate(
            xonadon_id=1,
            turi="ochiq_elektr_simi",
            tavsif="Sim ochiq qolgan",
            xavf="yuqori",
            lat=41.3111,
            lng=69.2797,
            gps_aniqlik=5.0,
            mock_gps=False,
            client_uuid="12345678-1234-5678-1234-567812345678",
            qurilma_vaqti=ts,
            yoriqnomadan_otkanlar_soni=2,
        )
        assert obj.xonadon_id == 1
        assert obj.turi == "ochiq_elektr_simi"
        assert obj.tavsif == "Sim ochiq qolgan"
        assert obj.xavf == "yuqori"
        assert obj.lat == 41.3111
        assert obj.lng == 69.2797
        assert obj.gps_aniqlik == 5.0
        assert obj.mock_gps is False
        assert str(obj.client_uuid) == "12345678-1234-5678-1234-567812345678"
        assert obj.qurilma_vaqti == ts

    def test_minimal_defaults(self):
        """MuammoCreate with only required fields uses defaults for xavf and mock_gps."""
        ts = datetime.now()
        obj = MuammoCreate(
            xonadon_id=5,
            turi="boshqa",
            lat=40.0,
            lng=71.0,
            client_uuid="12345678-1234-5678-1234-567812345678",
            qurilma_vaqti=ts,
            yoriqnomadan_otkanlar_soni=0,
        )
        assert obj.xonadon_id == 5
        assert obj.turi == "boshqa"
        assert obj.xavf == "orta"       # default
        assert obj.mock_gps is False    # default
        assert obj.tavsif is None
        assert obj.gps_aniqlik is None

    def test_turi_none_allowed(self):
        """turi endi ixtiyoriy — checklist oqimida None yuboriladi."""
        ts = datetime.now()
        obj = MuammoCreate(
            xonadon_id=5,
            turi=None,
            lat=40.0,
            lng=71.0,
            client_uuid="12345678-1234-5678-1234-567812345678",
            qurilma_vaqti=ts,
            yoriqnomadan_otkanlar_soni=3,
        )
        assert obj.turi is None

    def test_yoriqnomadan_otkanlar_soni_required(self):
        """yoriqnomadan_otkanlar_soni endi majburiy — tushmasa ValidationError."""
        ts = datetime.now()
        with pytest.raises(ValidationError, match="yoriqnomadan_otkanlar_soni"):
            MuammoCreate(
                xonadon_id=1,
                turi="boshqa",
                lat=41.0,
                lng=69.0,
                client_uuid="12345678-1234-5678-1234-567812345678",
                qurilma_vaqti=ts,
            )

    def test_yoriqnomadan_otkanlar_soni_negative(self):
        """yoriqnomadan_otkanlar_soni manfiy bo'lsa — ValidationError."""
        ts = datetime.now()
        with pytest.raises(ValidationError):
            MuammoCreate(
                xonadon_id=1,
                turi="boshqa",
                lat=41.0,
                lng=69.0,
                client_uuid="12345678-1234-5678-1234-567812345678",
                qurilma_vaqti=ts,
                yoriqnomadan_otkanlar_soni=-1,
            )

    @pytest.mark.parametrize("bandlar", ["3,4,8", "1", "14", "1,14"])
    def test_taklif_etilgan_tadbirlar_valid_bandlar(self, bandlar):
        """turi=None bo'lganda 1-14 band raqamlari vergul bilan qabul qilinadi."""
        ts = datetime.now()
        obj = MuammoCreate(
            xonadon_id=1,
            turi=None,
            lat=41.0,
            lng=69.0,
            client_uuid="12345678-1234-5678-1234-567812345678",
            qurilma_vaqti=ts,
            yoriqnomadan_otkanlar_soni=1,
            taklif_etilgan_tadbirlar=bandlar,
            ornida_bartaraf=True,
            has_keyin_foto=True,
        )
        assert obj.taklif_etilgan_tadbirlar == bandlar

    @pytest.mark.parametrize("bandlar", ["0", "15", "3,99", "3, 4", "3;4", "abc"])
    def test_taklif_etilgan_tadbirlar_invalid_format(self, bandlar):
        """turi=None bo'lganda 1-14 oralig'idan tashqari/formatga mos kelmagan qiymat rad etiladi."""
        ts = datetime.now()
        with pytest.raises(ValidationError, match="Yo'riqnoma bandlari"):
            MuammoCreate(
                xonadon_id=1,
                turi=None,
                lat=41.0,
                lng=69.0,
                client_uuid="12345678-1234-5678-1234-567812345678",
                qurilma_vaqti=ts,
                yoriqnomadan_otkanlar_soni=1,
                taklif_etilgan_tadbirlar=bandlar,
            )

    def test_taklif_etilgan_tadbirlar_freeform_when_turi_set(self):
        """turi belgilangan bo'lsa (legacy), taklif_etilgan_tadbirlar erkin matn bo'lishi mumkin."""
        ts = datetime.now()
        obj = MuammoCreate(
            xonadon_id=1,
            turi="gaz_hidi",
            lat=41.0,
            lng=69.0,
            client_uuid="12345678-1234-5678-1234-567812345678",
            qurilma_vaqti=ts,
            yoriqnomadan_otkanlar_soni=0,
            taklif_etilgan_tadbirlar="katta ta'mirlash kerak",
            ornida_bartaraf=True,
            has_keyin_foto=True,
        )
        assert obj.taklif_etilgan_tadbirlar == "katta ta'mirlash kerak"

    def test_invalid_client_uuid(self):
        """Noto'g'ri UUID format — ValidationError (500 emas, 422)."""
        ts = datetime.now()
        with pytest.raises(ValidationError):
            MuammoCreate(
                xonadon_id=1,
                turi="boshqa",
                lat=41.0,
                lng=69.0,
                client_uuid="not-a-uuid",
                qurilma_vaqti=ts,
            )

    @pytest.mark.parametrize("invalid_turi", [
        "nomalum_turi",
        "ochiq_elektr",
        "elektr",
        "  ",  # whitespace-only is not in allowed set
    ])
    def test_invalid_turi(self, invalid_turi):
        """MuammoCreate raises ValidationError for invalid turi values."""
        ts = datetime.now()
        with pytest.raises(ValidationError, match="Noto'g'ri muammo turi"):
            MuammoCreate(
                xonadon_id=1,
                turi=invalid_turi,
                lat=41.0,
                lng=69.0,
                client_uuid="12345678-1234-5678-1234-567812345678",
                qurilma_vaqti=ts,
            )

    @pytest.mark.parametrize("invalid_xavf", [
        "juda_yuqori",
        "pAst",  # case-sensitive
        "medium",
    ])
    def test_invalid_xavf(self, invalid_xavf):
        """MuammoCreate raises ValidationError for invalid xavf values."""
        ts = datetime.now()
        with pytest.raises(ValidationError, match="Xavf darajasi"):
            MuammoCreate(
                xonadon_id=1,
                turi="gaz_hidi",
                xavf=invalid_xavf,
                lat=41.0,
                lng=69.0,
                client_uuid="12345678-1234-5678-1234-567812345678",
                qurilma_vaqti=ts,
            )

    @pytest.mark.parametrize("lat, lng", [
        (-91.0, 0.0),      # lat below -90
        (91.0, 0.0),       # lat above 90
        (0.0, -181.0),     # lng below -180
        (0.0, 181.0),      # lng above 180
        (-100.0, 500.0),   # both out of range
    ])
    def test_lat_lng_out_of_range(self, lat, lng):
        """MuammoCreate raises ValidationError when lat/lng are out of range."""
        ts = datetime.now()
        with pytest.raises(ValidationError):
            MuammoCreate(
                xonadon_id=1,
                turi="boshqa",
                lat=lat,
                lng=lng,
                client_uuid="12345678-1234-5678-1234-567812345678",
                qurilma_vaqti=ts,
            )

    def test_boundary_lat_lng(self):
        """Boundary values for lat and lng should be accepted."""
        ts = datetime.now()
        obj = MuammoCreate(
            xonadon_id=1,
            turi="boshqa",
            lat=-90.0,
            lng=-180.0,
            client_uuid="12345678-1234-5678-1234-567812345678",
            qurilma_vaqti=ts,
            yoriqnomadan_otkanlar_soni=0,
        )
        assert obj.lat == -90.0
        assert obj.lng == -180.0

        obj2 = MuammoCreate(
            xonadon_id=1,
            turi="boshqa",
            lat=90.0,
            lng=180.0,
            client_uuid="12345678-1234-5678-1234-567812345678",
            qurilma_vaqti=ts,
            yoriqnomadan_otkanlar_soni=0,
        )
        assert obj2.lat == 90.0
        assert obj2.lng == 180.0

    def test_gps_aniqlik_negative(self):
        """MuammoCreate raises when gps_aniqlik is negative."""
        ts = datetime.now()
        with pytest.raises(ValidationError):
            MuammoCreate(
                xonadon_id=1,
                turi="boshqa",
                lat=41.0,
                lng=69.0,
                gps_aniqlik=-1.0,
                client_uuid="12345678-1234-5678-1234-567812345678",
                qurilma_vaqti=ts,
            )


# ============================================================
# MuammoUpdate
# ============================================================

class TestMuammoUpdate:
    """MuammoUpdate schema validation tests."""

    def test_partial_status_only(self):
        """MuammoUpdate accepts a single field update (status only)."""
        obj = MuammoUpdate(status="jarayonda")
        assert obj.status == "jarayonda"
        assert obj.ornida_bartaraf is None
        assert obj.muddat is None
        assert obj.xavf is None
        assert obj.tashkilot is None

    def test_all_fields(self):
        """MuammoUpdate with all fields set."""
        obj = MuammoUpdate(
            status="yopilgan",
            ornida_bartaraf=True,
            muddat=date(2025, 7, 1),
            xavf="kritik",
            tashkilot="Toshkent shahar FVV",
        )
        assert obj.status == "yopilgan"
        assert obj.ornida_bartaraf is True
        assert obj.muddat == date(2025, 7, 1)
        assert obj.xavf == "kritik"
        assert obj.tashkilot == "Toshkent shahar FVV"

    @pytest.mark.parametrize("invalid_status", [
        "yopilgan_",
        "ochiq_",
        "tugagan",
        "bekor_qilingan",
    ])
    def test_invalid_status(self, invalid_status):
        """MuammoUpdate raises ValidationError for invalid status values."""
        with pytest.raises(ValidationError, match="Status"):
            MuammoUpdate(status=invalid_status)

    def test_empty_status_not_allowed(self):
        """Empty string status should raise (min_length=1)."""
        with pytest.raises(ValidationError):
            MuammoUpdate(status="")

    @pytest.mark.parametrize("invalid_xavf", ["", "ultra", "normal"])
    def test_invalid_xavf(self, invalid_xavf):
        """MuammoUpdate raises ValidationError for invalid xavf values."""
        with pytest.raises(ValidationError, match="Xavf darajasi"):
            MuammoUpdate(xavf=invalid_xavf)

    def test_empty_update(self):
        """MuammoUpdate with no fields (all optional) is valid."""
        obj = MuammoUpdate()
        assert obj.status is None
        assert obj.ornida_bartaraf is None
        assert obj.muddat is None
        assert obj.xavf is None
        assert obj.tashkilot is None


# ============================================================
# MuammoYopish
# ============================================================

class TestMuammoYopish:
    """MuammoYopish schema validation tests."""

    def test_default_ornida_bartaraf(self):
        """MuammoYopish defaults ornida_bartaraf to True."""
        obj = MuammoYopish()
        assert obj.ornida_bartaraf is True
        assert obj.tavsif is None

    def test_with_tavsif(self):
        """MuammoYopish accepts tavsif field."""
        obj = MuammoYopish(tavsif="Elektr simi qayta ulandi")
        assert obj.ornida_bartaraf is True  # default
        assert obj.tavsif == "Elektr simi qayta ulandi"

    def test_ornida_bartaraf_false(self):
        """MuammoYopish allows ornida_bartaraf=False."""
        obj = MuammoYopish(ornida_bartaraf=False)
        assert obj.ornida_bartaraf is False

    def test_tavsif_max_length(self):
        """MuammoYopish raises for tavsif exceeding max_length."""
        with pytest.raises(ValidationError):
            MuammoYopish(tavsif="x" * 2001)


# ============================================================
# MuammoFilter
# ============================================================

class TestMuammoFilter:
    """MuammoFilter schema validation tests."""

    def test_defaults(self):
        """MuammoFilter defaults page=1, size=20."""
        obj = MuammoFilter()
        assert obj.page == 1
        assert obj.size == 20
        assert obj.status is None
        assert obj.turi is None
        assert obj.xavf is None
        assert obj.mfy_id is None
        assert obj.xodim_id is None
        assert obj.shubhali is None
        assert obj.ornida_bartaraf is None
        assert obj.sana_dan is None
        assert obj.sana_gacha is None
        assert obj.qidiruv is None

    def test_with_page_and_size(self):
        """MuammoFilter accepts custom page and size."""
        obj = MuammoFilter(page=3, size=50)
        assert obj.page == 3
        assert obj.size == 50

    def test_all_filters_set(self):
        """MuammoFilter accepts all filter fields."""
        obj = MuammoFilter(
            status="ochiq",
            turi="gaz_hidi",
            xavf="yuqori",
            mfy_id=10,
            xodim_id=42,
            shubhali=True,
            ornida_bartaraf=False,
            sana_dan=date(2025, 1, 1),
            sana_gacha=date(2025, 12, 31),
            qidiruv="gaz",
            page=2,
            size=10,
        )
        assert obj.status == "ochiq"
        assert obj.turi == "gaz_hidi"
        assert obj.xavf == "yuqori"
        assert obj.mfy_id == 10
        assert obj.xodim_id == 42
        assert obj.shubhali is True
        assert obj.ornida_bartaraf is False
        assert obj.sana_dan == date(2025, 1, 1)
        assert obj.sana_gacha == date(2025, 12, 31)
        assert obj.qidiruv == "gaz"
        assert obj.page == 2
        assert obj.size == 10

    def test_page_below_one(self):
        """MuammoFilter raises when page < 1."""
        with pytest.raises(ValidationError):
            MuammoFilter(page=0)

    def test_size_above_max(self):
        """MuammoFilter raises when size > 100."""
        with pytest.raises(ValidationError):
            MuammoFilter(size=101)


# ============================================================
# FotolarniBoglash
# ============================================================

class TestFotolarniBoglash:
    """FotolarniBoglash schema validation tests."""

    def test_one_foto(self):
        """FotolarniBoglash with a single foto is valid."""
        obj = FotolarniBoglash(turi="keyin", fotolar=[
            MuammoFotoLink(fayl_yoli="/uploads/photo1.jpg", sha256="a" * 64),
        ])
        assert len(obj.fotolar) == 1
        assert obj.fotolar[0].fayl_yoli == "/uploads/photo1.jpg"
        assert obj.fotolar[0].sha256 == "a" * 64

    def test_empty_fotolar_raises(self):
        """FotolarniBoglash raises when fotolar list is empty."""
        with pytest.raises(ValidationError):
            FotolarniBoglash(turi="keyin", fotolar=[])

    def test_ten_fotolar_ok(self):
        """FotolarniBoglash with exactly 10 fotolar is valid."""
        fotolar = [
            MuammoFotoLink(fayl_yoli=f"/uploads/photo{i}.jpg", sha256=f"{i:064x}")
            for i in range(10)
        ]
        obj = FotolarniBoglash(turi="oldin", fotolar=fotolar)
        assert len(obj.fotolar) == 10
        for i, foto in enumerate(obj.fotolar):
            assert foto.fayl_yoli == f"/uploads/photo{i}.jpg"

    def test_invalid_turi_raises(self):
        """FotolarniBoglash raises when turi is not 'oldin'/'keyin'."""
        with pytest.raises(ValidationError):
            FotolarniBoglash(turi="boshqa", fotolar=[
                MuammoFotoLink(fayl_yoli="/uploads/photo1.jpg", sha256="a" * 64),
            ])

    def test_eleven_fotolar_raises(self):
        """FotolarniBoglash raises when fotolar exceeds max_length of 10."""
        fotolar = [
            MuammoFotoLink(fayl_yoli=f"/uploads/photo{i}.jpg", sha256=f"{i:064x}")
            for i in range(11)
        ]
        with pytest.raises(ValidationError):
            FotolarniBoglash(fotolar=fotolar)

    def test_foto_link_sha256_required(self):
        """MuammoFotoLink — sha256 majburiy (default '' taqiqlangan)."""
        with pytest.raises(ValidationError):
            MuammoFotoLink(fayl_yoli="/uploads/img.png")

    def test_foto_link_sha256_too_short(self):
        """MuammoFotoLink raises when sha256 is shorter than 64 chars."""
        with pytest.raises(ValidationError):
            MuammoFotoLink(fayl_yoli="/uploads/img.png", sha256="abc123")

    def test_foto_link_with_sha256(self):
        """MuammoFotoLink accepts an explicit sha256."""
        link = MuammoFotoLink(
            fayl_yoli="/uploads/img.png",
            sha256="a" * 64,
        )
        assert link.sha256 == "a" * 64

    def test_foto_link_sha256_too_long(self):
        """MuammoFotoLink raises when sha256 exceeds max_length."""
        with pytest.raises(ValidationError):
            MuammoFotoLink(fayl_yoli="/x.jpg", sha256="a" * 65)

    def test_foto_link_exif_fields(self):
        """MuammoFotoLink EXIF maydonlarini qabul qiladi (ixtiyoriy)."""
        link = MuammoFotoLink(
            fayl_yoli="/uploads/img.jpg",
            sha256="b" * 64,
            exif_lat=41.31,
            exif_lng=69.24,
            exif_vaqt="2026:07:14 10:00:00",
            olcham_byte=1024,
        )
        assert link.exif_lat == 41.31
        assert link.exif_lng == 69.24
        assert link.exif_vaqt == "2026:07:14 10:00:00"
        assert link.olcham_byte == 1024
