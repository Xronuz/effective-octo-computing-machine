"""
XAVFSIZ XONADON — Topshiriq va Intizom xizmati testlari.
Mock AsyncSession bilan biznes-logika birlik testlari.
"""

import pytest
from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, MagicMock

from app.services import topshiriq_intizom as ti_service
from app.models.audit import Topshiriq, Intizom, TopshiriqStatus, IntizomTuri
from app.models.user import User
from app.core.exceptions import NotFoundException


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

    if "execute_return" not in overrides:
        db.execute = AsyncMock(return_value=result)

    db.add = MagicMock()
    db.flush = AsyncMock()
    db.refresh = AsyncMock()
    return db, result


def _make_mock_user(user_id=1, full_name="Ali Valiyev"):
    """Mock User yaratish."""
    u = MagicMock(spec=User)
    u.id = user_id
    u.full_name = full_name
    return u


def _make_mock_topshiriq(**overrides):
    """Mock Topshiriq — spec bilan."""
    t = MagicMock(spec=Topshiriq)
    t.id = overrides.get("id", 1)
    t.rahbar_id = overrides.get("rahbar_id", 10)
    t.xodim_id = overrides.get("xodim_id", 20)
    t.mfy_id = overrides.get("mfy_id", None)
    t.muammo_id = overrides.get("muammo_id", None)
    t.sarlavha = overrides.get("sarlavha", "Test")
    t.matn = overrides.get("matn", None)
    t.muddat = overrides.get("muddat", date.today())
    t.status = overrides.get("status", TopshiriqStatus.yangi)
    t.yaratilgan = overrides.get("yaratilgan", datetime(2026, 1, 1, tzinfo=timezone.utc))
    t.korilgan = overrides.get("korilgan", None)
    t.bajarilgan = overrides.get("bajarilgan", None)
    t.rahbar = overrides.get("rahbar", _make_mock_user(10, "Rahbar FIO"))
    t.xodim = overrides.get("xodim", _make_mock_user(20, "Xodim FIO"))
    t.mfy = overrides.get("mfy", None)
    t.muammo = overrides.get("muammo", None)
    return t


def _make_mock_intizom(**overrides):
    """Mock Intizom — spec bilan."""
    i = MagicMock(spec=Intizom)
    i.id = overrides.get("id", 1)
    i.xodim_id = overrides.get("xodim_id", 20)
    i.muammo_id = overrides.get("muammo_id", None)
    i.turi = overrides.get("turi", IntizomTuri.ogohlantirish)
    i.sabab = overrides.get("sabab", "Test sabab")
    i.bergan_id = overrides.get("bergan_id", 10)
    i.sana = overrides.get("sana", datetime(2026, 1, 1, tzinfo=timezone.utc))
    i.xodim = overrides.get("xodim", _make_mock_user(20, "Xodim FIO"))
    i.bergan = overrides.get("bergan", _make_mock_user(10, "Bergan FIO"))
    return i


# ============================================================
# create_topshiriq
# ============================================================

class TestCreateTopshiriq:
    """Topshiriq yaratish testlari."""

    @pytest.mark.asyncio
    async def test_create_topshiriq_success(self):
        """Muvaffaqiyatli topshiriq yaratish."""
        db, result = _make_mock_db()
        mock_user = _make_mock_user(1)
        result.scalar_one_or_none.return_value = mock_user

        result_obj = await ti_service.create_topshiriq(
            db=db,
            rahbar_id=1,
            xodim_id=1,
            sarlavha="Test sarlavha",
            matn="Test matn",
            muddat=date.today(),
        )

        assert isinstance(result_obj, Topshiriq)
        assert result_obj.sarlavha == "Test sarlavha"
        assert result_obj.matn == "Test matn"
        assert result_obj.muddat == date.today()
        assert result_obj.status == TopshiriqStatus.yangi
        assert result_obj.rahbar_id == 1
        assert result_obj.xodim_id == 1
        db.add.assert_called_once()
        db.flush.assert_awaited_once()
        db.refresh.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_create_topshiriq_xodim_not_found(self):
        """Mavjud bo'lmagan xodimga topshiriq — NotFoundException."""
        db, result = _make_mock_db()
        result.scalar_one_or_none.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            await ti_service.create_topshiriq(
                db=db, rahbar_id=1, xodim_id=999,
                sarlavha="Test", muddat=date.today(),
            )

        assert "Xodim" in exc_info.value.xato
        db.add.assert_not_called()
        db.flush.assert_not_awaited()


# ============================================================
# get_topshiriq
# ============================================================

class TestGetTopshiriq:
    """Topshiriqni olish testlari."""

    @pytest.mark.asyncio
    async def test_get_topshiriq_success(self):
        """ID bo'yicha topshiriqni olish."""
        db, result = _make_mock_db()
        mock_topshiriq = _make_mock_topshiriq(id=1)
        result.scalar_one_or_none.return_value = mock_topshiriq

        result_obj = await ti_service.get_topshiriq(db=db, topshiriq_id=1)

        assert result_obj == mock_topshiriq
        db.add.assert_not_called()

    @pytest.mark.asyncio
    async def test_get_topshiriq_not_found(self):
        """Topshiriq topilmadi — NotFoundException."""
        db, result = _make_mock_db()
        result.scalar_one_or_none.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            await ti_service.get_topshiriq(db=db, topshiriq_id=999)

        assert "Topshiriq" in exc_info.value.xato


# ============================================================
# list_topshiriqlar
# ============================================================

class TestListTopshiriqlar:
    """Topshiriqlar ro'yxati testlari."""

    @pytest.mark.asyncio
    async def test_list_topshiriqlar_empty(self):
        """Bo'sh ro'yxat."""
        db, result = _make_mock_db()
        count_result = MagicMock()
        count_result.scalar.return_value = 0
        data_result = MagicMock()
        data_result.scalars.return_value.all.return_value = []
        db.execute.side_effect = [count_result, data_result]

        items, total = await ti_service.list_topshiriqlar(db=db)

        assert items == []
        assert total == 0

    @pytest.mark.asyncio
    async def test_list_topshiriqlar_with_items(self):
        """Natijali ro'yxat."""
        db, result = _make_mock_db()
        count_result = MagicMock()
        count_result.scalar.return_value = 5
        data_result = MagicMock()
        mock_items = [_make_mock_topshiriq(id=i) for i in range(1, 4)]
        data_result.scalars.return_value.all.return_value = mock_items
        db.execute.side_effect = [count_result, data_result]

        items, total = await ti_service.list_topshiriqlar(db=db)

        assert len(items) == 3
        assert total == 5

    @pytest.mark.asyncio
    async def test_list_topshiriqlar_with_filters(self):
        """Filtrlar bilan ro'yxat."""
        db, result = _make_mock_db()
        count_result = MagicMock()
        count_result.scalar.return_value = 2
        data_result = MagicMock()
        mock_items = [_make_mock_topshiriq(id=1)]
        data_result.scalars.return_value.all.return_value = mock_items
        db.execute.side_effect = [count_result, data_result]

        items, total = await ti_service.list_topshiriqlar(
            db=db, xodim_id=1, mfy_id=2, status="yangi",
            muddat_dan=date.today(), muddat_gacha=date.today(),
        )

        assert len(items) == 1
        assert total == 2

    @pytest.mark.asyncio
    async def test_list_topshiriqlar_pagination(self):
        """Sahifalash bilan ro'yxat."""
        db, result = _make_mock_db()
        count_result = MagicMock()
        count_result.scalar.return_value = 25
        data_result = MagicMock()
        mock_items = [_make_mock_topshiriq(id=i) for i in range(1, 3)]
        data_result.scalars.return_value.all.return_value = mock_items
        db.execute.side_effect = [count_result, data_result]

        items, total = await ti_service.list_topshiriqlar(db=db, page=2, size=10)

        assert len(items) == 2
        assert total == 25


# ============================================================
# update_topshiriq
# ============================================================

class TestUpdateTopshiriq:
    """Topshiriq statusini yangilash testlari."""

    @pytest.mark.asyncio
    async def test_update_topshiriq_yangi(self):
        """Status yangiga o'tkazish."""
        db, _ = _make_mock_db()
        mock_topshiriq = _make_mock_topshiriq(status=TopshiriqStatus.bajarildi)

        await ti_service.update_topshiriq(db=db, topshiriq=mock_topshiriq, status="yangi")

        assert mock_topshiriq.status == TopshiriqStatus.yangi
        db.flush.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_update_topshiriq_korildi(self):
        """Status ko'rilganga o'tkazish — korilgan vaqt belgilanadi."""
        db, _ = _make_mock_db()
        mock_topshiriq = _make_mock_topshiriq(status=TopshiriqStatus.yangi)
        mock_topshiriq.korilgan = None

        await ti_service.update_topshiriq(db=db, topshiriq=mock_topshiriq, status="korildi")

        assert mock_topshiriq.status == TopshiriqStatus.korildi
        assert isinstance(mock_topshiriq.korilgan, datetime)
        assert mock_topshiriq.bajarilgan is None
        db.flush.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_update_topshiriq_bajarildi(self):
        """Status bajarilganga o'tkazish — bajarilgan vaqt belgilanadi."""
        db, _ = _make_mock_db()
        mock_topshiriq = _make_mock_topshiriq(status=TopshiriqStatus.yangi)
        mock_topshiriq.bajarilgan = None
        mock_topshiriq.korilgan = None

        await ti_service.update_topshiriq(db=db, topshiriq=mock_topshiriq, status="bajarildi")

        assert mock_topshiriq.status == TopshiriqStatus.bajarildi
        assert isinstance(mock_topshiriq.bajarilgan, datetime)
        assert mock_topshiriq.korilgan is None
        db.flush.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_update_topshiriq_kechikkan(self):
        """Status kechikkanga o'tkazish."""
        db, _ = _make_mock_db()
        mock_topshiriq = _make_mock_topshiriq(status=TopshiriqStatus.yangi)

        await ti_service.update_topshiriq(db=db, topshiriq=mock_topshiriq, status="kechikkan")

        assert mock_topshiriq.status == TopshiriqStatus.kechikkan
        db.flush.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_update_topshiriq_invalid_status(self):
        """Noto'g'ri status — ValueError."""
        db, _ = _make_mock_db()
        mock_topshiriq = _make_mock_topshiriq()

        with pytest.raises(ValueError) as exc_info:
            await ti_service.update_topshiriq(db=db, topshiriq=mock_topshiriq, status="invalid")

        assert "status" in str(exc_info.value).lower()
        db.flush.assert_not_awaited()


# ============================================================
# create_intizom
# ============================================================

class TestCreateIntizom:
    """Intizom yaratish testlari."""

    @pytest.mark.asyncio
    async def test_create_intizom_success(self):
        """Muvaffaqiyatli ogohlantirish yaratish."""
        db, result = _make_mock_db()
        mock_user = _make_mock_user(1)
        result.scalar_one_or_none.return_value = mock_user

        result_obj = await ti_service.create_intizom(
            db=db, xodim_id=1, turi="ogohlantirish",
            sabab="Test sabab", bergan_id=2,
        )

        assert isinstance(result_obj, Intizom)
        assert result_obj.turi == IntizomTuri.ogohlantirish
        assert result_obj.sabab == "Test sabab"
        assert result_obj.xodim_id == 1
        assert result_obj.bergan_id == 2
        db.add.assert_called_once()
        db.flush.assert_awaited_once()
        db.refresh.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_create_intizom_hayfsan(self):
        """Hayfsan yaratish."""
        db, result = _make_mock_db()
        mock_user = _make_mock_user(1)
        result.scalar_one_or_none.return_value = mock_user

        result_obj = await ti_service.create_intizom(
            db=db, xodim_id=1, turi="hayfsan",
            sabab="Ishga kelmadi", bergan_id=2,
        )

        assert result_obj.turi == IntizomTuri.hayfsan

    @pytest.mark.asyncio
    async def test_create_intizom_ragbat(self):
        """Rag'bat yaratish."""
        db, result = _make_mock_db()
        mock_user = _make_mock_user(1)
        result.scalar_one_or_none.return_value = mock_user

        result_obj = await ti_service.create_intizom(
            db=db, xodim_id=1, turi="ragbat",
            sabab="Yaxshi ish", bergan_id=2,
        )

        assert result_obj.turi == IntizomTuri.rag_bat

    @pytest.mark.asyncio
    async def test_create_intizom_xodim_not_found(self):
        """Mavjud bo'lmagan xodimga intizom — NotFoundException."""
        db, result = _make_mock_db()
        result.scalar_one_or_none.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            await ti_service.create_intizom(
                db=db, xodim_id=999, turi="ogohlantirish",
                sabab="Test", bergan_id=1,
            )

        assert "Xodim" in exc_info.value.xato
        db.add.assert_not_called()


# ============================================================
# get_intizom
# ============================================================

class TestGetIntizom:
    """Intizomni olish testlari."""

    @pytest.mark.asyncio
    async def test_get_intizom_success(self):
        """ID bo'yicha intizomni olish."""
        db, result = _make_mock_db()
        mock_intizom = _make_mock_intizom(id=1)
        result.scalar_one_or_none.return_value = mock_intizom

        result_obj = await ti_service.get_intizom(db=db, intizom_id=1)

        assert result_obj == mock_intizom

    @pytest.mark.asyncio
    async def test_get_intizom_not_found(self):
        """Intizom topilmadi — NotFoundException."""
        db, result = _make_mock_db()
        result.scalar_one_or_none.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            await ti_service.get_intizom(db=db, intizom_id=999)

        assert "Intizom" in exc_info.value.xato


# ============================================================
# list_intizomlar
# ============================================================

class TestListIntizomlar:
    """Intizomlar ro'yxati testlari."""

    @pytest.mark.asyncio
    async def test_list_intizomlar_empty(self):
        """Bo'sh ro'yxat."""
        db, result = _make_mock_db()
        count_result = MagicMock()
        count_result.scalar.return_value = 0
        data_result = MagicMock()
        data_result.scalars.return_value.all.return_value = []
        db.execute.side_effect = [count_result, data_result]

        items, total = await ti_service.list_intizomlar(db=db)

        assert items == []
        assert total == 0

    @pytest.mark.asyncio
    async def test_list_intizomlar_with_filters(self):
        """Filtrlar bilan ro'yxat."""
        db, result = _make_mock_db()
        count_result = MagicMock()
        count_result.scalar.return_value = 3
        data_result = MagicMock()
        mock_items = [_make_mock_intizom(id=1), _make_mock_intizom(id=2)]
        data_result.scalars.return_value.all.return_value = mock_items
        db.execute.side_effect = [count_result, data_result]

        items, total = await ti_service.list_intizomlar(
            db=db, xodim_id=1, turi="ogohlantirish",
            sana_dan=date.today(), sana_gacha=date.today(),
        )

        assert len(items) == 2
        assert total == 3

    @pytest.mark.asyncio
    async def test_list_intizomlar_pagination(self):
        """Sahifalash bilan ro'yxat."""
        db, result = _make_mock_db()
        count_result = MagicMock()
        count_result.scalar.return_value = 15
        data_result = MagicMock()
        mock_items = [_make_mock_intizom(id=i) for i in range(1, 4)]
        data_result.scalars.return_value.all.return_value = mock_items
        db.execute.side_effect = [count_result, data_result]

        items, total = await ti_service.list_intizomlar(db=db, page=1, size=5)

        assert len(items) == 3
        assert total == 15


# ============================================================
# Helpers
# ============================================================

class TestHelperFunctions:
    """_topshiriq_to_response va _intizom_to_response testlari."""

    def test_topshiriq_to_response(self):
        """Topshiriq → dict formatlash."""
        ts = datetime(2026, 7, 16, 12, 0, 0, tzinfo=timezone.utc)
        mock_mfy = MagicMock()
        mock_mfy.nomi = "Namuna MFY"

        mock_topshiriq = _make_mock_topshiriq(
            id=1, sarlavha="Test sarlavha", matn="Test matn",
            muddat=date(2026, 8, 1), status=TopshiriqStatus.bajarildi,
            rahbar_id=10, xodim_id=20, mfy_id=3,
            yaratilgan=ts, korilgan=ts, bajarilgan=ts,
            rahbar=_make_mock_user(10, "Rahbar FIO"),
            xodim=_make_mock_user(20, "Xodim FIO"),
            mfy=mock_mfy,
        )

        result = ti_service._topshiriq_to_response(mock_topshiriq)

        assert isinstance(result, dict)
        assert result["id"] == 1
        assert result["sarlavha"] == "Test sarlavha"
        assert result["matn"] == "Test matn"
        assert result["muddat"] == "2026-08-01"
        assert result["status"] == "bajarildi"
        assert result["rahbar_id"] == 10
        assert result["xodim_id"] == 20
        assert result["mfy_id"] == 3
        assert result["rahbar_fio"] == "Rahbar FIO"
        assert result["xodim_fio"] == "Xodim FIO"
        assert result["mfy_nomi"] == "Namuna MFY"
        # korilgan, bajarilgan sana isoformat string
        assert "T" in result["korilgan"]
        assert "T" in result["bajarilgan"]

    def test_topshiriq_to_response_no_mfy(self):
        """mfy_id=None — mfy_nomi=None."""
        mock_topshiriq = _make_mock_topshiriq(
            id=2, mfy_id=None, mfy=None,
        )
        result = ti_service._topshiriq_to_response(mock_topshiriq)
        assert result["mfy_id"] is None
        assert result["mfy_nomi"] is None

    def test_intizom_to_response(self):
        """Intizom → dict formatlash."""
        ts = datetime(2026, 7, 16, 14, 0, 0, tzinfo=timezone.utc)
        mock_intizom = _make_mock_intizom(
            id=1, xodim_id=20, muammo_id=None,
            turi=IntizomTuri.rag_bat, sabab="Yaxshi ish uchun",
            bergan_id=10, sana=ts,
            xodim=_make_mock_user(20, "Xodim FIO"),
            bergan=_make_mock_user(10, "Bergan FIO"),
        )

        result = ti_service._intizom_to_response(mock_intizom)

        assert isinstance(result, dict)
        assert result["id"] == 1
        assert result["xodim_id"] == 20
        assert result["muammo_id"] is None
        assert result["turi"] == "ragbat"
        assert result["sabab"] == "Yaxshi ish uchun"
        assert result["bergan_id"] == 10
        assert result["xodim_fio"] == "Xodim FIO"
        assert result["bergan_fio"] == "Bergan FIO"
        assert "T" in result["sana"]
