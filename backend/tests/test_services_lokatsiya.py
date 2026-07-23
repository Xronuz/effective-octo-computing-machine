"""XAVFSIZ XONADON — Lokatsiya xizmati testlari. Mock AsyncSession bilan biznes-logika birlik testlari."""
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from app.services import lokatsiya as lokatsiya_service
from app.models.lokatsiya import LokatsiyaLog
from app.schemas.lokatsiya import LokatsiyaKiruvchi, AktivXodimResponse


# ============ Helpers ============

def _make_mock_db(**overrides):
    """Mock AsyncSession yaratish."""
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none = MagicMock(return_value=None)
    result.scalar = MagicMock(return_value=0)
    result.all = MagicMock(return_value=[])
    result.fetchall = MagicMock(return_value=[])
    result.rowcount = 0

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


def _make_lokatsiya_data(**overrides) -> LokatsiyaKiruvchi:
    """Oddiy LokatsiyaKiruvchi yaratish."""
    defaults = dict(
        lat=41.311081,
        lng=69.240562,
        aniqlik=12.5,
        tezlik=0.0,
        batareya=85,
        mock_gps=False,
        qurilma_vaqti=datetime(2026, 7, 16, 10, 0, 0, tzinfo=timezone.utc),
    )
    defaults.update(overrides)
    return LokatsiyaKiruvchi(**defaults)


def _make_row(**overrides):
    """fetchall() qatori — AktivXodimResponse uchun MagicMock."""
    defaults = dict(
        xodim_id=1,
        xodim_fio="Ali Valiyev",
        lat=41.311081,
        lng=69.240562,
        aniqlik=10.0,
        batareya=80,
        ohirgi_vaqt=datetime(2026, 7, 16, 10, 30, 0, tzinfo=timezone.utc),
    )
    defaults.update(overrides)
    row = MagicMock()
    for k, v in defaults.items():
        setattr(row, k, v)
    return row


# ============ _ish_vaqtida ============

class TestIshVaqtida:
    """Ish vaqti oralig'ida (09:00–18:00) ekanligini tekshirish."""

    # --- Ish vaqti ichida: naive datetimes ---

    @pytest.mark.asyncio
    async def test_ish_vaqti_ichida_soat_9(self):
        """09:00 — ish boshlanishi (chegara ichki)."""
        vaqt = datetime(2026, 7, 16, 9, 0)
        assert lokatsiya_service._ish_vaqtida(vaqt) is True

    @pytest.mark.asyncio
    async def test_ish_vaqti_ichida_soat_12(self):
        """12:00 — tushlik vaqti, ish oralig'ida."""
        vaqt = datetime(2026, 7, 16, 12, 0)
        assert lokatsiya_service._ish_vaqtida(vaqt) is True

    @pytest.mark.asyncio
    async def test_ish_vaqti_ichida_soat_17_59(self):
        """17:59 — ish tugashidan 1 daqiqa oldin."""
        vaqt = datetime(2026, 7, 16, 17, 59)
        assert lokatsiya_service._ish_vaqtida(vaqt) is True

    # --- Ish vaqti tashqarisida: naive datetimes ---

    @pytest.mark.asyncio
    async def test_ish_vaqti_tashqari_soat_8_59(self):
        """08:59 — ish boshlanishidan 1 daqiqa oldin."""
        vaqt = datetime(2026, 7, 16, 8, 59)
        assert lokatsiya_service._ish_vaqtida(vaqt) is False

    @pytest.mark.asyncio
    async def test_ish_vaqti_tashqari_soat_18(self):
        """18:00 — ish tugashi (chegara tashqi, [9, 18) → 18 not included)."""
        vaqt = datetime(2026, 7, 16, 18, 0)
        assert lokatsiya_service._ish_vaqtida(vaqt) is False

    @pytest.mark.asyncio
    async def test_ish_vaqti_tashqari_soat_23(self):
        """23:00 — kechki vaqt."""
        vaqt = datetime(2026, 7, 16, 23, 0)
        assert lokatsiya_service._ish_vaqtida(vaqt) is False

    # --- Timezone-aware datetimes ---

    @pytest.mark.asyncio
    async def test_ish_vaqti_ichida_utc_9(self):
        """09:00 UTC — timezone-aware, ish vaqti ichida."""
        vaqt = datetime(2026, 7, 16, 9, 0, tzinfo=timezone.utc)
        assert lokatsiya_service._ish_vaqtida(vaqt) is True

    @pytest.mark.asyncio
    async def test_ish_vaqti_tashqari_utc_18(self):
        """18:00 UTC — timezone-aware, ish vaqti tashqarisida."""
        vaqt = datetime(2026, 7, 16, 18, 0, tzinfo=timezone.utc)
        assert lokatsiya_service._ish_vaqtida(vaqt) is False

    @pytest.mark.asyncio
    async def test_ish_vaqti_ichida_utc_5_toshkent_14(self):
        """14:00 UTC+5 (Toshkent) → UTC 09:00 — ish vaqti ichida."""
        from datetime import timezone as tz
        tashkent = timezone(timedelta(hours=5))
        vaqt = datetime(2026, 7, 16, 14, 0, tzinfo=tashkent)
        assert lokatsiya_service._ish_vaqtida(vaqt) is True

    @pytest.mark.asyncio
    async def test_ish_vaqti_tashqari_utc_5_toshkent_23(self):
        """23:00 UTC+5 (Toshkent) → UTC 18:00 — ish vaqti tashqarisida."""
        tashkent = timezone(timedelta(hours=5))
        vaqt = datetime(2026, 7, 16, 23, 0, tzinfo=tashkent)
        assert lokatsiya_service._ish_vaqtida(vaqt) is False

    @pytest.mark.asyncio
    async def test_ish_vaqti_ichida_utc_5_toshkent_8_59(self):
        """08:59 UTC+5 (Toshkent) → UTC 03:59 — ish vaqti tashqarisida."""
        tashkent = timezone(timedelta(hours=5))
        vaqt = datetime(2026, 7, 16, 8, 59, tzinfo=tashkent)
        assert lokatsiya_service._ish_vaqtida(vaqt) is False

    # --- Chetki holatlar ---

    @pytest.mark.asyncio
    async def test_ish_vaqti_ichida_utc_0_9_0(self):
        """00:00 UTC-12 → UTC 12:00 — ish vaqti ichida."""
        minus_12 = timezone(timedelta(hours=-12))
        vaqt = datetime(2026, 7, 16, 0, 0, tzinfo=minus_12)
        assert lokatsiya_service._ish_vaqtida(vaqt) is True


# ============ save_lokatsiya ============

class TestSaveLokatsiya:
    """GPS nuqtani logga saqlash testlari."""

    @pytest.mark.asyncio
    async def test_save_success(self):
        """Ish vaqtida — LokatsiyaLog saqlanadi va qaytariladi."""
        db, result = _make_mock_db()
        data = _make_lokatsiya_data()

        with patch.object(lokatsiya_service, '_ish_vaqtida', return_value=True):
            log = await lokatsiya_service.save_lokatsiya(db, xodim_id=1, data=data)

        assert log is not None
        assert isinstance(log, LokatsiyaLog)
        db.add.assert_called_once()
        db.flush.assert_called_once()
        db.refresh.assert_called_once_with(log)

    @pytest.mark.asyncio
    async def test_save_outside_working_hours(self):
        """Ish vaqtidan tashqari — None qaytariladi, db.add chaqirilmaydi."""
        db, result = _make_mock_db()
        # data with time outside working hours (naive datetime, hour=23)
        data = _make_lokatsiya_data(qurilma_vaqti=datetime(2026, 7, 16, 23, 0))

        log = await lokatsiya_service.save_lokatsiya(db, xodim_id=1, data=data)

        assert log is None
        db.add.assert_not_called()
        db.flush.assert_not_called()
        db.refresh.assert_not_called()

    @pytest.mark.asyncio
    async def test_save_outside_working_hours_tz_aware(self):
        """Ish vaqtidan tashqari (tz-aware) — None qaytariladi."""
        db, result = _make_mock_db()
        # 18:00 UTC = exactly end, not included
        data = _make_lokatsiya_data(qurilma_vaqti=datetime(2026, 7, 16, 18, 0, tzinfo=timezone.utc))

        log = await lokatsiya_service.save_lokatsiya(db, xodim_id=1, data=data)

        assert log is None
        db.add.assert_not_called()

    @pytest.mark.asyncio
    async def test_save_all_fields_passed_correctly(self):
        """LokatsiyaLog ga barcha maydonlar to'g'ri berilganligi tekshiriladi."""
        db, result = _make_mock_db()
        data = _make_lokatsiya_data(
            lat=41.311081,
            lng=69.240562,
            aniqlik=15.0,
            tezlik=1.2,
            batareya=92,
            mock_gps=True,
            qurilma_vaqti=datetime(2026, 7, 16, 11, 30, 0, tzinfo=timezone.utc),
        )

        with patch.object(lokatsiya_service, '_ish_vaqtida', return_value=True):
            log = await lokatsiya_service.save_lokatsiya(db, xodim_id=42, data=data)

        assert log is not None
        assert log.xodim_id == 42
        assert log.lat == 41.311081
        assert log.lng == 69.240562
        assert log.aniqlik == 15.0
        assert log.tezlik == 1.2
        assert log.batareya == 92
        assert log.mock_gps is True
        assert log.qurilma_vaqti == datetime(2026, 7, 16, 11, 30, 0, tzinfo=timezone.utc)
        assert log.qabul_vaqti is not None

    @pytest.mark.asyncio
    async def test_save_different_xodim_ids(self):
        """Har xil xodim_id lar bilan saqlash."""
        for xid in [1, 5, 999]:
            db, result = _make_mock_db()
            data = _make_lokatsiya_data()

            with patch.object(lokatsiya_service, '_ish_vaqtida', return_value=True):
                log = await lokatsiya_service.save_lokatsiya(db, xodim_id=xid, data=data)

            assert log is not None
            assert log.xodim_id == xid


# ============ get_aktiv_xodimlar ============

class TestGetAktivXodimlar:
    """Oxirgi N daqiqa ichida GPS yuborgan faol xodimlar."""

    @pytest.mark.asyncio
    async def test_empty_result(self):
        """Faol xodim bo'lmasa bo'sh ro'yxat qaytariladi."""
        db, result = _make_mock_db()
        result.fetchall = MagicMock(return_value=[])
        db.execute = AsyncMock(return_value=result)

        aktivlar = await lokatsiya_service.get_aktiv_xodimlar(db)

        assert aktivlar == []
        db.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_single_xodim(self):
        """Bitta faol xodim qaytariladi."""
        db, result = _make_mock_db()
        row = _make_row(
            xodim_id=1,
            xodim_fio="Ali Valiyev",
            lat=41.311081,
            lng=69.240562,
            aniqlik=10.0,
            batareya=80,
            ohirgi_vaqt=datetime(2026, 7, 16, 10, 30, 0, tzinfo=timezone.utc),
        )
        result.fetchall = MagicMock(return_value=[row])
        db.execute = AsyncMock(return_value=result)

        aktivlar = await lokatsiya_service.get_aktiv_xodimlar(db)

        assert len(aktivlar) == 1
        assert isinstance(aktivlar[0], AktivXodimResponse)
        assert aktivlar[0].xodim_id == 1
        assert aktivlar[0].xodim_fio == "Ali Valiyev"
        assert aktivlar[0].lat == 41.311081
        assert aktivlar[0].lng == 69.240562
        assert aktivlar[0].aniqlik == 10.0
        assert aktivlar[0].batareya == 80
        assert "2026-07-16T10:30:00" in aktivlar[0].ohirgi_vaqt

    @pytest.mark.asyncio
    async def test_multiple_xodimlar(self):
        """Bir nechta faol xodim qaytariladi."""
        db, result = _make_mock_db()
        row1 = _make_row(
            xodim_id=1,
            xodim_fio="Ali Valiyev",
            lat=41.311081,
            lng=69.240562,
            aniqlik=10.0,
            batareya=80,
            ohirgi_vaqt=datetime(2026, 7, 16, 10, 30, 0, tzinfo=timezone.utc),
        )
        row2 = _make_row(
            xodim_id=2,
            xodim_fio="Bobur Aliyev",
            lat=41.320000,
            lng=69.250000,
            aniqlik=8.0,
            batareya=65,
            ohirgi_vaqt=datetime(2026, 7, 16, 10, 28, 0, tzinfo=timezone.utc),
        )
        row3 = _make_row(
            xodim_id=3,
            xodim_fio="Dilshod Karimov",
            lat=41.290000,
            lng=69.220000,
            aniqlik=15.0,
            batareya=90,
            ohirgi_vaqt=datetime(2026, 7, 16, 10, 25, 0, tzinfo=timezone.utc),
        )
        result.fetchall = MagicMock(return_value=[row1, row2, row3])
        db.execute = AsyncMock(return_value=result)

        aktivlar = await lokatsiya_service.get_aktiv_xodimlar(db)

        assert len(aktivlar) == 3
        assert aktivlar[0].xodim_id == 1
        assert aktivlar[1].xodim_fio == "Bobur Aliyev"
        assert aktivlar[2].batareya == 90

    @pytest.mark.asyncio
    async def test_response_type(self):
        """Har bir element AktivXodimResponse turida."""
        db, result = _make_mock_db()
        row = _make_row()
        result.fetchall = MagicMock(return_value=[row])
        db.execute = AsyncMock(return_value=result)

        aktivlar = await lokatsiya_service.get_aktiv_xodimlar(db)

        assert all(isinstance(a, AktivXodimResponse) for a in aktivlar)

    @pytest.mark.asyncio
    async def test_custom_daqiqa_param(self):
        """songi_daqiqa parametri berilganda ishlaydi."""
        db, result = _make_mock_db()
        result.fetchall = MagicMock(return_value=[])
        db.execute = AsyncMock(return_value=result)

        aktivlar = await lokatsiya_service.get_aktiv_xodimlar(db, songi_daqiqa=30)

        assert aktivlar == []
        db.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_ohirgi_vaqt_none(self):
        """ohirgi_vaqt=None bo'lsa bo'sh string ishlatiladi."""
        db, result = _make_mock_db()
        row = _make_row(ohirgi_vaqt=None)
        result.fetchall = MagicMock(return_value=[row])
        db.execute = AsyncMock(return_value=result)

        aktivlar = await lokatsiya_service.get_aktiv_xodimlar(db)

        assert aktivlar[0].ohirgi_vaqt == ""


# ============ tozalash_eski_loglar ============

class TestTozalashEskiLoglar:
    """Eski lokatsiya loglarni o'chirish testlari."""

    @pytest.mark.asyncio
    async def test_delete_zero(self):
        """O'chiriladigan log bo'lmasa 0 qaytariladi."""
        db, result = _make_mock_db()
        result.rowcount = 0
        db.execute = AsyncMock(return_value=result)

        deleted = await lokatsiya_service.tozalash_eski_loglar(db)

        assert deleted == 0
        db.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_five(self):
        """5 ta log o'chirilsa 5 qaytariladi."""
        db, result = _make_mock_db()
        result.rowcount = 5
        db.execute = AsyncMock(return_value=result)

        deleted = await lokatsiya_service.tozalash_eski_loglar(db)

        assert deleted == 5
        db.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_forty_two(self):
        """42 ta log o'chirilsa 42 qaytariladi."""
        db, result = _make_mock_db()
        result.rowcount = 42
        db.execute = AsyncMock(return_value=result)

        deleted = await lokatsiya_service.tozalash_eski_loglar(db)

        assert deleted == 42
        db.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_custom_kun_param(self):
        """Kun parametri berilganda ishlaydi."""
        db, result = _make_mock_db()
        result.rowcount = 10
        db.execute = AsyncMock(return_value=result)

        deleted = await lokatsiya_service.tozalash_eski_loglar(db, kun=30)

        assert deleted == 10
        db.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_flush_called_after_delete(self):
        """O'chirishdan keyin db.flush chaqirilishi tekshiriladi."""
        db, result = _make_mock_db()
        result.rowcount = 3
        db.execute = AsyncMock(return_value=result)

        await lokatsiya_service.tozalash_eski_loglar(db)

        db.flush.assert_called_once()

    @pytest.mark.asyncio
    async def test_flush_not_called_if_execute_fails(self):
        """db.execute exception bersa flush chaqirilmaydi."""
        db, result = _make_mock_db()
        db.execute = AsyncMock(side_effect=Exception("DB error"))

        with pytest.raises(Exception, match="DB error"):
            await lokatsiya_service.tozalash_eski_loglar(db)

        db.flush.assert_not_called()
