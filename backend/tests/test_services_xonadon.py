"""
XAVFSIZ XONADON — Xonadon xizmati testlari.
Mock AsyncSession bilan biznes-logika birlik testlari.
"""
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

from app.services import xonadon as xonadon_service
from app.models.hudud import Xonadon, Kocha, Mfy
from app.models.muammo import Muammo, MuammoStatus
from app.core.exceptions import NotFoundException, ConflictException


# ============ Helpers ============

def _make_mock_db(**overrides):
    """Mock AsyncSession yaratish."""
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none = MagicMock(return_value=None)
    result.scalar = MagicMock(return_value=0)
    result.unique = MagicMock(return_value=result)
    result.scalars = MagicMock(return_value=result)
    result.all = MagicMock(return_value=[])

    for name, val in overrides.items():
        if name == "execute_return":
            db.execute = AsyncMock(return_value=val)
        elif name.startswith("result_"):
            setattr(result, name[7:], MagicMock(return_value=val))
        elif hasattr(db, name):
            setattr(db, name, MagicMock(return_value=val))
    else:
        if "execute_return" not in overrides:
            db.execute = AsyncMock(return_value=result)

    db.add = MagicMock()
    db.flush = AsyncMock()
    db.refresh = AsyncMock()
    db.delete = AsyncMock()
    db.get = AsyncMock(return_value=None)
    return db, result


def _make_kocha(kocha_id=1, nomi="Navoiy", mfy_id=1):
    k = MagicMock(spec=Kocha)
    k.id = kocha_id
    k.nomi = nomi
    k.mfy_id = mfy_id
    k.mfy = MagicMock(spec=Mfy)
    k.mfy.id = mfy_id
    k.mfy.nomi = "Namuna MFY"
    k.mfy.raqami = 1
    k.mfy.xonadon_soni = 0
    k.xonadonlar = []
    return k


def _make_mfy(mfy_id=1, raqami=1, nomi="Namuna MFY"):
    m = MagicMock(spec=Mfy)
    m.id = mfy_id
    m.raqami = raqami
    m.nomi = nomi
    m.xonadon_soni = 0
    m.kochalar = []
    return m


def _make_xonadon(xonadon_id=1, kocha_id=1, uy_raqami="12", kocha_nomi="Navoiy"):
    x = MagicMock(spec=Xonadon)
    x.id = xonadon_id
    x.kocha_id = kocha_id
    x.uy_raqami = uy_raqami
    x.lat = 41.123
    x.lng = 69.456
    x.egasi_fio = "Ali Valiyev"
    x.egasi_tel = "+998901234567"
    x.izoh = "Test xonadon"
    x.yaratilgan = datetime(2026, 7, 14, 10, 0, 0, tzinfo=timezone.utc)
    x.full_address = f"Namuna MFY, {kocha_nomi} ko'chasi, {uy_raqami}-uy"
    x.muammolar = []
    x.kocha = _make_kocha(kocha_id, kocha_nomi)
    x.mfy = x.kocha.mfy
    return x


def _make_muammo(muammo_id=1, status=MuammoStatus.ochiq):
    m = MagicMock(spec=Muammo)
    m.id = muammo_id
    m.status = status
    m.xonadon_id = 1
    return m


# ============ create_xonadon ============

class TestCreateXonadon:
    """Xonadon yaratish testlari."""

    @pytest.mark.asyncio
    async def test_create_success(self):
        """Muvaffaqiyatli xonadon yaratish."""
        kocha = _make_kocha(1, "Navoiy", mfy_id=2)
        yaratilgan = _make_xonadon(xonadon_id=5, uy_raqami="12")
        db, result = _make_mock_db()
        # 1) ko'cha tekshiruvi, 2) dublikat tekshiruvi, 3) get_xonadon qayta o'qish
        result.scalar_one_or_none = MagicMock(side_effect=[kocha, None, yaratilgan])

        x = await xonadon_service.create_xonadon(
            db, kocha_id=1, uy_raqami="12",
            lat=41.123, lng=69.456,
            egasi_fio="Ali Valiyev", egasi_tel="+998901234567",
            izoh="Test xonadon",
        )

        db.add.assert_called_once()
        db.flush.assert_called_once()
        assert x is yaratilgan

    @pytest.mark.asyncio
    async def test_create_kocha_not_found(self):
        """Ko'cha topilmasa NotFoundException."""
        db, result = _make_mock_db()
        result.scalar_one_or_none = MagicMock(return_value=None)

        with pytest.raises(NotFoundException, match="Ko'cha topilmadi"):
            await xonadon_service.create_xonadon(
                db, kocha_id=999, uy_raqami="12",
            )

    @pytest.mark.asyncio
    async def test_create_duplicate(self):
        """Dublikat xonadon bo'lsa ConflictException."""
        kocha = _make_kocha(1)
        existing = _make_xonadon(xonadon_id=1, uy_raqami="12")
        db, result = _make_mock_db()
        result.scalar_one_or_none = MagicMock(side_effect=[kocha, existing])

        with pytest.raises(ConflictException, match="Bu uy allaqachon qo'shilgan"):
            await xonadon_service.create_xonadon(
                db, kocha_id=1, uy_raqami="12",
            )


# ============ get_xonadon ============

class TestGetXonadon:

    @pytest.mark.asyncio
    async def test_get_success(self):
        """Xonadon topilganda qaytariladi."""
        expected = _make_xonadon(xonadon_id=5)

        db, result = _make_mock_db()
        result.scalar_one_or_none = MagicMock(return_value=expected)

        x = await xonadon_service.get_xonadon(db, 5)
        assert x is expected

    @pytest.mark.asyncio
    async def test_get_not_found(self):
        """Xonadon topilmasa NotFoundException."""
        db, result = _make_mock_db()
        result.scalar_one_or_none = MagicMock(return_value=None)

        with pytest.raises(NotFoundException, match="Xonadon topilmadi"):
            await xonadon_service.get_xonadon(db, 999)


# ============ list_xonadonlar ============

class TestListXonadonlar:

    @pytest.mark.asyncio
    async def test_list_empty(self):
        """Bo'sh ro'yxat qaytariladi."""
        db, result = _make_mock_db()
        result.scalar = MagicMock(return_value=0)
        result.all = MagicMock(return_value=[])

        items, total = await xonadon_service.list_xonadonlar(db)
        assert items == []
        assert total == 0

    @pytest.mark.asyncio
    async def test_list_with_items(self):
        """Elementlar bor ro'yxat."""
        x1 = _make_xonadon(xonadon_id=1)
        x2 = _make_xonadon(xonadon_id=2)

        db, result = _make_mock_db()
        db.execute = AsyncMock(return_value=result)
        result.scalar = MagicMock(return_value=2)
        result.all = MagicMock(return_value=[x1, x2])

        items, total = await xonadon_service.list_xonadonlar(db)
        assert len(items) == 2
        assert total == 2

    @pytest.mark.asyncio
    async def test_list_filter_by_mfy(self):
        """mfy_id bo'yicha filtrlash."""
        db, result = _make_mock_db()
        result.scalar = MagicMock(return_value=1)
        result.all = MagicMock(return_value=[_make_xonadon()])

        items, total = await xonadon_service.list_xonadonlar(db, mfy_id=1)
        assert total == 1

    @pytest.mark.asyncio
    async def test_list_filter_by_kocha(self):
        """kocha_id bo'yicha filtrlash."""
        x = _make_xonadon(kocha_id=3)
        db, result = _make_mock_db()
        result.scalar = MagicMock(return_value=1)
        result.all = MagicMock(return_value=[x])

        items, total = await xonadon_service.list_xonadonlar(db, kocha_id=3)
        assert total == 1
        assert items[0].kocha_id == 3

    @pytest.mark.asyncio
    async def test_list_filter_ochiq_muammo(self):
        """Ochiq muammosi bor xonadonlar."""
        db, result = _make_mock_db()
        result.scalar = MagicMock(return_value=2)
        result.all = MagicMock(return_value=[_make_xonadon(1), _make_xonadon(2)])

        items, total = await xonadon_service.list_xonadonlar(db, ochiq_muammo=True)
        assert total == 2

    @pytest.mark.asyncio
    async def test_list_filter_qidiruv(self):
        """Qidiruv so'zi bo'yicha filtrlash (ilike)."""
        x = _make_xonadon(uy_raqami="12")
        db, result = _make_mock_db()
        result.scalar = MagicMock(return_value=1)
        result.all = MagicMock(return_value=[x])

        items, total = await xonadon_service.list_xonadonlar(db, qidiruv="12-uy")
        assert total == 1

    @pytest.mark.asyncio
    async def test_list_pagination(self):
        """Sahifalash — offset va limit."""
        db, result = _make_mock_db()
        result.scalar = MagicMock(return_value=50)
        result.all = MagicMock(return_value=[_make_xonadon(i) for i in range(10)])

        items, total = await xonadon_service.list_xonadonlar(db, page=3, size=10)
        assert total == 50
        assert len(items) == 10


# ============ update_xonadon ============

class TestUpdateXonadon:

    @pytest.mark.asyncio
    async def test_update_all_fields(self):
        """Barcha maydonlarni yangilash."""
        xonadon = _make_xonadon(xonadon_id=1)
        db, result = _make_mock_db()

        updated = await xonadon_service.update_xonadon(
            db, xonadon,
            uy_raqami="14",
            lat=42.0, lng=70.0,
            egasi_fio="Bobur Aliyev",
            egasi_tel="+998907654321",
            izoh="Yangilangan xonadon",
        )

        assert updated.uy_raqami == "14"
        assert updated.lat == 42.0
        assert updated.lng == 70.0
        assert updated.egasi_fio == "Bobur Aliyev"
        assert updated.egasi_tel == "+998907654321"
        assert updated.izoh == "Yangilangan xonadon"
        db.flush.assert_called_once()
        db.refresh.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_kocha_not_found(self):
        """Noto'g'ri kocha_id berilsa NotFoundException."""
        xonadon = _make_xonadon(xonadon_id=1)
        db, result = _make_mock_db()
        result.scalar_one_or_none = MagicMock(return_value=None)

        with pytest.raises(NotFoundException, match="Ko'cha topilmadi"):
            await xonadon_service.update_xonadon(
                db, xonadon, kocha_id=999,
            )

    @pytest.mark.asyncio
    async def test_update_partial(self):
        """Faqat bir nechta maydonni yangilash."""
        xonadon = _make_xonadon(xonadon_id=1)
        db, result = _make_mock_db()

        updated = await xonadon_service.update_xonadon(
            db, xonadon,
            uy_raqami="16",
            egasi_fio="Olim Aliyev",
        )

        assert updated.uy_raqami == "16"
        assert updated.egasi_fio == "Olim Aliyev"
        # Original values should remain unchanged
        assert updated.egasi_tel == "+998901234567"
        assert updated.izoh == "Test xonadon"
        assert updated.lat == 41.123
        assert updated.lng == 69.456

    @pytest.mark.asyncio
    async def test_update_kocha_change_updates_mfy_count(self):
        """Ko'cha o'zgarganida eski va yangi MFY lar soni yangilanadi."""
        xonadon = _make_xonadon(xonadon_id=1, kocha_id=1)
        new_kocha = _make_kocha(kocha_id=2, mfy_id=5)
        old_kocha = _make_kocha(kocha_id=1, mfy_id=2)
        old_mfy = _make_mfy(mfy_id=2)
        new_mfy = _make_mfy(mfy_id=5)

        db, result = _make_mock_db()
        result.scalar_one_or_none = MagicMock(return_value=new_kocha)
        # db.get is called:
        # 1. db.get(Kocha, old_kocha_id)
        # 2. db.get(Kocha, kocha_id)
        # 3. db.get(Mfy, old_kocha.mfy_id)  <- inside _update_mfy_xonadon_count
        # 4. db.get(Mfy, new_kocha.mfy_id)  <- inside _update_mfy_xonadon_count
        db.get = AsyncMock(side_effect=[old_kocha, new_kocha, old_mfy, new_mfy])

        updated = await xonadon_service.update_xonadon(
            db, xonadon, kocha_id=2,
        )

        assert updated.kocha_id == 2
        assert db.get.call_count == 4
        db.flush.assert_called()


# ============ delete_xonadon ============

class TestDeleteXonadon:

    @pytest.mark.asyncio
    async def test_delete_success(self):
        """Xonadon o'chirish muvaffaqiyatli."""
        xonadon = _make_xonadon(xonadon_id=1, kocha_id=1)
        db, result = _make_mock_db()

        await xonadon_service.delete_xonadon(db, xonadon)

        db.delete.assert_called_once_with(xonadon)
        db.flush.assert_called_once()


# ============ list_kochalar ============

class TestListKochalar:

    @pytest.mark.asyncio
    async def test_list_all(self):
        """Barcha ko'chalar ro'yxati."""
        k1 = _make_kocha(1, "Navoiy", mfy_id=1)
        k2 = _make_kocha(2, "Mustaqillik", mfy_id=1)
        db, result = _make_mock_db()
        result.all = MagicMock(return_value=[k1, k2])

        kochalar = await xonadon_service.list_kochalar(db)
        assert len(kochalar) == 2
        assert kochalar[0].nomi == "Navoiy"
        assert kochalar[1].nomi == "Mustaqillik"

    @pytest.mark.asyncio
    async def test_list_filter_by_mfy(self):
        """MFY bo'yicha filtrlangan ko'chalar."""
        k1 = _make_kocha(1, "Navoiy", mfy_id=1)
        db, result = _make_mock_db()
        result.all = MagicMock(return_value=[k1])

        kochalar = await xonadon_service.list_kochalar(db, mfy_id=1)
        assert len(kochalar) == 1
        assert kochalar[0].mfy_id == 1


# ============ list_mfylar ============

class TestListMfylar:

    @pytest.mark.asyncio
    async def test_list_all(self):
        """Barcha MFY lar ro'yxati."""
        m1 = _make_mfy(1, 1, "Namuna MFY")
        m2 = _make_mfy(2, 2, "Yangi hayot MFY")
        db, result = _make_mock_db()
        # SELECT (Mfy, ST_AsGeoJSON(chegara)) — satrlar (mfy, geojson_str) ko'rinishida
        result.all = MagicMock(return_value=[(m1, None), (m2, None)])

        mfylar = await xonadon_service.list_mfylar(db)
        assert len(mfylar) == 2
        assert mfylar[0].nomi == "Namuna MFY"
        assert mfylar[1].nomi == "Yangi hayot MFY"
        # chegara NULL — GeoJSON None
        assert mfylar[0].chegara_geojson is None
        assert mfylar[1].chegara_geojson is None

    @pytest.mark.asyncio
    async def test_chegara_geojson_parsed(self):
        """ST_AsGeoJSON satri GeoJSON dict ga o'tkaziladi."""
        geojson_str = '{"type":"Polygon","coordinates":[[[71.0,40.0],[71.1,40.0],[71.1,40.1],[71.0,40.1],[71.0,40.0]]]}'
        m1 = _make_mfy(1, 1, "Namuna MFY")
        db, result = _make_mock_db()
        result.all = MagicMock(return_value=[(m1, geojson_str)])

        mfylar = await xonadon_service.list_mfylar(db)
        chegara = mfylar[0].chegara_geojson
        assert chegara["type"] == "Polygon"
        assert chegara["coordinates"][0][0] == [71.0, 40.0]


# ============ _update_mfy_xonadon_count ============

class TestUpdateMfyXonadonCount:

    @pytest.mark.asyncio
    async def test_update_count(self):
        """MFY dagi xonadon soni yangilanadi."""
        mfy = _make_mfy(mfy_id=3)
        db, result = _make_mock_db()
        result.scalar = MagicMock(return_value=15)
        db.get = AsyncMock(return_value=mfy)

        await xonadon_service._update_mfy_xonadon_count(db, mfy_id=3)

        assert mfy.xonadon_soni == 15
        db.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_count_mfy_not_found(self):
        """MFY topilmasa xatolik chiqmaydi."""
        db, result = _make_mock_db()
        result.scalar = MagicMock(return_value=10)
        db.get = AsyncMock(return_value=None)

        await xonadon_service._update_mfy_xonadon_count(db, mfy_id=999)

        db.flush.assert_not_called()


# ============ _xonadon_to_response ============

class TestXonadonToResponse:

    def _make_user(self, rol, mfy_ids=None):
        """Maskalash testlari uchun mock foydalanuvchi."""
        from app.models.user import User, UserRole
        u = MagicMock(spec=User)
        u.id = 1
        u.rol = rol
        u.xodim_mfylar = [MagicMock(mfy_id=i) for i in (mfy_ids or [])]
        return u

    def test_full_response(self):
        """Barcha maydonlar to'ldirilgan javob (rahbar — egasi ko'rinadi)."""
        from app.models.user import UserRole
        xonadon = _make_xonadon(1, 1, "12")
        xonadon.muammolar = [
            _make_muammo(1, MuammoStatus.ochiq),
            _make_muammo(2, MuammoStatus.jarayonda),
            _make_muammo(3, MuammoStatus.yopilgan),
        ]

        resp = xonadon_service._xonadon_to_response(xonadon, self._make_user(UserRole.rahbar))

        assert resp["id"] == 1
        assert resp["kocha_id"] == 1
        assert resp["uy_raqami"] == "12"
        assert resp["lat"] == 41.123
        assert resp["lng"] == 69.456
        assert resp["egasi_fio"] == "Ali Valiyev"
        assert resp["egasi_tel"] == "+998901234567"
        assert resp["izoh"] == "Test xonadon"
        assert resp["yaratilgan"] is not None
        assert resp["full_address"] is not None
        assert resp["kocha_nomi"] == "Navoiy"
        assert resp["mfy_nomi"] == "Namuna MFY"
        assert resp["mfy_id"] == 1
        assert resp["ochiq_muammolar_soni"] == 2  # ochiq + jarayonda = 2

    def test_minimal_response(self):
        """Minimal maydonlar bilan javob (None'lar)."""
        xonadon = _make_xonadon(1, 1, "12")
        xonadon.lat = None
        xonadon.lng = None
        xonadon.egasi_fio = None
        xonadon.egasi_tel = None
        xonadon.izoh = None
        xonadon.yaratilgan = None
        xonadon.kocha = None
        xonadon.muammolar = []

        resp = xonadon_service._xonadon_to_response(xonadon)

        assert resp["lat"] is None
        assert resp["lng"] is None
        assert resp["egasi_fio"] is None
        assert resp["egasi_tel"] is None
        assert resp["izoh"] is None
        assert resp["yaratilgan"] is None
        assert resp["kocha_nomi"] is None
        assert resp["mfy_nomi"] is None
        assert resp["mfy_id"] is None
        assert resp["ochiq_muammolar_soni"] == 0

    def test_ochiq_muammolar_count(self):
        """Faqat ochiq/jarayonda statuslari hisoblanadi."""
        from app.models.user import UserRole
        xonadon = _make_xonadon(1, 1, "12")
        xonadon.muammolar = [
            _make_muammo(1, MuammoStatus.ochiq),
            _make_muammo(2, MuammoStatus.jarayonda),
            _make_muammo(3, MuammoStatus.yopilgan),
            _make_muammo(4, MuammoStatus.muddati_otgan),
        ]

        resp = xonadon_service._xonadon_to_response(xonadon, self._make_user(UserRole.superadmin))

        # Only ochiq and jarayonda are counted — yopilgan and muddati_otgan excluded
        assert resp["ochiq_muammolar_soni"] == 2

    def test_egasi_masked_for_xodim_other_mfy(self):
        """Boshqa MFY xodimi uchun egasi ma'lumotlari yashiriladi."""
        from app.models.user import UserRole
        xonadon = _make_xonadon(1, 1, "12")  # kocha.mfy_id = 1

        resp = xonadon_service._xonadon_to_response(
            xonadon, self._make_user(UserRole.xodim, mfy_ids=[2, 3]),
        )

        assert resp["egasi_fio"] is None
        assert resp["egasi_tel"] is None

    def test_egasi_visible_for_xodim_own_mfy(self):
        """Shu MFY ga biriktirilgan xodim egasi ma'lumotlarini ko'radi."""
        from app.models.user import UserRole
        xonadon = _make_xonadon(1, 1, "12")  # kocha.mfy_id = 1

        resp = xonadon_service._xonadon_to_response(
            xonadon, self._make_user(UserRole.xodim, mfy_ids=[1]),
        )

        assert resp["egasi_fio"] == "Ali Valiyev"
        assert resp["egasi_tel"] == "+998901234567"

    def test_egasi_masked_without_user(self):
        """Foydalanuvchi berilmasa egasi ma'lumotlari yashiriladi."""
        xonadon = _make_xonadon(1, 1, "12")

        resp = xonadon_service._xonadon_to_response(xonadon)

        assert resp["egasi_fio"] is None
        assert resp["egasi_tel"] is None
