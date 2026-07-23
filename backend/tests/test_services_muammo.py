"""
XAVFSIZ XONADON — Muammo xizmati testlari.
Mock AsyncSession bilan biznes-logika birlik testlari.
"""
import pytest
from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from app.models.muammo import Muammo, Foto, MuammoStatus, MuammoTuri, XavfDarajasi, FotoTuri
from app.models.hudud import Xonadon
from app.models.user import User, UserRole
from app.core.exceptions import NotFoundException, ValidationException
from app.services import muammo as muammo_service


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

    # Override any method
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
    return db, result


def _make_xonadon(xonadon_id=1):
    x = MagicMock(spec=Xonadon)
    x.id = xonadon_id
    x.uy_raqami = "12"
    x.full_address = "Namuna MFY, Navoiy ko'chasi, 12-uy"
    x.kocha = MagicMock()
    x.kocha.nomi = "Navoiy"
    x.kocha.mfy = MagicMock()
    x.kocha.mfy.id = 1
    x.kocha.mfy.nomi = "Namuna"
    return x


def _make_xodim(xodim_id=1, rol=UserRole.xodim):
    u = MagicMock(spec=User)
    u.id = xodim_id
    u.guvohnoma_raqami = "XODIM001"
    u.rol = rol
    u.full_name = "Karimov Akmal Alievich"
    return u


def _make_muammo(**kwargs):
    defaults = {
        "id": 1,
        "xonadon_id": 1,
        "xodim_id": 1,
        "turi": MuammoTuri.ochiq_elektr_simi,
        "tavsif": "Sim ochiq holatda",
        "xavf": XavfDarajasi.yuqori,
        "status": MuammoStatus.ochiq,
        "ornida_bartaraf": False,
        "muddat": None,
        "muddat_belgilagan_id": None,
        "tashkilot": None,
        "tashkilotga_sana": None,
        "lat": 40.123,
        "lng": 71.456,
        "gps_aniqlik": 5.0,
        "mock_gps": False,
        "shubhali": False,
        "client_uuid": uuid4(),
        "qurilma_vaqti": datetime(2026, 7, 14, 10, 0, 0, tzinfo=timezone.utc),
        "sinxron_vaqti": datetime(2026, 7, 14, 10, 0, 1, tzinfo=timezone.utc),
        "yopilgan_sana": None,
        "yopgan_id": None,
        "fotolar": [],
        "xonadon": None,
        "xodim": None,
    }
    defaults.update(kwargs)
    m = MagicMock(spec=Muammo)
    for k, v in defaults.items():
        setattr(m, k, v)
    # Properties
    type(m).turi_nomi = property(lambda self: "Ochiq elektr simi" if self.turi == MuammoTuri.ochiq_elektr_simi else str(self.turi))
    type(m).muddat_qolgan_kun = property(lambda self: None if self.muddat is None else (self.muddat - date.today()).days)
    return m


# ============ create_muammo ============

class TestCreateMuammo:
    """Muammo yaratish testlari."""

    @pytest.mark.asyncio
    async def test_create_success(self):
        """Muvaffaqiyatli muammo yaratish."""
        xonadon = _make_xonadon(1)
        xodim = _make_xodim(1)
        client_uuid = str(uuid4())

        db, result = _make_mock_db()
        result.scalar_one_or_none = MagicMock(side_effect=[xonadon, None])  # xonadon topildi, client_uuid yo'q

        m, dublikat = await muammo_service.create_muammo(
            db, xodim,
            xonadon_id=1,
            turi="ochiq_elektr_simi",
            tavsif="Sim ochiq",
            xavf="yuqori",
            lat=40.1, lng=71.4,
            gps_aniqlik=5.0,
            mock_gps=False,
            client_uuid=client_uuid,
            qurilma_vaqti=datetime(2026, 7, 14, 10, 0, tzinfo=timezone.utc),
            muddat=date(2026, 8, 1),
        )

        db.add.assert_called_once()
        db.flush.assert_called_once()
        db.refresh.assert_called_once()
        assert m is not None
        assert dublikat is False

    @pytest.mark.asyncio
    async def test_create_xonadon_not_found(self):
        """Xonadon topilmasa xatolik."""
        db, result = _make_mock_db()
        result.scalar_one_or_none = MagicMock(return_value=None)

        with pytest.raises(NotFoundException, match="Xonadon"):
            await muammo_service.create_muammo(
                db, _make_xodim(),
                xonadon_id=999,
                turi="ochiq_elektr_simi",
                tavsif="Test",
                xavf="orta",
                lat=40.1, lng=71.4,
                gps_aniqlik=None,
                mock_gps=False,
                client_uuid=str(uuid4()),
                qurilma_vaqti=datetime(2026, 7, 14, 10, 0, tzinfo=timezone.utc),
            )

    @pytest.mark.asyncio
    async def test_duplicate_client_uuid_idempotent(self):
        """Takrorlangan client_uuid — xato emas, mavjud muammo dublikat=True bilan qaytariladi."""
        xonadon = _make_xonadon()
        existing = _make_muammo()

        db, result = _make_mock_db()
        result.scalar_one_or_none = MagicMock(side_effect=[xonadon, existing])

        m, dublikat = await muammo_service.create_muammo(
            db, _make_xodim(),
            xonadon_id=1,
            turi="gaz_hidi",
            tavsif="Test",
            xavf="kritik",
            lat=40.1, lng=71.4,
            gps_aniqlik=None,
            mock_gps=False,
            client_uuid=str(uuid4()),
            qurilma_vaqti=datetime(2026, 7, 14, 10, 0, tzinfo=timezone.utc),
        )

        assert m is existing
        assert dublikat is True
        db.add.assert_not_called()

    @pytest.mark.asyncio
    async def test_mock_gps_flags_shubhali(self):
        """mock_gps=True bo'lsa shubhali=True."""
        xonadon = _make_xonadon()
        db, result = _make_mock_db()
        result.scalar_one_or_none = MagicMock(side_effect=[xonadon, None])

        m, _ = await muammo_service.create_muammo(
            db, _make_xodim(),
            xonadon_id=1,
            turi="ochiq_elektr_simi",
            tavsif="Test",
            xavf="orta",
            lat=40.1, lng=71.4,
            gps_aniqlik=5.0,
            mock_gps=True,
            client_uuid=str(uuid4()),
            qurilma_vaqti=datetime(2026, 7, 14, 10, 0, tzinfo=timezone.utc),
            muddat=date(2026, 8, 1),
        )
        assert m.shubhali is True

    @pytest.mark.asyncio
    async def test_low_gps_accuracy_flags_shubhali(self):
        """GPS aniqlik > 100m bo'lsa shubhali=True."""
        xonadon = _make_xonadon()
        db, result = _make_mock_db()
        result.scalar_one_or_none = MagicMock(side_effect=[xonadon, None])

        m, _ = await muammo_service.create_muammo(
            db, _make_xodim(),
            xonadon_id=1,
            turi="elektr_shchit_nosoz",
            tavsif="Test",
            xavf="yuqori",
            lat=40.1, lng=71.4,
            gps_aniqlik=150.0,  # > 100
            mock_gps=False,
            client_uuid=str(uuid4()),
            qurilma_vaqti=datetime(2026, 7, 14, 10, 0, tzinfo=timezone.utc),
            muddat=date(2026, 8, 1),
        )
        assert m.shubhali is True

    @pytest.mark.asyncio
    async def test_good_gps_not_shubhali(self):
        """GPS aniqlik yaxshi, mock_gps=False → shubhali=False."""
        xonadon = _make_xonadon()
        db, result = _make_mock_db()
        result.scalar_one_or_none = MagicMock(side_effect=[xonadon, None])

        m, _ = await muammo_service.create_muammo(
            db, _make_xodim(),
            xonadon_id=1,
            turi="isitish_uskunasi",
            tavsif="Test",
            xavf="past",
            lat=40.1, lng=71.4,
            gps_aniqlik=10.0,
            mock_gps=False,
            client_uuid=str(uuid4()),
            qurilma_vaqti=datetime(2026, 7, 14, 10, 0, tzinfo=timezone.utc),
            muddat=date(2026, 8, 1),
        )
        assert m.shubhali is False


# ============ get_muammo ============

class TestGetMuammo:

    @pytest.mark.asyncio
    async def test_get_success(self):
        """Muammo topilganda qaytariladi."""
        expected = _make_muammo(id=5)

        db, result = _make_mock_db()
        result.scalar_one_or_none = MagicMock(return_value=expected)

        m = await muammo_service.get_muammo(db, 5)
        assert m is expected

    @pytest.mark.asyncio
    async def test_get_not_found(self):
        """Muammo topilmasa NotFoundException."""
        db, result = _make_mock_db()
        result.scalar_one_or_none = MagicMock(return_value=None)

        with pytest.raises(NotFoundException, match="Muammo"):
            await muammo_service.get_muammo(db, 999)


# ============ list_muammolar ============

class TestListMuammolar:

    @pytest.mark.asyncio
    async def test_empty_list(self):
        """Bo'sh ro'yxat qaytariladi."""
        db, result = _make_mock_db()
        # result already defaults to scalar()=0 and all()=[]

        items, total = await muammo_service.list_muammolar(db)
        assert items == []
        assert total == 0

    @pytest.mark.asyncio
    async def test_with_items(self):
        """Elementlar bor ro'yxat."""
        m1 = _make_muammo(id=1)
        m2 = _make_muammo(id=2)

        db, result = _make_mock_db()
        result.scalar = MagicMock(return_value=2)
        result.all = MagicMock(return_value=[m1, m2])

        items, total = await muammo_service.list_muammolar(db)
        assert len(items) == 2
        assert total == 2

    @pytest.mark.asyncio
    async def test_with_status_filter(self):
        """Status bo'yicha filtrlash."""
        db, result = _make_mock_db()
        result.scalar = MagicMock(return_value=1)
        result.all = MagicMock(return_value=[_make_muammo()])

        items, total = await muammo_service.list_muammolar(db, status="ochiq")
        assert total == 1
        assert len(items) == 1

    @pytest.mark.asyncio
    async def test_pagination_page_2(self):
        """2-sahifa so'ralganda offset to'g'ri."""
        db, result = _make_mock_db()
        result.scalar = MagicMock(return_value=25)
        result.all = MagicMock(return_value=[_make_muammo() for _ in range(5)])

        items, total = await muammo_service.list_muammolar(db, page=2, size=20)
        assert total == 25
        assert len(items) == 5

    @pytest.mark.asyncio
    async def test_invalid_enum_values_ignored(self):
        """Noto'g'ri ENUM qiymatlari ValueError bo'lsa filtr qo'shilmaydi."""
        db, result = _make_mock_db()
        result.scalar = MagicMock(return_value=0)
        result.all = MagicMock(return_value=[])

        # no'to'g'ri status — try/except ichida, ValueError ignor qilinadi
        items, total = await muammo_service.list_muammolar(db, status="nomalum_status")
        assert total == 0

    @pytest.mark.asyncio
    async def test_xodim_filter(self):
        """Xodim_id bo'yicha filtrlash."""
        db, result = _make_mock_db()
        result.scalar = MagicMock(return_value=3)
        result.all = MagicMock(return_value=[_make_muammo() for _ in range(3)])

        items, total = await muammo_service.list_muammolar(db, xodim_id=5)
        assert total == 3

    @pytest.mark.asyncio
    async def test_shubhali_filter(self):
        """Shubhali=True bo'yicha filtrlash."""
        db, result = _make_mock_db()
        result.scalar = MagicMock(return_value=2)
        result.all = MagicMock(return_value=[_make_muammo(shubhali=True) for _ in range(2)])

        items, total = await muammo_service.list_muammolar(db, shubhali=True)
        assert total == 2

    @pytest.mark.asyncio
    async def test_ornida_bartaraf_filter(self):
        """Ornida bartaraf=False bo'yicha filtrlash."""
        db, result = _make_mock_db()
        result.scalar = MagicMock(return_value=4)
        result.all = MagicMock(return_value=[_make_muammo() for _ in range(4)])

        items, total = await muammo_service.list_muammolar(db, ornida_bartaraf=False)
        assert total == 4

    @pytest.mark.asyncio
    async def test_date_range_filter(self):
        """Sana oralig'i bo'yicha filtrlash."""
        db, result = _make_mock_db()
        result.scalar = MagicMock(return_value=1)
        result.all = MagicMock(return_value=[_make_muammo()])

        items, total = await muammo_service.list_muammolar(
            db,
            sana_dan=date(2026, 7, 1),
            sana_gacha=date(2026, 7, 31),
        )
        assert total == 1


# ============ update_muammo ============

class TestUpdateMuammo:

    def test_update_status_to_yopilgan(self):
        """Status yopilgan bo'lsa, yopilgan_sana va yopgan_id o'rnatiladi."""
        import asyncio
        from unittest.mock import AsyncMock

        muammo = _make_muammo()
        yangilovchi = _make_xodim(xodim_id=2)
        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()

        async def run():
            return await muammo_service.update_muammo(
                db, muammo, yangilovchi,
                status="yopilgan",
            )

        m = asyncio.run(run())
        assert m.status == MuammoStatus.yopilgan
        assert m.yopilgan_sana is not None
        assert m.yopgan_id == 2

    def test_update_status_invalid(self):
        """Noto'g'ri status — ValidationException."""
        import asyncio
        from unittest.mock import AsyncMock

        muammo = _make_muammo()
        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()

        async def run():
            return await muammo_service.update_muammo(
                db, muammo, _make_xodim(),
                status="nomalum",
            )

        with pytest.raises(ValidationException, match="status"):
            asyncio.run(run())

    def test_update_xavf(self):
        """Xavf darajasini yangilash."""
        import asyncio
        from unittest.mock import AsyncMock

        muammo = _make_muammo(xavf=XavfDarajasi.past)
        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()

        async def run():
            return await muammo_service.update_muammo(
                db, muammo, _make_xodim(),
                xavf="kritik",
            )

        m = asyncio.run(run())
        assert m.xavf == XavfDarajasi.kritik

    def test_update_xavf_invalid(self):
        """Noto'g'ri xavf darajasi — ValidationException."""
        import asyncio
        from unittest.mock import AsyncMock

        muammo = _make_muammo()
        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()

        async def run():
            return await muammo_service.update_muammo(
                db, muammo, _make_xodim(),
                xavf="ultra",
            )

        with pytest.raises(ValidationException, match="xavf"):
            asyncio.run(run())

    def test_update_tashkilot(self):
        """Tashkilotga yo'naltirilganda sana o'rnatiladi."""
        import asyncio
        from unittest.mock import AsyncMock

        muammo = _make_muammo()
        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()

        async def run():
            return await muammo_service.update_muammo(
                db, muammo, _make_xodim(),
                tashkilot="Gaz ta'minoti",
            )

        m = asyncio.run(run())
        assert m.tashkilot == "Gaz ta'minoti"
        assert m.tashkilotga_sana is not None

    def test_update_muddat(self):
        """Muddat belgilansa muddat_belgilagan_id o'rnatiladi."""
        import asyncio
        from unittest.mock import AsyncMock

        muammo = _make_muammo()
        yangilovchi = _make_xodim(xodim_id=5)
        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()

        async def run():
            return await muammo_service.update_muammo(
                db, muammo, yangilovchi,
                muddat=date(2026, 8, 1),
            )

        m = asyncio.run(run())
        assert m.muddat == date(2026, 8, 1)
        assert m.muddat_belgilagan_id == 5

    def test_update_multiple_fields(self):
        """Bir nechta maydonni birdaniga yangilash."""
        import asyncio
        from unittest.mock import AsyncMock

        muammo = _make_muammo()
        db = AsyncMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()

        async def run():
            return await muammo_service.update_muammo(
                db, muammo, _make_xodim(),
                status="jarayonda",
                ornida_bartaraf=False,
                tashkilot="Yong'in xavfsizligi",
            )

        m = asyncio.run(run())
        assert m.status == MuammoStatus.jarayonda
        assert m.ornida_bartaraf is False
        assert m.tashkilot == "Yong'in xavfsizligi"


# ============ add_fotos_to_muammo ============

class TestAddFotosToMuammo:

    def _make_foto_db(self, dup_rows=None):
        """Foto bog'lash uchun mock db — dublikat so'rov natijasi boshqariladi."""
        db = AsyncMock()
        db.add = MagicMock()
        db.flush = AsyncMock()
        db.refresh = AsyncMock()
        result = MagicMock()
        result.all = MagicMock(return_value=dup_rows or [])
        db.execute = AsyncMock(return_value=result)
        return db

    @pytest.mark.asyncio
    async def test_add_single_foto(self):
        """Bitta foto qo'shish."""
        muammo = _make_muammo(id=1)
        db = self._make_foto_db()

        fotos = await muammo_service.add_fotos_to_muammo(
            db, muammo,
            [{"turi": "keyin", "fayl_yoli": "uploads/foto1.jpg", "sha256": "a" * 64}],
        )
        assert len(fotos) == 1
        assert db.add.call_count == 1
        assert muammo.shubhali is False

    @pytest.mark.asyncio
    async def test_add_multiple_fotos(self):
        """Bir nechta foto qo'shish."""
        muammo = _make_muammo(id=1)
        db = self._make_foto_db()

        foto_data = [
            {"turi": "oldin", "fayl_yoli": "uploads/a.jpg", "sha256": "a" * 64},
            {"turi": "keyin", "fayl_yoli": "uploads/b.jpg", "sha256": "b" * 64},
            {"turi": "keyin", "fayl_yoli": "uploads/c.jpg", "sha256": "c" * 64},
        ]

        fotos = await muammo_service.add_fotos_to_muammo(db, muammo, foto_data)
        assert len(fotos) == 3
        assert db.add.call_count == 3

    @pytest.mark.asyncio
    async def test_duplicate_sha256_flags_shubhali(self):
        """Boshqa muammoga bog'langan foto bilan bir xil sha256 — shubhali=True."""
        muammo = _make_muammo(id=1)
        dup_row = MagicMock()
        dup_row.sha256 = "a" * 64
        dup_row.muammo_id = 2  # boshqa muammo
        db = self._make_foto_db(dup_rows=[dup_row])

        await muammo_service.add_fotos_to_muammo(
            db, muammo,
            [{"turi": "keyin", "fayl_yoli": "uploads/foto1.jpg", "sha256": "a" * 64}],
        )
        assert muammo.shubhali is True

    @pytest.mark.asyncio
    async def test_exif_far_from_muammo_flags_shubhali(self):
        """EXIF GPS muammo koordinatasidan 200 m dan uzoq — shubhali=True."""
        muammo = _make_muammo(id=1, lat=40.123, lng=71.456)
        db = self._make_foto_db()

        await muammo_service.add_fotos_to_muammo(
            db, muammo,
            [{
                "turi": "keyin", "fayl_yoli": "uploads/f.jpg", "sha256": "d" * 64,
                # ~111 km uzoqlikda
                "exif_lat": 41.123, "exif_lng": 71.456,
            }],
        )
        assert muammo.shubhali is True

    @pytest.mark.asyncio
    async def test_exif_near_muammo_not_shubhali(self):
        """EXIF GPS muammo koordinatasiga yaqin (200 m ichida) — shubhali=False."""
        muammo = _make_muammo(id=1, lat=40.123, lng=71.456)
        db = self._make_foto_db()

        await muammo_service.add_fotos_to_muammo(
            db, muammo,
            [{
                "turi": "keyin", "fayl_yoli": "uploads/f.jpg", "sha256": "e" * 64,
                # ~10-15 m farq
                "exif_lat": 40.1231, "exif_lng": 71.4561,
            }],
        )
        assert muammo.shubhali is False

    @pytest.mark.asyncio
    async def test_exif_vaqt_parsed(self):
        """EXIF vaqt satri datetime ga o'tkazilib saqlanadi."""
        muammo = _make_muammo(id=1)
        db = self._make_foto_db()

        fotos = await muammo_service.add_fotos_to_muammo(
            db, muammo,
            [{
                "turi": "keyin", "fayl_yoli": "uploads/f.jpg", "sha256": "f" * 64,
                "exif_vaqt": "2026:07:14 10:30:00",
            }],
        )
        foto = fotos[0]
        assert isinstance(foto.exif_vaqt, datetime)
        assert foto.exif_vaqt.year == 2026
        assert foto.exif_vaqt.month == 7


# ============ xarita_muammolar ============

class TestXaritaMuammolar:

    def _make_row(self, id=1, lat=40.1, lng=71.4, shubhali=False):
        row = MagicMock()
        row.id = id
        row.turi = MuammoTuri.gaz_hidi
        row.status = MuammoStatus.ochiq
        row.xavf = XavfDarajasi.yuqori
        row.lat = lat
        row.lng = lng
        row.shubhali = shubhali
        return row

    @pytest.mark.asyncio
    async def test_returns_geojson_features(self):
        """GeoJSON feature ro'yxati qaytariladi."""
        db = AsyncMock()
        result = MagicMock()
        result.all = MagicMock(return_value=[self._make_row(id=1), self._make_row(id=2)])
        db.execute = AsyncMock(return_value=result)

        features = await muammo_service.xarita_muammolar(
            db, min_lng=71.0, min_lat=40.0, max_lng=72.0, max_lat=41.0,
        )
        assert len(features) == 2
        f = features[0]
        assert f["type"] == "Feature"
        assert f["geometry"]["type"] == "Point"
        assert f["geometry"]["coordinates"] == [71.4, 40.1]
        assert f["properties"]["id"] == 1
        assert f["properties"]["turi"] == "gaz_hidi"
        assert f["properties"]["status"] == "ochiq"
        assert f["properties"]["xavf"] == "yuqori"
        assert f["properties"]["shubhali"] is False

    @pytest.mark.asyncio
    async def test_empty_bbox_result(self):
        """Bo'sh natija — bo'sh ro'yxat."""
        db = AsyncMock()
        result = MagicMock()
        result.all = MagicMock(return_value=[])
        db.execute = AsyncMock(return_value=result)

        features = await muammo_service.xarita_muammolar(
            db, min_lng=71.0, min_lat=40.0, max_lng=72.0, max_lat=41.0,
        )
        assert features == []

    @pytest.mark.asyncio
    async def test_invalid_status_ignored(self):
        """Noto'g'ri status filtri xatolik tashlamaydi."""
        db = AsyncMock()
        result = MagicMock()
        result.all = MagicMock(return_value=[])
        db.execute = AsyncMock(return_value=result)

        features = await muammo_service.xarita_muammolar(
            db, min_lng=71.0, min_lat=40.0, max_lng=72.0, max_lat=41.0,
            status="nomalum_status",
        )
        assert features == []


# ============ _muammo_to_response ============

class TestMuammoToResponse:

    def test_full_response(self):
        """Barcha maydonlar to'ldirilgan javob."""
        xonadon = _make_xonadon()
        xodim = _make_xodim()
        foto1 = MagicMock(spec=Foto)
        foto1.id = 1
        foto1.turi = FotoTuri.oldin
        foto1.fayl_yoli = "uploads/1.jpg"
        foto1.yuklangan = datetime(2026, 7, 14, 10, 0, tzinfo=timezone.utc)

        muammo = _make_muammo(
            id=42,
            xonadon_id=1,
            xodim_id=1,
            turi=MuammoTuri.gaz_hidi,
            tavsif="Gaz hidi aniqlandi",
            xavf=XavfDarajasi.kritik,
            status=MuammoStatus.ochiq,
            muddat=date(2026, 8, 1),
            fotolar=[foto1],
            xonadon=xonadon,
            xodim=xodim,
        )

        resp = muammo_service._muammo_to_response(muammo)

        assert resp["id"] == 42
        assert resp["xonadon_id"] == 1
        assert resp["xodim_id"] == 1
        assert resp["turi"] == "gaz_hidi"
        assert resp["turi_nomi"] is not None
        assert resp["tavsif"] == "Gaz hidi aniqlandi"
        assert resp["xavf"] == "kritik"
        assert resp["status"] == "ochiq"
        assert resp["ornida_bartaraf"] is False
        assert resp["muddat"] == "2026-08-01"
        assert resp["shubhali"] is False
        assert resp["client_uuid"] is not None
        assert resp["lat"] == 40.123
        assert resp["lng"] == 71.456
        assert resp["gps_aniqlik"] == 5.0
        assert len(resp["fotolar"]) == 1
        assert resp["fotolar"][0]["turi"] == "oldin"
        assert resp["fotolar"][0]["fayl_yoli"] == "uploads/1.jpg"
        assert resp["xonadon_manzili"] == "Namuna MFY, Navoiy ko'chasi, 12-uy"
        assert resp["xodim_fio"] == "Karimov Akmal Alievich"

    def test_minimal_response(self):
        """Minimal maydonlar bilan javob (None'lar)."""
        muammo = _make_muammo(
            id=1,
            tavsif=None,
            muddat=None,
            gps_aniqlik=None,
            tashkilot=None,
            tashkilotga_sana=None,
            yopilgan_sana=None,
            xonadon=None,
            xodim=None,
            fotolar=[],
        )

        resp = muammo_service._muammo_to_response(muammo)

        assert resp["tavsif"] is None
        assert resp["muddat"] is None
        assert resp["muddat_qolgan_kun"] is None
        assert resp["gps_aniqlik"] is None
        assert resp["tashkilot"] is None
        assert resp["tashkilotga_sana"] is None
        assert resp["yopilgan_sana"] is None
        assert resp["xonadon_manzili"] is None
        assert resp["xodim_fio"] is None
        assert resp["fotolar"] == []
