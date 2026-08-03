"""
XAVFSIZ XONADON — Lokatsiya API (POST /lokatsiya, /lokatsiya/batch) testlari.
Asosiy fokus: jonli xarita uchun WebSocket broadcast to'g'ri sodir bo'lishi.
"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.core.deps import get_current_user, get_db
from app.models.user import User, UserRole
from app.services import lokatsiya as lokatsiya_service
from app.ws.manager import manager as ws_manager


def _make_user(user_id=1, rol=UserRole.xodim):
    u = MagicMock(spec=User)
    u.id = user_id
    u.rol = rol
    u.full_name = f"Test Xodim {user_id}"
    return u


def _make_log(log_id=1, lat=40.1, lng=71.4):
    """`save_lokatsiya` qaytaradigan mock LokatsiyaLog."""
    log = MagicMock()
    log.id = log_id
    log.lat = lat
    log.lng = lng
    log.aniqlik = 10.0
    log.tezlik = None
    log.batareya = 80
    log.mock_gps = False
    log.qurilma_vaqti = datetime(2026, 7, 14, 10, 0, tzinfo=timezone.utc)
    log.qabul_vaqti = datetime(2026, 7, 14, 10, 0, 5, tzinfo=timezone.utc)
    return log


@pytest.fixture
def client_factory():
    def _make_client(user_override=None, db_override=None):
        app = create_app()
        if user_override:
            app.dependency_overrides[get_current_user] = user_override
        if db_override:
            app.dependency_overrides[get_db] = db_override
        return TestClient(app)
    return _make_client


def _nuqta(qurilma_vaqti="2026-07-14T10:00:00Z"):
    return {
        "lat": 40.1,
        "lng": 71.4,
        "aniqlik": 10.0,
        "tezlik": None,
        "batareya": 80,
        "mock_gps": False,
        "qurilma_vaqti": qurilma_vaqti,
    }


class TestSendLokatsiya:
    """POST /api/lokatsiya — yagona nuqta."""

    def test_success_broadcasts(self, client_factory):
        mock_user = _make_user()
        mock_db = AsyncMock()
        log = _make_log()

        with patch.object(lokatsiya_service, "save_lokatsiya", new_callable=AsyncMock) as mock_save, \
             patch.object(ws_manager, "broadcast_json", new_callable=AsyncMock) as mock_bc:
            mock_save.return_value = log

            client = client_factory(user_override=lambda: mock_user, db_override=lambda: mock_db)
            resp = client.post("/api/lokatsiya", json=_nuqta())

            assert resp.status_code == 200
            data = resp.json()
            assert data["data"]["id"] == 1
            mock_bc.assert_awaited_once()
            msg = mock_bc.await_args.args[0]
            assert msg["type"] == "lokatsiya_yangilandi"
            assert msg["data"]["xodim_id"] == mock_user.id
            assert msg["data"]["lat"] == 40.1

    def test_outside_work_hours_no_broadcast(self, client_factory):
        """Ish vaqtidan tashqari — saqlanmaydi, broadcast ham yo'q."""
        mock_user = _make_user()
        mock_db = AsyncMock()

        with patch.object(lokatsiya_service, "save_lokatsiya", new_callable=AsyncMock) as mock_save, \
             patch.object(ws_manager, "broadcast_json", new_callable=AsyncMock) as mock_bc:
            mock_save.return_value = None

            client = client_factory(user_override=lambda: mock_user, db_override=lambda: mock_db)
            resp = client.post("/api/lokatsiya", json=_nuqta())

            assert resp.status_code == 200
            assert resp.json()["data"]["saqlandi"] is False
            mock_bc.assert_not_awaited()


class TestSendLokatsiyaBatch:
    """POST /api/lokatsiya/batch — offline to'plangan paket.

    Regression: mobil ilova GPS nuqtalarini har doim shu endpoint orqali
    yuboradi (yagona-nuqta yo'li ishlatilmaydi), lekin bu endpoint avval
    WebSocket bildirishnomasini UMUMAN yubormasdi — natijada web'dagi
    "Hodisalar oqimi" panelida "lokatsiya_yangilandi" turi hech qachon
    ko'rinmasdi.
    """

    def test_broadcasts_last_saved_point(self, client_factory):
        """Paketdagi eng oxirgi saqlangan nuqta WS orqali yuboriladi."""
        mock_user = _make_user()
        mock_db = AsyncMock()
        log1 = _make_log(log_id=1, lat=40.1, lng=71.4)
        log2 = _make_log(log_id=2, lat=40.2, lng=71.5)

        with patch.object(lokatsiya_service, "save_lokatsiya", new_callable=AsyncMock) as mock_save, \
             patch.object(ws_manager, "broadcast_json", new_callable=AsyncMock) as mock_bc:
            mock_save.side_effect = [log1, log2]

            client = client_factory(user_override=lambda: mock_user, db_override=lambda: mock_db)
            resp = client.post(
                "/api/lokatsiya/batch",
                json={"items": [_nuqta("2026-07-14T09:00:00Z"), _nuqta("2026-07-14T10:00:00Z")]},
            )

            assert resp.status_code == 200
            data = resp.json()
            assert data["data"]["saqlangan"] == 2
            assert data["data"]["rad_etilgan"] == 0

            mock_bc.assert_awaited_once()
            msg = mock_bc.await_args.args[0]
            assert msg["type"] == "lokatsiya_yangilandi"
            # Oxirgi (eng yangi) nuqta — log2, log1 emas
            assert msg["data"]["lat"] == 40.2
            assert msg["data"]["lng"] == 71.5

    def test_all_rejected_no_broadcast(self, client_factory):
        """Barcha nuqtalar ish vaqtidan tashqari rad etilsa — broadcast yo'q."""
        mock_user = _make_user()
        mock_db = AsyncMock()

        with patch.object(lokatsiya_service, "save_lokatsiya", new_callable=AsyncMock) as mock_save, \
             patch.object(ws_manager, "broadcast_json", new_callable=AsyncMock) as mock_bc:
            mock_save.return_value = None

            client = client_factory(user_override=lambda: mock_user, db_override=lambda: mock_db)
            resp = client.post("/api/lokatsiya/batch", json={"items": [_nuqta()]})

            assert resp.status_code == 200
            data = resp.json()
            assert data["data"]["saqlangan"] == 0
            assert data["data"]["rad_etilgan"] == 1
            mock_bc.assert_not_awaited()
