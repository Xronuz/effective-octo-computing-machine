"""
XAVFSIZ XONADON — WebSocket broadcast testlari (TZ 5.9).
broadcast_xavfsiz helper + yangi_muammo / shubhali / muddat_otdi xabarlari.
"""
import pytest
from datetime import date, datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from app.models.muammo import Muammo, Foto
from app.models.hudud import Xonadon
from app.models.user import User, UserRole
from app.services import muammo as muammo_service


# ============ Helpers ============

def _make_mock_db():
    """create_muammo uchun mock AsyncSession (xonadon topiladi, client_uuid yo'q)."""
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none = MagicMock()
    result.all = MagicMock(return_value=[])

    xonadon = MagicMock(spec=Xonadon)
    xonadon.id = 1
    xonadon.uy_raqami = "12"
    xonadon.full_address = "Namuna MFY, Navoiy ko'chasi, 12-uy"
    xonadon.kocha = MagicMock()
    xonadon.kocha.nomi = "Navoiy"
    xonadon.kocha.mfy = MagicMock()
    xonadon.kocha.mfy.id = 1

    # 1-chaqiriq: xonadon, 2-chaqiriq: client_uuid tekshiruvi (None)
    result.scalar_one_or_none = MagicMock(side_effect=[xonadon, None])
    db.execute = AsyncMock(return_value=result)
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.refresh = AsyncMock()
    return db, xonadon


def _make_xodim(xodim_id=1):
    u = MagicMock(spec=User)
    u.id = xodim_id
    u.guvohnoma_raqami = "XODIM001"
    u.rol = UserRole.xodim
    u.full_name = "Karimov Akmal Alievich"
    u.xodim_mfylar = []
    return u


def _make_foto_db(dup_rows=None):
    """add_fotos_to_muammo uchun mock db."""
    db = AsyncMock()
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.refresh = AsyncMock()
    result = MagicMock()
    result.all = MagicMock(return_value=dup_rows or [])
    db.execute = AsyncMock(return_value=result)
    return db


def _make_muammo(muammo_id=1, shubhali=False):
    m = MagicMock(spec=Muammo)
    m.id = muammo_id
    m.xodim_id = 20
    m.shubhali = shubhali
    m.lat = 40.123
    m.lng = 71.456
    return m


# ============ broadcast_xavfsiz helper ============

class TestBroadcastXavfsiz:

    @pytest.mark.asyncio
    async def test_klient_yoq_bolsa_jim_otadi(self):
        """Ulangan klient bo'lmasa — broadcast_json chaqirilmaydi, xato yo'q."""
        from app.ws import manager as ws_module

        with patch.object(ws_module.manager, "broadcast_json", new_callable=AsyncMock) as mock_bc:
            await ws_module.broadcast_xavfsiz({"type": "test"})

        mock_bc.assert_not_called()

    @pytest.mark.asyncio
    async def test_ulangan_klientga_yuboriladi(self):
        """Ulangan klientga xabar yuboriladi."""
        from app.ws import manager as ws_module

        fake_ws = MagicMock()
        fake_ws.send_json = AsyncMock()
        ws_module.manager._connections[42] = {fake_ws}
        try:
            await ws_module.broadcast_xavfsiz({"type": "yangi_muammo", "muammo": {"id": 1}})
        finally:
            ws_module.manager._connections.clear()

        fake_ws.send_json.assert_awaited_once_with({"type": "yangi_muammo", "muammo": {"id": 1}})

    @pytest.mark.asyncio
    async def test_xatolik_yutiladi(self):
        """broadcast_json xato tashlasa — istisno yutiladi (log'ga yoziladi)."""
        from app.ws import manager as ws_module

        fake_ws = MagicMock()
        ws_module.manager._connections[42] = {fake_ws}
        try:
            with patch.object(
                ws_module.manager, "broadcast_json",
                new_callable=AsyncMock, side_effect=Exception("tarmoq xatolik"),
            ):
                await ws_module.broadcast_xavfsiz({"type": "test"})  # xato tashlamasligi kerak
        finally:
            ws_module.manager._connections.clear()


# ============ create_muammo → yangi_muammo / shubhali ============

class TestCreateMuammoBroadcast:

    @pytest.mark.asyncio
    async def test_yangi_muammo_broadcast(self):
        """Muammo yaratilganda 'yangi_muammo' xabari yuboriladi."""
        db, _ = _make_mock_db()

        with patch("app.ws.manager.broadcast_xavfsiz", new_callable=AsyncMock) as mock_ws:
            m, dublikat = await muammo_service.create_muammo(
                db, _make_xodim(),
                xonadon_id=1,
                turi="ochiq_elektr_simi",
                tavsif="Sim ochiq",
                xavf="yuqori",
                lat=40.1, lng=71.4,
                gps_aniqlik=5.0,
                mock_gps=False,
                client_uuid=uuid4(),
                qurilma_vaqti=datetime(2026, 7, 14, 10, 0, tzinfo=timezone.utc),
                muddat=date(2026, 8, 1),
            )

        assert dublikat is False
        mock_ws.assert_awaited_once()
        msg = mock_ws.await_args.args[0]
        assert msg["type"] == "yangi_muammo"
        assert msg["muammo"]["turi"] == "ochiq_elektr_simi"
        assert msg["muammo"]["xodim_id"] == 1
        assert msg["muammo"]["shubhali"] is False

    @pytest.mark.asyncio
    async def test_shubhali_broadcast_mock_gps(self):
        """mock_gps — 'yangi_muammo' + 'shubhali' (sabab=mock_gps) xabarlari."""
        db, _ = _make_mock_db()

        with patch("app.ws.manager.broadcast_xavfsiz", new_callable=AsyncMock) as mock_ws:
            m, _ = await muammo_service.create_muammo(
                db, _make_xodim(),
                xonadon_id=1,
                turi="gaz_hidi",
                tavsif="Test",
                xavf="kritik",
                lat=40.1, lng=71.4,
                gps_aniqlik=5.0,
                mock_gps=True,
                client_uuid=uuid4(),
                qurilma_vaqti=datetime(2026, 7, 14, 10, 0, tzinfo=timezone.utc),
                muddat=date(2026, 8, 1),
            )

        assert m.shubhali is True
        assert mock_ws.await_count == 2
        types = [c.args[0]["type"] for c in mock_ws.await_args_list]
        assert types == ["yangi_muammo", "shubhali"]
        shubhali_msg = mock_ws.await_args_list[1].args[0]
        assert shubhali_msg["sabab"] == "mock_gps"
        assert shubhali_msg["muammo_id"] == m.id

    @pytest.mark.asyncio
    async def test_dublikat_client_uuid_broadcast_yoq(self):
        """Idempotent qayta yuborish — broadcast yuborilmaydi."""
        db = AsyncMock()
        result = MagicMock()
        existing = _make_muammo()
        xonadon = MagicMock(spec=Xonadon)
        result.scalar_one_or_none = MagicMock(side_effect=[xonadon, existing])
        db.execute = AsyncMock(return_value=result)

        with patch("app.ws.manager.broadcast_xavfsiz", new_callable=AsyncMock) as mock_ws:
            m, dublikat = await muammo_service.create_muammo(
                db, _make_xodim(),
                xonadon_id=1,
                turi="gaz_hidi",
                tavsif="Test",
                xavf="kritik",
                lat=40.1, lng=71.4,
                gps_aniqlik=None,
                mock_gps=False,
                client_uuid=uuid4(),
                qurilma_vaqti=datetime(2026, 7, 14, 10, 0, tzinfo=timezone.utc),
            )

        assert dublikat is True
        mock_ws.assert_not_called()


# ============ add_fotos_to_muammo → shubhali ============

class TestAddFotosBroadcast:

    @pytest.mark.asyncio
    async def test_sha256_dublikat_broadcast(self):
        """sha256 dublikat — 'shubhali' xabari (sabab=foto_sha256_dublikat)."""
        muammo = _make_muammo()
        dup_row = MagicMock()
        dup_row.sha256 = "a" * 64
        dup_row.muammo_id = 2
        db = _make_foto_db(dup_rows=[dup_row])

        with patch("app.ws.manager.broadcast_xavfsiz", new_callable=AsyncMock) as mock_ws:
            await muammo_service.add_fotos_to_muammo(
                db, muammo,
                [{"turi": "keyin", "fayl_yoli": "uploads/f.jpg", "sha256": "a" * 64}],
            )

        assert muammo.shubhali is True
        mock_ws.assert_awaited_once()
        msg = mock_ws.await_args.args[0]
        assert msg["type"] == "shubhali"
        assert msg["muammo_id"] == 1
        assert msg["sabab"] == "foto_sha256_dublikat"

    @pytest.mark.asyncio
    async def test_exif_masofa_broadcast(self):
        """EXIF masofa > 200 m — 'shubhali' xabari (sabab=exif_masofa)."""
        muammo = _make_muammo()
        db = _make_foto_db()

        with patch("app.ws.manager.broadcast_xavfsiz", new_callable=AsyncMock) as mock_ws:
            await muammo_service.add_fotos_to_muammo(
                db, muammo,
                [{
                    "turi": "keyin", "fayl_yoli": "uploads/f.jpg", "sha256": "d" * 64,
                    "exif_lat": 41.123, "exif_lng": 71.456,  # ~111 km uzoqlikda
                }],
            )

        assert muammo.shubhali is True
        mock_ws.assert_awaited_once()
        assert mock_ws.await_args.args[0]["sabab"] == "exif_masofa"

    @pytest.mark.asyncio
    async def test_allaqachon_shubhali_bolsa_takror_broadcast_yoq(self):
        """Shubhali allaqachon True — takroriy broadcast yuborilmaydi."""
        muammo = _make_muammo(shubhali=True)
        dup_row = MagicMock()
        dup_row.sha256 = "a" * 64
        dup_row.muammo_id = 2
        db = _make_foto_db(dup_rows=[dup_row])

        with patch("app.ws.manager.broadcast_xavfsiz", new_callable=AsyncMock) as mock_ws:
            await muammo_service.add_fotos_to_muammo(
                db, muammo,
                [{"turi": "keyin", "fayl_yoli": "uploads/f.jpg", "sha256": "a" * 64}],
            )

        mock_ws.assert_not_called()

    @pytest.mark.asyncio
    async def test_shubhali_emas_bolsa_broadcast_yoq(self):
        """Oddiy foto — broadcast yuborilmaydi."""
        muammo = _make_muammo()
        db = _make_foto_db()

        with patch("app.ws.manager.broadcast_xavfsiz", new_callable=AsyncMock) as mock_ws:
            await muammo_service.add_fotos_to_muammo(
                db, muammo,
                [{"turi": "keyin", "fayl_yoli": "uploads/f.jpg", "sha256": "b" * 64}],
            )

        mock_ws.assert_not_called()


# ============ muddat_tekshiruvi → muddat_otdi ============

class TestMuddatTekshiruviBroadcast:

    @pytest.mark.asyncio
    async def test_muddat_otdi_broadcast(self):
        """Status 'muddati_otgan' ga o'zgarganda 'muddat_otdi' xabari yuboriladi."""
        muammo = MagicMock()
        muammo.id = 7
        muammo.xodim_id = 20
        muammo.muddat = date.today() - timedelta(days=2)
        muammo.status = "ochiq"

        result = MagicMock()
        result.unique.return_value.scalars.return_value.all.return_value = [muammo]

        mock_session = MagicMock()
        mock_session.execute = AsyncMock(return_value=result)
        mock_session.commit = AsyncMock()
        mock_session.rollback = AsyncMock()

        with patch("app.tasks.muammo.async_session_maker") as mock_factory, \
             patch("app.tasks.muammo.muddati_otdi_xabar", new=AsyncMock()), \
             patch("app.ws.manager.broadcast_xavfsiz", new_callable=AsyncMock) as mock_ws:
            mock_factory.return_value.__aenter__.return_value = mock_session
            from app.tasks.muammo import muddat_tekshiruvi
            await muddat_tekshiruvi()

        mock_ws.assert_awaited_once()
        msg = mock_ws.await_args.args[0]
        assert msg["type"] == "muddat_otdi"
        assert msg["muammo_id"] == 7
        assert msg["xodim_id"] == 20

    @pytest.mark.asyncio
    async def test_muammo_yoq_bolsa_broadcast_yoq(self):
        """Muddati o'tgan muammo yo'q — broadcast ham yo'q."""
        result = MagicMock()
        result.unique.return_value.scalars.return_value.all.return_value = []

        mock_session = MagicMock()
        mock_session.execute = AsyncMock(return_value=result)
        mock_session.commit = AsyncMock()
        mock_session.rollback = AsyncMock()

        with patch("app.tasks.muammo.async_session_maker") as mock_factory, \
             patch("app.tasks.muammo.muddati_otdi_xabar", new=AsyncMock()), \
             patch("app.ws.manager.broadcast_xavfsiz", new_callable=AsyncMock) as mock_ws:
            mock_factory.return_value.__aenter__.return_value = mock_session
            from app.tasks.muammo import muddat_tekshiruvi
            await muddat_tekshiruvi()

        mock_ws.assert_not_called()
