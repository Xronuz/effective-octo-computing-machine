"""
XAVFSIZ XONADON — Hudud API endpoint testlari.
GET /api/mfylar, GET /api/mfylar/{mfy_id}, GET /api/kochalar, POST /api/kochalar.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import create_app
from app.core.deps import get_current_user, get_db
from app.models.user import User, UserRole
from app.models.hudud import Mfy, Kocha
from app.services import xonadon as xonadon_service


# ============ Helpers ============

def _make_user(user_id=1, rol=UserRole.xodim, holat="faol"):
    """Mock User yaratish."""
    u = MagicMock(spec=User)
    u.id = user_id
    u.guvohnoma_raqami = f"XODIM{user_id:03d}"
    u.rol = rol
    u.holat = holat
    u.full_name = f"Test User {user_id}"
    return u


def _make_mfy(mfy_id=1, raqami=1, nomi="Navoiy MFY"):
    """Mock Mfy yaratish."""
    m = MagicMock(spec=Mfy)
    m.id = mfy_id
    m.raqami = raqami
    m.nomi = nomi
    m.markaz_lat = 40.0
    m.markaz_lng = 71.0
    m.xonadon_soni = 0
    m.kochalar = []
    return m


def _make_kocha(kocha_id=1, mfy_id=1, nomi="Navoiy", xonadonlar_count=0):
    """Mock Kocha yaratish."""
    k = MagicMock(spec=Kocha)
    k.id = kocha_id
    k.mfy_id = mfy_id
    k.nomi = nomi
    k.xonadonlar = [MagicMock() for _ in range(xonadonlar_count)]
    return k


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
        return TestClient(app)
    return _make_client


# ============ GET /api/mfylar ============

class TestListMfylarEndpoint:

    def test_list_empty(self, client_factory):
        """Bo'sh MFY ro'yxati."""
        mock_user = _make_user(rol=UserRole.xodim)
        mock_db = AsyncMock()

        with patch.object(xonadon_service, "list_mfylar", new_callable=AsyncMock) as mock_list:
            mock_list.return_value = []

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.get("/api/mfylar")
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert data["data"] == []
            assert data["xato"] is None

    def test_list_with_items(self, client_factory):
        """MFY elementlar bilan."""
        mock_user = _make_user(rol=UserRole.xodim)
        mock_db = AsyncMock()

        mfy1 = _make_mfy(mfy_id=1, raqami=1, nomi="Navoiy MFY")
        mfy1.xonadon_soni = 5
        mfy1.kochalar = [_make_kocha(1, 1, "Navoiy", 3), _make_kocha(2, 1, "Amir Temur", 2)]

        mfy2 = _make_mfy(mfy_id=2, raqami=2, nomi="Bobur MFY")
        mfy2.xonadon_soni = 3
        mfy2.kochalar = [_make_kocha(3, 2, "Bobur", 3)]

        with patch.object(xonadon_service, "list_mfylar", new_callable=AsyncMock) as mock_list:
            mock_list.return_value = [mfy1, mfy2]

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.get("/api/mfylar")
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert len(data["data"]) == 2
            assert data["xato"] is None

            # First MFY
            d1 = data["data"][0]
            assert d1["id"] == 1
            assert d1["raqami"] == 1
            assert d1["nomi"] == "Navoiy MFY"
            assert d1["xonadon_soni"] == 5
            assert d1["kochalar_soni"] == 2
            assert d1["chegara"] is None  # chegara_geojson o'rnatilmagan — null

            # Second MFY
            d2 = data["data"][1]
            assert d2["id"] == 2
            assert d2["raqami"] == 2
            assert d2["nomi"] == "Bobur MFY"
            assert d2["xonadon_soni"] == 3
            assert d2["kochalar_soni"] == 1
            assert d2["chegara"] is None

    def test_list_with_chegara_geojson(self, client_factory):
        """chegara_geojson o'rnatilgan MFY — javobda GeoJSON dict."""
        mock_user = _make_user(rol=UserRole.xodim)
        mock_db = AsyncMock()

        geojson = {
            "type": "Polygon",
            "coordinates": [[[71.0, 40.0], [71.1, 40.0], [71.1, 40.1], [71.0, 40.1], [71.0, 40.0]]],
        }
        mfy = _make_mfy(mfy_id=1, raqami=1, nomi="Navoiy MFY")
        mfy.chegara_geojson = geojson

        with patch.object(xonadon_service, "list_mfylar", new_callable=AsyncMock) as mock_list:
            mock_list.return_value = [mfy]

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.get("/api/mfylar")
            assert resp.status_code == 200
            d = resp.json()["data"][0]
            assert d["chegara"]["type"] == "Polygon"
            assert d["chegara"]["coordinates"][0][0] == [71.0, 40.0]


# ============ GET /api/mfylar/{mfy_id} ============

class TestGetMfyEndpoint:

    def test_get_success(self, client_factory):
        """MFY ni muvaffaqiyatli olish."""
        mock_user = _make_user(rol=UserRole.xodim)
        mock_db = AsyncMock()

        kocha1 = _make_kocha(1, 1, "Navoiy", 3)
        kocha2 = _make_kocha(2, 1, "Amir Temur", 1)

        mock_mfy = _make_mfy(mfy_id=1, raqami=1, nomi="Navoiy MFY")
        mock_mfy.xonadon_soni = 4
        mock_mfy.kochalar = [kocha1, kocha2]

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_mfy
        mock_db.execute = AsyncMock(return_value=mock_result)

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        resp = client.get("/api/mfylar/1")
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert data["xato"] is None

        d = data["data"]
        assert d["id"] == 1
        assert d["raqami"] == 1
        assert d["nomi"] == "Navoiy MFY"
        assert d["markaz_lat"] == 40.0
        assert d["markaz_lng"] == 71.0
        assert d["xonadon_soni"] == 4
        assert len(d["kochalar"]) == 2

        k1 = d["kochalar"][0]
        assert k1["id"] == 1
        assert k1["nomi"] == "Navoiy"
        assert k1["xonadon_soni"] == 3

        k2 = d["kochalar"][1]
        assert k2["id"] == 2
        assert k2["nomi"] == "Amir Temur"
        assert k2["xonadon_soni"] == 1

    def test_get_not_found(self, client_factory):
        """Topilmagan MFY — 404."""
        mock_user = _make_user(rol=UserRole.xodim)
        mock_db = AsyncMock()

        # HTTPException is caught natively by FastAPI in tests (unlike custom AppException)
        mock_db.execute = AsyncMock(
            side_effect=HTTPException(status_code=404, detail="MFY topilmadi (id=999)")
        )

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        resp = client.get("/api/mfylar/999")
        assert resp.status_code == 404
        assert "MFY topilmadi" in resp.json()["detail"]


# ============ GET /api/kochalar ============

class TestListKochalarEndpoint:

    def test_list_all(self, client_factory):
        """Barcha ko'chalar ro'yxati."""
        mock_user = _make_user(rol=UserRole.xodim)
        mock_db = AsyncMock()

        kocha1 = _make_kocha(1, 1, "Navoiy", 3)
        kocha2 = _make_kocha(2, 1, "Amir Temur", 1)
        kocha3 = _make_kocha(3, 2, "Bobur", 2)

        with patch.object(xonadon_service, "list_kochalar", new_callable=AsyncMock) as mock_list:
            mock_list.return_value = [kocha1, kocha2, kocha3]

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.get("/api/kochalar")
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert len(data["data"]) == 3
            assert data["xato"] is None

            # Verify list_kochalar called with mfy_id=None
            mock_list.assert_awaited_once_with(mock_db, mfy_id=None)

    def test_list_filter_by_mfy(self, client_factory):
        """MFY bo'yicha filtrlash."""
        mock_user = _make_user(rol=UserRole.xodim)
        mock_db = AsyncMock()

        kocha1 = _make_kocha(1, 2, "Bobur", 2)

        with patch.object(xonadon_service, "list_kochalar", new_callable=AsyncMock) as mock_list:
            mock_list.return_value = [kocha1]

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.get("/api/kochalar", params={"mfy_id": 2})
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert len(data["data"]) == 1
            assert data["data"][0]["mfy_id"] == 2

            # Verify mfy_id=2 was passed through
            mock_list.assert_awaited_once_with(mock_db, mfy_id=2)


# ============ POST /api/kochalar ============

class TestCreateKochaEndpoint:

    def test_create_success_rahbar(self, client_factory):
        """Rahbar yangi ko'cha qo'shishi."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        mock_kocha = MagicMock(spec=Kocha)
        mock_kocha.id = 5
        mock_kocha.mfy_id = 1
        mock_kocha.nomi = "Navoiy"
        mock_kocha.xonadonlar = []

        with patch.object(xonadon_service, "create_kocha", new_callable=AsyncMock) as mock_create:
            mock_create.return_value = mock_kocha

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.post("/api/kochalar", json={"mfy_id": 1, "nomi": "Navoiy"})
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert data["xato"] is None
            dd = data["data"]
            assert dd["id"] == 5
            assert dd["mfy_id"] == 1
            assert dd["nomi"] == "Navoiy"
            assert dd["xonadon_soni"] == 0

            mock_create.assert_awaited_once_with(mock_db, mfy_id=1, nomi="Navoiy")

    def test_create_success_superadmin(self, client_factory):
        """Superadmin yangi ko'cha qo'shishi."""
        mock_user = _make_user(rol=UserRole.superadmin)
        mock_db = AsyncMock()

        mock_kocha = MagicMock(spec=Kocha)
        mock_kocha.id = 10
        mock_kocha.mfy_id = 2
        mock_kocha.nomi = "Amir Temur"
        mock_kocha.xonadonlar = []

        with patch.object(xonadon_service, "create_kocha", new_callable=AsyncMock) as mock_create:
            mock_create.return_value = mock_kocha

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.post("/api/kochalar", json={"mfy_id": 2, "nomi": "Amir Temur"})
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert data["data"]["id"] == 10
            assert data["data"]["nomi"] == "Amir Temur"

    def test_create_forbidden_xodim(self, client_factory):
        """Xodim ko'cha qo'sha olmaydi — 403."""
        mock_user = _make_user(rol=UserRole.xodim)
        mock_db = AsyncMock()

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        resp = client.post("/api/kochalar", json={"mfy_id": 1, "nomi": "Navoiy"})
        assert resp.status_code == 403
        data = resp.json()
        assert data["ok"] is False
        assert "roli talab qilinadi" in data["xato"]
        assert data["data"] is None

    def test_create_mfy_not_found(self, client_factory):
        """MFY mavjud bo'lmasa — 404."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        with patch.object(xonadon_service, "create_kocha", new_callable=AsyncMock) as mock_create:
            # HTTPException is caught natively by FastAPI in tests (unlike custom AppException)
            mock_create.side_effect = HTTPException(
                status_code=404, detail="MFY topilmadi (id=999)"
            )

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.post("/api/kochalar", json={"mfy_id": 999, "nomi": "Navoiy"})
            assert resp.status_code == 404
            assert "MFY topilmadi" in resp.json()["detail"]

    def test_create_validation_empty_nomi(self, client_factory):
        """Bo'sh nomi — 422."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        resp = client.post("/api/kochalar", json={"mfy_id": 1, "nomi": ""})
        assert resp.status_code == 422
        data = resp.json()
        # Pydantic validation error format
        assert "detail" in data


# ============ POST /api/mfylar ============

class TestCreateMfyEndpoint:

    def test_create_success(self, client_factory):
        """Rahbar/superadmin yangi MFY qo'shishi."""
        mock_user = _make_user(rol=UserRole.superadmin)
        mock_db = AsyncMock()

        mock_mfy = _make_mfy(mfy_id=54, raqami=54, nomi="Yangi MFY")

        with patch.object(xonadon_service, "create_mfy", new_callable=AsyncMock) as mock_create:
            mock_create.return_value = mock_mfy

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.post(
                "/api/mfylar",
                json={"raqami": 54, "nomi": "Yangi MFY"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert data["xato"] is None
            dd = data["data"]
            assert dd["id"] == 54
            assert dd["raqami"] == 54
            assert dd["nomi"] == "Yangi MFY"
            assert dd["kochalar_soni"] == 0

            mock_create.assert_awaited_once_with(
                mock_db, raqami=54, nomi="Yangi MFY",
                markaz_lat=None, markaz_lng=None,
            )

    def test_create_forbidden_xodim(self, client_factory):
        """Xodim MFY qo'sha olmaydi — 403."""
        mock_user = _make_user(rol=UserRole.xodim)
        mock_db = AsyncMock()

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        resp = client.post("/api/mfylar", json={"raqami": 54, "nomi": "Yangi MFY"})
        assert resp.status_code == 403

    def test_create_validation(self, client_factory):
        """Bo'sh nomi yoki raqami < 1 — 422."""
        mock_user = _make_user(rol=UserRole.superadmin)
        mock_db = AsyncMock()

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        resp = client.post("/api/mfylar", json={"raqami": 0, "nomi": "Yangi MFY"})
        assert resp.status_code == 422

        resp = client.post("/api/mfylar", json={"raqami": 54, "nomi": ""})
        assert resp.status_code == 422


# ============ PATCH /api/mfylar/{mfy_id} ============

class TestUpdateMfyEndpoint:

    def test_update_success(self, client_factory):
        """MFY nomini yangilash."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        mock_mfy = _make_mfy(mfy_id=1, raqami=1, nomi="Navoiy MFY (yangi)")

        with patch.object(xonadon_service, "get_mfy", new_callable=AsyncMock) as mock_get, \
             patch.object(xonadon_service, "update_mfy", new_callable=AsyncMock) as mock_update:
            mock_get.return_value = _make_mfy(mfy_id=1, raqami=1, nomi="Navoiy MFY")
            mock_update.return_value = mock_mfy

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.patch("/api/mfylar/1", json={"nomi": "Navoiy MFY (yangi)"})
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert data["data"]["nomi"] == "Navoiy MFY (yangi)"

            mock_get.assert_awaited_once_with(mock_db, 1)
            mock_update.assert_awaited_once()

    def test_update_forbidden_xodim(self, client_factory):
        """Xodim MFY yangilay olmaydi — 403."""
        mock_user = _make_user(rol=UserRole.xodim)
        mock_db = AsyncMock()

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        resp = client.patch("/api/mfylar/1", json={"nomi": "Boshqa nom"})
        assert resp.status_code == 403

    def test_update_not_found(self, client_factory):
        """Topilmagan MFY — 404."""
        mock_user = _make_user(rol=UserRole.superadmin)
        mock_db = AsyncMock()

        with patch.object(xonadon_service, "get_mfy", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = HTTPException(
                status_code=404, detail="MFY topilmadi (id=999)"
            )

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.patch("/api/mfylar/999", json={"nomi": "Boshqa nom"})
            assert resp.status_code == 404


# ============ DELETE /api/mfylar/{mfy_id} ============

class TestDeleteMfyEndpoint:

    def test_delete_success_superadmin(self, client_factory):
        """Superadmin bo'sh MFY ni o'chirishi."""
        mock_user = _make_user(rol=UserRole.superadmin)
        mock_db = AsyncMock()

        with patch.object(xonadon_service, "get_mfy", new_callable=AsyncMock) as mock_get, \
             patch.object(xonadon_service, "delete_mfy", new_callable=AsyncMock) as mock_delete:
            mock_get.return_value = _make_mfy(mfy_id=1, raqami=1, nomi="Navoiy MFY")

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.delete("/api/mfylar/1")
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert "o'chirildi" in data["data"]["xabar"]

            mock_get.assert_awaited_once_with(mock_db, 1)
            mock_delete.assert_awaited_once()

    def test_delete_forbidden_rahbar(self, client_factory):
        """Rahbar MFY o'chira olmaydi — faqat superadmin — 403."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        resp = client.delete("/api/mfylar/1")
        assert resp.status_code == 403

    def test_delete_conflict_xonadon_bor(self, client_factory):
        """Xonadonlari bor MFY — 409 Conflict."""
        mock_user = _make_user(rol=UserRole.superadmin)
        mock_db = AsyncMock()

        with patch.object(xonadon_service, "get_mfy", new_callable=AsyncMock) as mock_get, \
             patch.object(xonadon_service, "delete_mfy", new_callable=AsyncMock) as mock_delete:
            mock_get.return_value = _make_mfy(mfy_id=1, raqami=1, nomi="Navoiy MFY")
            mock_delete.side_effect = HTTPException(
                status_code=409,
                detail="Bu MFY ga 12 ta xonadon biriktirilgan.",
            )

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.delete("/api/mfylar/1")
            assert resp.status_code == 409
            assert "xonadon biriktirilgan" in resp.json()["detail"]


# ============ PATCH /api/kochalar/{kocha_id} ============

class TestUpdateKochaEndpoint:

    def test_update_success(self, client_factory):
        """Ko'cha nomini yangilash."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        mock_kocha = _make_kocha(kocha_id=1, mfy_id=1, nomi="Navoiy (yangi)")

        with patch.object(xonadon_service, "get_kocha", new_callable=AsyncMock) as mock_get, \
             patch.object(xonadon_service, "update_kocha", new_callable=AsyncMock) as mock_update:
            mock_get.return_value = _make_kocha(kocha_id=1, mfy_id=1, nomi="Navoiy")
            mock_update.return_value = mock_kocha

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.patch("/api/kochalar/1", json={"nomi": "Navoiy (yangi)"})
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert data["data"]["nomi"] == "Navoiy (yangi)"

            mock_get.assert_awaited_once_with(mock_db, 1)
            mock_update.assert_awaited_once()

    def test_update_forbidden_xodim(self, client_factory):
        """Xodim ko'cha yangilay olmaydi — 403."""
        mock_user = _make_user(rol=UserRole.xodim)
        mock_db = AsyncMock()

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        resp = client.patch("/api/kochalar/1", json={"nomi": "Boshqa nom"})
        assert resp.status_code == 403

    def test_update_validation_empty_nomi(self, client_factory):
        """Bo'sh nomi — 422."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        resp = client.patch("/api/kochalar/1", json={"nomi": ""})
        assert resp.status_code == 422


# ============ DELETE /api/kochalar/{kocha_id} ============

class TestDeleteKochaEndpoint:

    def test_delete_success_superadmin(self, client_factory):
        """Superadmin bo'sh ko'chani o'chirishi."""
        mock_user = _make_user(rol=UserRole.superadmin)
        mock_db = AsyncMock()

        with patch.object(xonadon_service, "get_kocha", new_callable=AsyncMock) as mock_get, \
             patch.object(xonadon_service, "delete_kocha", new_callable=AsyncMock) as mock_delete:
            mock_get.return_value = _make_kocha(kocha_id=1, mfy_id=1, nomi="Navoiy")

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.delete("/api/kochalar/1")
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert "o'chirildi" in data["data"]["xabar"]

            mock_get.assert_awaited_once_with(mock_db, 1)
            mock_delete.assert_awaited_once()

    def test_delete_forbidden_rahbar(self, client_factory):
        """Rahbar ko'cha o'chira olmaydi — faqat superadmin — 403."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        resp = client.delete("/api/kochalar/1")
        assert resp.status_code == 403

    def test_delete_conflict_xonadon_bor(self, client_factory):
        """Xonadonlari bor ko'cha — 409 Conflict."""
        mock_user = _make_user(rol=UserRole.superadmin)
        mock_db = AsyncMock()

        with patch.object(xonadon_service, "get_kocha", new_callable=AsyncMock) as mock_get, \
             patch.object(xonadon_service, "delete_kocha", new_callable=AsyncMock) as mock_delete:
            mock_get.return_value = _make_kocha(kocha_id=1, mfy_id=1, nomi="Navoiy")
            mock_delete.side_effect = HTTPException(
                status_code=409,
                detail="Bu ko'chaga 5 ta xonadon biriktirilgan.",
            )

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.delete("/api/kochalar/1")
            assert resp.status_code == 409
            assert "xonadon biriktirilgan" in resp.json()["detail"]
