"""
XAVFSIZ XONADON — Xonadon API endpoint testlari.
FastAPI TestClient + Dependency Injection mock.
POST   /api/xonadonlar          — create xonadon (xodim/rahbar/superadmin)
GET    /api/xonadonlar          — list with filters (any auth user)
GET    /api/xonadonlar/{id}     — detail (any auth user)
PATCH  /api/xonadonlar/{id}     — update (rahbar/superadmin)
DELETE /api/xonadonlar/{id}     — delete (superadmin only)
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import create_app
from app.core.deps import get_current_user, get_db
from app.models.user import User, UserRole
from app.services import xonadon as xonadon_service


# ============ Helpers ============

def _make_user(user_id=1, rol=UserRole.xodim, holat="faol"):
    """Mock User yaratish."""
    u = MagicMock(spec=User)
    u.id = user_id
    u.guvohnoma_raqami = f"XODIM{user_id:03d}"
    u.rol = rol
    u.holat = "faol"
    u.full_name = f"Test User {user_id}"
    return u


def _make_xonadon_dict(**kwargs):
    """Xonadon javob lug'ati (service _xonadon_to_response formatida)."""
    defaults = {
        "id": 1,
        "kocha_id": 1,
        "uy_raqami": "15",
        "lat": 40.9,
        "lng": 71.1,
        "egasi_fio": "Ali Valiyev",
        "egasi_tel": "+998901112233",
        "izoh": None,
        "yaratilgan": "2026-07-14T10:00:00Z",
        "full_address": "Namuna MFY, Navoiy ko'chasi, 15-uy",
        "kocha_nomi": "Navoiy",
        "mfy_nomi": "Namuna",
        "mfy_id": 1,
        "ochiq_muammolar_soni": 0,
    }
    defaults.update(kwargs)
    return defaults


# ============ TestClient fixture ============

@pytest.fixture
def client_factory():
    """TestClient yaratish — har test o'z override'larini o'rnatadi."""
    def _make_client(user_override=None, db_override=None):
        app = create_app()
        if user_override:
            app.dependency_overrides[get_current_user] = user_override
        if db_override:
            app.dependency_overrides[get_db] = db_override
        app.dependency_overrides = app.dependency_overrides  # ensure dict
        return TestClient(app)
    return _make_client


# ============ POST /api/xonadonlar ============

class TestCreateXonadonEndpoint:

    def test_create_success_rahbar(self, client_factory):
        """Rahbar xonadon yaratishi mumkin."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        mock_db.add = MagicMock()

        xonadon_dict = _make_xonadon_dict()

        with patch.object(xonadon_service, "create_xonadon", new_callable=AsyncMock) as mock_create, \
             patch.object(xonadon_service, "_xonadon_to_response", return_value=xonadon_dict):

            mock_xonadon = MagicMock()
            mock_create.return_value = mock_xonadon

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            payload = {
                "kocha_id": 1,
                "uy_raqami": "15",
                "lat": 40.9,
                "lng": 71.1,
                "egasi_fio": "Ali Valiyev",
                "egasi_tel": "+998901112233",
            }

            resp = client.post("/api/xonadonlar", json=payload)

            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert data["data"]["id"] == 1
            assert data["data"]["uy_raqami"] == "15"
            assert data["data"]["kocha_id"] == 1
            assert data["xato"] is None

    def test_create_success_superadmin(self, client_factory):
        """Superadmin xonadon yaratishi mumkin."""
        mock_user = _make_user(rol=UserRole.superadmin)
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        mock_db.add = MagicMock()

        xonadon_dict = _make_xonadon_dict(id=2, uy_raqami="27")

        with patch.object(xonadon_service, "create_xonadon", new_callable=AsyncMock) as mock_create, \
             patch.object(xonadon_service, "_xonadon_to_response", return_value=xonadon_dict):

            mock_xonadon = MagicMock()
            mock_create.return_value = mock_xonadon

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            payload = {
                "kocha_id": 1,
                "uy_raqami": "27",
                "lat": 40.8,
                "lng": 71.2,
            }

            resp = client.post("/api/xonadonlar", json=payload)

            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert data["data"]["id"] == 2
            assert data["data"]["uy_raqami"] == "27"
            assert data["xato"] is None

    def test_create_success_xodim(self, client_factory):
        """Xodim ham xonadon yarata oladi (TZ 5.3 — mobil ilovadan)."""
        mock_user = _make_user(rol=UserRole.xodim)
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        mock_db.add = MagicMock()

        xonadon_dict = _make_xonadon_dict(id=3, uy_raqami="15")

        with patch.object(xonadon_service, "create_xonadon", new_callable=AsyncMock) as mock_create, \
             patch.object(xonadon_service, "_xonadon_to_response", return_value=xonadon_dict):

            mock_xonadon = MagicMock()
            mock_create.return_value = mock_xonadon

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            payload = {
                "kocha_id": 1,
                "uy_raqami": "15",
            }

            resp = client.post("/api/xonadonlar", json=payload)
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert data["data"]["id"] == 3
            assert data["xato"] is None

    def test_create_kocha_not_found(self, client_factory):
        """Ko'cha topilmaganda 404."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        mock_db.add = MagicMock()

        with patch.object(xonadon_service, "create_xonadon", new_callable=AsyncMock) as mock_create:
            mock_create.side_effect = HTTPException(status_code=404, detail="Ko'cha topilmadi (id=999)")

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            payload = {
                "kocha_id": 999,
                "uy_raqami": "15",
            }

            resp = client.post("/api/xonadonlar", json=payload)
            assert resp.status_code == 404

    def test_create_duplicate(self, client_factory):
        """Dublikat xonadon — 409."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        mock_db.add = MagicMock()

        with patch.object(xonadon_service, "create_xonadon", new_callable=AsyncMock) as mock_create:
            mock_create.side_effect = HTTPException(status_code=409, detail="Bu uy allaqachon qo'shilgan")

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            payload = {
                "kocha_id": 1,
                "uy_raqami": "15",
            }

            resp = client.post("/api/xonadonlar", json=payload)
            assert resp.status_code == 409

    def test_create_validation_empty_uy_raqami(self, client_factory):
        """Validatsiya xatosi — bo'sh uy raqami 422."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        payload = {
            "kocha_id": 1,
            "uy_raqami": "",
        }

        resp = client.post("/api/xonadonlar", json=payload)
        assert resp.status_code == 422

    def test_create_validation_missing_kocha_id(self, client_factory):
        """Validatsiya xatosi — kocha_id yo'q 422."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        payload = {"uy_raqami": "15"}

        resp = client.post("/api/xonadonlar", json=payload)
        assert resp.status_code == 422


# ============ GET /api/xonadonlar ============

class TestListXonadonlarEndpoint:

    def test_list_empty(self, client_factory):
        """Bo'sh ro'yxat."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        with patch.object(xonadon_service, "list_xonadonlar", new_callable=AsyncMock) as mock_list:
            mock_list.return_value = ([], 0)

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.get("/api/xonadonlar")
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert data["data"]["total"] == 0
            assert data["data"]["items"] == []
            assert data["data"]["page"] == 1
            assert data["data"]["size"] == 20
            assert data["data"]["pages"] == 0
            assert data["xato"] is None

    def test_list_with_items(self, client_factory):
        """Elementli ro'yxat."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        x1 = _make_xonadon_dict(id=1, uy_raqami="15")
        x2 = _make_xonadon_dict(id=2, uy_raqami="27")

        with patch.object(xonadon_service, "list_xonadonlar", new_callable=AsyncMock) as mock_list, \
             patch.object(xonadon_service, "_xonadon_to_response", side_effect=[x1, x2]):

            mock_list.return_value = ([MagicMock(), MagicMock()], 2)

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.get("/api/xonadonlar")
            assert resp.status_code == 200
            data = resp.json()
            assert data["data"]["total"] == 2
            assert len(data["data"]["items"]) == 2
            assert data["data"]["items"][0]["uy_raqami"] == "15"
            assert data["data"]["items"][1]["uy_raqami"] == "27"
            assert data["data"]["pages"] == 1

    def test_list_with_filters(self, client_factory):
        """Filtrli so'rov — mfy_id, kocha_id, ochiq_muammo, qidiruv."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        with patch.object(xonadon_service, "list_xonadonlar", new_callable=AsyncMock) as mock_list, \
             patch.object(xonadon_service, "_xonadon_to_response", return_value=_make_xonadon_dict()):

            mock_list.return_value = ([MagicMock()], 1)

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.get(
                "/api/xonadonlar",
                params={
                    "mfy_id": 1,
                    "kocha_id": 2,
                    "ochiq_muammo": "true",
                    "qidiruv": "Navoiy",
                    "page": 1,
                    "size": 10,
                },
            )
            assert resp.status_code == 200
            assert resp.json()["ok"] is True

            # Check all filter params were passed to the service
            call_kwargs = mock_list.call_args.kwargs
            assert call_kwargs["mfy_id"] == 1
            assert call_kwargs["kocha_id"] == 2
            assert call_kwargs["ochiq_muammo"] is True
            assert call_kwargs["qidiruv"] == "Navoiy"
            assert call_kwargs["page"] == 1
            assert call_kwargs["size"] == 10

    def test_list_filters_ochiq_muammo_false(self, client_factory):
        """Ochiq muammo filtri — False qiymati."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        with patch.object(xonadon_service, "list_xonadonlar", new_callable=AsyncMock) as mock_list, \
             patch.object(xonadon_service, "_xonadon_to_response", return_value=_make_xonadon_dict()):

            mock_list.return_value = ([MagicMock()], 0)

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.get(
                "/api/xonadonlar",
                params={"ochiq_muammo": "false"},
            )
            assert resp.status_code == 200

            call_kwargs = mock_list.call_args.kwargs
            assert call_kwargs["ochiq_muammo"] is False

    def test_list_pagination(self, client_factory):
        """Sahifalash — page=2, size=5."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        with patch.object(xonadon_service, "list_xonadonlar", new_callable=AsyncMock) as mock_list, \
             patch.object(xonadon_service, "_xonadon_to_response", return_value=_make_xonadon_dict()):

            mock_list.return_value = ([MagicMock() for _ in range(5)], 12)

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.get(
                "/api/xonadonlar",
                params={"page": 2, "size": 5},
            )
            assert resp.status_code == 200
            data = resp.json()["data"]
            assert data["page"] == 2
            assert data["size"] == 5
            assert data["total"] == 12
            assert data["pages"] == 3  # ceil(12/5)
            assert len(data["items"]) == 5

            call_kwargs = mock_list.call_args.kwargs
            assert call_kwargs["page"] == 2
            assert call_kwargs["size"] == 5


# ============ GET /api/xonadonlar/{xonadon_id} ============

class TestGetXonadonEndpoint:

    def test_get_success(self, client_factory):
        """Xonadonni muvaffaqiyatli olish."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()
        xonadon_dict = _make_xonadon_dict(id=42, uy_raqami="15A")

        with patch.object(xonadon_service, "get_xonadon", new_callable=AsyncMock) as mock_get, \
             patch.object(xonadon_service, "_xonadon_to_response", return_value=xonadon_dict):

            mock_get.return_value = MagicMock()

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.get("/api/xonadonlar/42")
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert data["data"]["id"] == 42
            assert data["data"]["uy_raqami"] == "15A"
            assert data["xato"] is None

    def test_get_not_found(self, client_factory):
        """Topilmagan xonadon — 404."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        with patch.object(xonadon_service, "get_xonadon", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = HTTPException(status_code=404, detail="Xonadon topilmadi")

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.get("/api/xonadonlar/999")
            assert resp.status_code == 404


# ============ PATCH /api/xonadonlar/{xonadon_id} ============

class TestUpdateXonadonEndpoint:

    def test_update_success_rahbar(self, client_factory):
        """Rahbar xonadon ma'lumotlarini yangilay oladi."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()

        mock_xonadon = MagicMock()
        updated_dict = _make_xonadon_dict(uy_raqami="20", egasi_fio="Vali Aliyev")

        with patch.object(xonadon_service, "get_xonadon", new_callable=AsyncMock) as mock_get, \
             patch.object(xonadon_service, "update_xonadon", new_callable=AsyncMock) as mock_update, \
             patch.object(xonadon_service, "_xonadon_to_response", return_value=updated_dict):

            mock_get.return_value = mock_xonadon
            mock_update.return_value = mock_xonadon

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.patch("/api/xonadonlar/1", json={"uy_raqami": "20", "egasi_fio": "Vali Aliyev"})
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert data["data"]["uy_raqami"] == "20"
            assert data["data"]["egasi_fio"] == "Vali Aliyev"
            assert data["xato"] is None

    def test_update_success_superadmin(self, client_factory):
        """Superadmin xonadon ma'lumotlarini yangilay oladi."""
        mock_user = _make_user(rol=UserRole.superadmin)
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()

        mock_xonadon = MagicMock()
        updated_dict = _make_xonadon_dict(kocha_id=2, lat=40.95, lng=71.15)

        with patch.object(xonadon_service, "get_xonadon", new_callable=AsyncMock) as mock_get, \
             patch.object(xonadon_service, "update_xonadon", new_callable=AsyncMock) as mock_update, \
             patch.object(xonadon_service, "_xonadon_to_response", return_value=updated_dict):

            mock_get.return_value = mock_xonadon
            mock_update.return_value = mock_xonadon

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.patch("/api/xonadonlar/1", json={"kocha_id": 2, "lat": 40.95, "lng": 71.15})
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert data["data"]["kocha_id"] == 2
            assert data["data"]["lat"] == 40.95

    def test_update_forbidden_xodim(self, client_factory):
        """Xodim xonadon ma'lumotlarini yangilay olmaydi — 403."""
        mock_user = _make_user(rol=UserRole.xodim)
        mock_db = AsyncMock()

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        resp = client.patch("/api/xonadonlar/1", json={"uy_raqami": "20"})
        assert resp.status_code == 403
        data = resp.json()
        assert data["ok"] is False
        assert data["xato"] is not None

    def test_update_not_found(self, client_factory):
        """Mavjud bo'lmagan xonadonni yangilash — 404."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        with patch.object(xonadon_service, "get_xonadon", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = HTTPException(status_code=404, detail="Xonadon topilmadi (id=999)")

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.patch("/api/xonadonlar/999", json={"uy_raqami": "20"})
            assert resp.status_code == 404

    def test_update_kocha_not_found(self, client_factory):
        """Noto'g'ri kocha_id bilan yangilash — 404."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()

        mock_xonadon = MagicMock()

        with patch.object(xonadon_service, "get_xonadon", new_callable=AsyncMock) as mock_get, \
             patch.object(xonadon_service, "update_xonadon", new_callable=AsyncMock) as mock_update:

            mock_get.return_value = mock_xonadon
            mock_update.side_effect = HTTPException(status_code=404, detail="Ko'cha topilmadi (id=999)")

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.patch("/api/xonadonlar/1", json={"kocha_id": 999})
            assert resp.status_code == 404

    def test_update_partial_izoh(self, client_factory):
        """Faqat izohni yangilash."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()

        mock_xonadon = MagicMock()
        updated_dict = _make_xonadon_dict(izoh="Yangi izoh")

        with patch.object(xonadon_service, "get_xonadon", new_callable=AsyncMock) as mock_get, \
             patch.object(xonadon_service, "update_xonadon", new_callable=AsyncMock) as mock_update, \
             patch.object(xonadon_service, "_xonadon_to_response", return_value=updated_dict):

            mock_get.return_value = mock_xonadon
            mock_update.return_value = mock_xonadon

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.patch("/api/xonadonlar/1", json={"izoh": "Yangi izoh"})
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert data["data"]["izoh"] == "Yangi izoh"

    def test_update_partial_egasi_tel(self, client_factory):
        """Faqat telefon raqamini yangilash."""
        mock_user = _make_user(rol=UserRole.superadmin)
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()

        mock_xonadon = MagicMock()
        updated_dict = _make_xonadon_dict(egasi_tel="+998909998877")

        with patch.object(xonadon_service, "get_xonadon", new_callable=AsyncMock) as mock_get, \
             patch.object(xonadon_service, "update_xonadon", new_callable=AsyncMock) as mock_update, \
             patch.object(xonadon_service, "_xonadon_to_response", return_value=updated_dict):

            mock_get.return_value = mock_xonadon
            mock_update.return_value = mock_xonadon

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.patch("/api/xonadonlar/1", json={"egasi_tel": "+998909998877"})
            assert resp.status_code == 200
            assert resp.json()["data"]["egasi_tel"] == "+998909998877"


# ============ DELETE /api/xonadonlar/{xonadon_id} ============

class TestDeleteXonadonEndpoint:

    def test_delete_success_superadmin(self, client_factory):
        """Superadmin xonadonni o'chira oladi."""
        mock_user = _make_user(rol=UserRole.superadmin)
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()

        mock_xonadon = MagicMock()
        mock_xonadon.full_address = "Namuna MFY, Navoiy ko'chasi, 15-uy"

        with patch.object(xonadon_service, "get_xonadon", new_callable=AsyncMock) as mock_get, \
             patch.object(xonadon_service, "delete_xonadon", new_callable=AsyncMock) as mock_delete:

            mock_get.return_value = mock_xonadon
            mock_delete.return_value = None

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.delete("/api/xonadonlar/1")
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert "o'chirildi" in data["data"]["xabar"]
            assert "15-uy" in data["data"]["xabar"]
            assert data["xato"] is None

    def test_delete_forbidden_rahbar(self, client_factory):
        """Rahbar xonadonni o'chira olmaydi — 403."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        resp = client.delete("/api/xonadonlar/1")
        assert resp.status_code == 403
        data = resp.json()
        assert data["ok"] is False
        assert data["xato"] is not None

    def test_delete_forbidden_xodim(self, client_factory):
        """Xodim xonadonni o'chira olmaydi — 403."""
        mock_user = _make_user(rol=UserRole.xodim)
        mock_db = AsyncMock()

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        resp = client.delete("/api/xonadonlar/1")
        assert resp.status_code == 403
        data = resp.json()
        assert data["ok"] is False
        assert data["xato"] is not None

    def test_delete_not_found(self, client_factory):
        """Mavjud bo'lmagan xonadonni o'chirish — 404."""
        mock_user = _make_user(rol=UserRole.superadmin)
        mock_db = AsyncMock()

        with patch.object(xonadon_service, "get_xonadon", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = HTTPException(status_code=404, detail="Xonadon topilmadi (id=999)")

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.delete("/api/xonadonlar/999")
            assert resp.status_code == 404
