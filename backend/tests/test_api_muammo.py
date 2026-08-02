"""
XAVFSIZ XONADON — Muammo API endpoint testlari.
FastAPI TestClient + Dependency Injection mock.
"""
import pytest
from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import create_app
from app.core.deps import get_current_user, get_db
from app.models.user import User, UserRole
from app.models.muammo import Muammo, MuammoStatus, MuammoTuri, XavfDarajasi, FotoTuri, Foto
from app.services import muammo as muammo_service


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


def _make_muammo_dict(**kwargs):
    """Muammo javob lug'ati (service _muammo_to_response formatida)."""
    defaults = {
        "id": 1,
        "xonadon_id": 1,
        "xodim_id": 1,
        "turi": "ochiq_elektr_simi",
        "turi_nomi": "Ochiq elektr simi",
        "tavsif": "Sim ochiq holatda",
        "xavf": "yuqori",
        "status": "ochiq",
        "ornida_bartaraf": False,
        "muddat": None,
        "muddat_qolgan_kun": None,
        "tashkilot": None,
        "tashkilotga_sana": None,
        "lat": 40.123,
        "lng": 71.456,
        "gps_aniqlik": 5.0,
        "mock_gps": False,
        "shubhali": False,
        "client_uuid": str(uuid4()),
        "qurilma_vaqti": datetime(2026, 7, 14, 10, 0, tzinfo=timezone.utc),
        "sinxron_vaqti": datetime(2026, 7, 14, 10, 0, 1, tzinfo=timezone.utc),
        "yopilgan_sana": None,
        "fotolar": [],
        "xonadon_manzili": "Namuna MFY, Navoiy ko'chasi, 12-uy",
        "xodim_fio": "Test User 1",
    }
    defaults.update(kwargs)
    return defaults


def _make_muammo_list_response(items=None, total=0, page=1, size=20):
    """Sahifalangan muammo ro'yxati javobi."""
    if items is None:
        items = []
    pages = (total + size - 1) // size if total > 0 else 0
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


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


# ============ POST /api/muammolar ============

class TestCreateMuammoEndpoint:

    def test_create_success(self, client_factory):
        """Muvofaqqiyatli muammo yaratish (xodim)."""
        mock_user = _make_user(rol=UserRole.xodim)
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        mock_db.add = MagicMock()

        muammo_dict = _make_muammo_dict()

        with patch.object(muammo_service, "create_muammo", new_callable=AsyncMock) as mock_create, \
             patch.object(muammo_service, "_muammo_to_response", return_value=muammo_dict):

            mock_muammo = MagicMock()
            mock_create.return_value = (mock_muammo, False)

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            payload = {
                "xonadon_id": 1,
                "turi": "ochiq_elektr_simi",
                "tavsif": "Sim ochiq",
                "xavf": "yuqori",
                "lat": 40.123,
                "lng": 71.456,
                "gps_aniqlik": 5.0,
                "mock_gps": False,
                "client_uuid": str(uuid4()),
                "qurilma_vaqti": "2026-07-14T10:00:00Z",
                "yoriqnomadan_otkanlar_soni": 2,
            }

            resp = client.post("/api/muammolar", json=payload)

            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert data["data"]["id"] == 1
            assert data["xato"] is None

    def test_create_forwards_tadbirlar_and_soni_to_service(self, client_factory):
        """Regression: taklif_etilgan_tadbirlar/yoriqnomadan_otkanlar_soni
        so'rov tanasidan service qatlamiga to'g'ri uzatilishi kerak
        (avval bu ikki maydon jimgina tashlab yuborilar edi)."""
        mock_user = _make_user(rol=UserRole.xodim)
        mock_db = AsyncMock()

        muammo_dict = _make_muammo_dict(turi=None, taklif_etilgan_tadbirlar="3,4,8")

        with patch.object(muammo_service, "create_muammo", new_callable=AsyncMock) as mock_create, \
             patch.object(muammo_service, "_muammo_to_response", return_value=muammo_dict):

            mock_muammo = MagicMock()
            mock_create.return_value = (mock_muammo, False)

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            payload = {
                "xonadon_id": 1,
                "turi": None,
                "lat": 40.123,
                "lng": 71.456,
                "client_uuid": str(uuid4()),
                "qurilma_vaqti": "2026-07-14T10:00:00Z",
                "ornida_bartaraf": True,
                "has_keyin_foto": True,
                "taklif_etilgan_tadbirlar": "3,4,8",
                "yoriqnomadan_otkanlar_soni": 5,
            }

            resp = client.post("/api/muammolar", json=payload)
            assert resp.status_code == 200

            call_kwargs = mock_create.call_args.kwargs
            assert call_kwargs["taklif_etilgan_tadbirlar"] == "3,4,8"
            assert call_kwargs["yoriqnomadan_otkanlar_soni"] == 5

    def test_create_clean_check_turi_none(self, client_factory):
        """turi=None va taklif_etilgan_tadbirlar bo'sh — "tekshirildi, muammo yo'q"."""
        mock_user = _make_user(rol=UserRole.xodim)
        mock_db = AsyncMock()

        muammo_dict = _make_muammo_dict(
            turi=None, turi_nomi=None, taklif_etilgan_tadbirlar=None, status="yopilgan",
        )

        with patch.object(muammo_service, "create_muammo", new_callable=AsyncMock) as mock_create, \
             patch.object(muammo_service, "_muammo_to_response", return_value=muammo_dict):

            mock_muammo = MagicMock()
            mock_create.return_value = (mock_muammo, False)

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            payload = {
                "xonadon_id": 1,
                "turi": None,
                "lat": 40.123,
                "lng": 71.456,
                "client_uuid": str(uuid4()),
                "qurilma_vaqti": "2026-07-14T10:00:00Z",
                "yoriqnomadan_otkanlar_soni": 3,
            }

            resp = client.post("/api/muammolar", json=payload)
            assert resp.status_code == 200
            data = resp.json()
            assert data["data"]["turi"] is None
            assert data["data"]["status"] == "yopilgan"

    def test_create_missing_yoriqnomadan_otkanlar_soni_422(self, client_factory):
        """yoriqnomadan_otkanlar_soni endi majburiy — tushmasa 422."""
        mock_user = _make_user(rol=UserRole.xodim)
        mock_db = AsyncMock()

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        payload = {
            "xonadon_id": 1,
            "turi": "boshqa",
            "lat": 40.1,
            "lng": 71.4,
            "client_uuid": str(uuid4()),
            "qurilma_vaqti": "2026-07-14T10:00:00Z",
        }

        resp = client.post("/api/muammolar", json=payload)
        assert resp.status_code == 422

    def test_create_taklif_etilgan_tadbirlar_out_of_range_422(self, client_factory):
        """turi=None bo'lganda 1-14 oralig'idan tashqari band raqami — 422."""
        mock_user = _make_user(rol=UserRole.xodim)
        mock_db = AsyncMock()

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        payload = {
            "xonadon_id": 1,
            "turi": None,
            "lat": 40.1,
            "lng": 71.4,
            "client_uuid": str(uuid4()),
            "qurilma_vaqti": "2026-07-14T10:00:00Z",
            "yoriqnomadan_otkanlar_soni": 1,
            "taklif_etilgan_tadbirlar": "3,99",
            "ornida_bartaraf": True,
            "has_keyin_foto": True,
        }

        resp = client.post("/api/muammolar", json=payload)
        assert resp.status_code == 422

    def test_create_forbidden_for_rahbar(self, client_factory):
        """Rahbar muammo yarata olmaydi."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        payload = {
            "xonadon_id": 1,
            "turi": "ochiq_elektr_simi",
            "tavsif": "Sim ochiq",
            "xavf": "yuqori",
            "lat": 40.123,
            "lng": 71.456,
            "mock_gps": False,
            "client_uuid": str(uuid4()),
            "qurilma_vaqti": "2026-07-14T10:00:00Z",
            "yoriqnomadan_otkanlar_soni": 0,
        }

        resp = client.post("/api/muammolar", json=payload)
        assert resp.status_code == 403
        assert resp.json()["ok"] is False

    def test_create_superadmin_allowed(self, client_factory):
        """Superadmin muammo yarata oladi."""
        mock_user = _make_user(rol=UserRole.superadmin)
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        mock_db.add = MagicMock()

        muammo_dict = _make_muammo_dict()

        with patch.object(muammo_service, "create_muammo", new_callable=AsyncMock) as mock_create, \
             patch.object(muammo_service, "_muammo_to_response", return_value=muammo_dict):

            mock_muammo = MagicMock()
            mock_create.return_value = (mock_muammo, False)

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            payload = {
                "xonadon_id": 1,
                "turi": "gaz_hidi",
                "tavsif": "Gaz hidi",
                "xavf": "kritik",
                "lat": 40.1,
                "lng": 71.4,
                "mock_gps": False,
                "client_uuid": str(uuid4()),
                "qurilma_vaqti": "2026-07-14T10:00:00Z",
                "yoriqnomadan_otkanlar_soni": 4,
            }

            resp = client.post("/api/muammolar", json=payload)
            assert resp.status_code == 200
            assert resp.json()["ok"] is True

    def test_create_validation_error(self, client_factory):
        """Validatsiya xatosi — noto'g'ri turi."""
        mock_user = _make_user(rol=UserRole.xodim)
        mock_db = AsyncMock()

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        payload = {
            "xonadon_id": 1,
            "turi": "nomalum_tur",
            "tavsif": "Test",
            "xavf": "orta",
            "lat": 40.1,
            "lng": 71.4,
            "mock_gps": False,
            "client_uuid": str(uuid4()),
            "qurilma_vaqti": "2026-07-14T10:00:00Z",
        }

        resp = client.post("/api/muammolar", json=payload)
        assert resp.status_code == 422

    def test_create_invalid_client_uuid_422(self, client_factory):
        """Noto'g'ri UUID format — 422 (500 emas)."""
        mock_user = _make_user(rol=UserRole.xodim)
        mock_db = AsyncMock()

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        payload = {
            "xonadon_id": 1,
            "turi": "gaz_hidi",
            "xavf": "orta",
            "lat": 40.1,
            "lng": 71.4,
            "client_uuid": "not-a-uuid",
            "qurilma_vaqti": "2026-07-14T10:00:00Z",
        }

        resp = client.post("/api/muammolar", json=payload)
        assert resp.status_code == 422

    def test_create_idempotent_dublikat(self, client_factory):
        """Takroriy client_uuid — mavjud muammo dublikat=True bilan qaytariladi (200)."""
        mock_user = _make_user(rol=UserRole.xodim)
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        mock_db.add = MagicMock()

        muammo_dict = _make_muammo_dict()

        with patch.object(muammo_service, "create_muammo", new_callable=AsyncMock) as mock_create, \
             patch.object(muammo_service, "_muammo_to_response", return_value=muammo_dict):

            mock_muammo = MagicMock()
            mock_create.return_value = (mock_muammo, True)  # dublikat

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            payload = {
                "xonadon_id": 1,
                "turi": "ochiq_elektr_simi",
                "xavf": "yuqori",
                "lat": 40.123,
                "lng": 71.456,
                "client_uuid": str(uuid4()),
                "qurilma_vaqti": "2026-07-14T10:00:00Z",
                "yoriqnomadan_otkanlar_soni": 0,
            }

            resp = client.post("/api/muammolar", json=payload)
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert data["data"]["dublikat"] is True


# ============ GET /api/muammolar ============

class TestListMuammolarEndpoint:

    def test_list_empty(self, client_factory):
        """Bo'sh ro'yxat."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        with patch.object(muammo_service, "list_muammolar", new_callable=AsyncMock) as mock_list:
            mock_list.return_value = ([], 0)

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.get("/api/muammolar")
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert data["data"]["total"] == 0
            assert data["data"]["items"] == []

    def test_list_with_items(self, client_factory):
        """Elementli ro'yxat."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        m1 = _make_muammo_dict(id=1)
        m2 = _make_muammo_dict(id=2)

        with patch.object(muammo_service, "list_muammolar", new_callable=AsyncMock) as mock_list, \
             patch.object(muammo_service, "_muammo_to_response", side_effect=[m1, m2]):

            mock_list.return_value = ([MagicMock(), MagicMock()], 2)

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.get("/api/muammolar")
            assert resp.status_code == 200
            data = resp.json()
            assert data["data"]["total"] == 2
            assert len(data["data"]["items"]) == 2

    def test_list_xodim_sees_own(self, client_factory):
        """Xodim faqat o'zining muammolarini ko'radi."""
        mock_user = _make_user(user_id=5, rol=UserRole.xodim)
        mock_db = AsyncMock()

        with patch.object(muammo_service, "list_muammolar", new_callable=AsyncMock) as mock_list, \
             patch.object(muammo_service, "_muammo_to_response", return_value=_make_muammo_dict(xodim_id=5)):

            mock_list.return_value = ([MagicMock()], 1)

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.get("/api/muammolar")
            assert resp.status_code == 200
            # Xodim uchun xodim_id=5 avtomatik qo'shilganligini tekshiramiz
            call_kwargs = mock_list.call_args.kwargs
            assert call_kwargs["xodim_id"] == 5

    def test_list_with_filters(self, client_factory):
        """Filtrli so'rov."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        with patch.object(muammo_service, "list_muammolar", new_callable=AsyncMock) as mock_list, \
             patch.object(muammo_service, "_muammo_to_response", return_value=_make_muammo_dict()):

            mock_list.return_value = ([MagicMock()], 1)

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.get(
                "/api/muammolar",
                params={
                    "status": "ochiq",
                    "turi": "gaz_hidi",
                    "xavf": "yuqori",
                    "mfy_id": 1,
                    "xonadon_id": 1,
                    "shubhali": "true",
                    "ornida_bartaraf": "false",
                    "sana_dan": "2026-07-01",
                    "sana_gacha": "2026-07-31",
                    "qidiruv": "gaz",
                    "page": 1,
                    "size": 10,
                },
            )
            assert resp.status_code == 200
            assert resp.json()["ok"] is True


# ============ GET /api/muammolar/xarita ============

class TestXaritaEndpoint:

    def test_xarita_success(self, client_factory):
        """BBox so'rovi — GeoJSON FeatureCollection qaytariladi."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        features = [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [71.4, 40.1]},
                "properties": {
                    "id": 1, "turi": "gaz_hidi", "status": "ochiq",
                    "xavf": "yuqori", "shubhali": False,
                },
            }
        ]

        with patch.object(muammo_service, "xarita_muammolar", new_callable=AsyncMock) as mock_xarita:
            mock_xarita.return_value = features

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.get(
                "/api/muammolar/xarita",
                params={"bbox": "71.0,40.0,72.0,41.0"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert data["data"]["type"] == "FeatureCollection"
            assert len(data["data"]["features"]) == 1
            assert data["data"]["features"][0]["geometry"]["coordinates"] == [71.4, 40.1]

            call_kwargs = mock_xarita.call_args.kwargs
            assert call_kwargs["min_lng"] == 71.0
            assert call_kwargs["min_lat"] == 40.0
            assert call_kwargs["max_lng"] == 72.0
            assert call_kwargs["max_lat"] == 41.0

    def test_xarita_with_status_filter(self, client_factory):
        """Status filtri servisga uzatiladi."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        with patch.object(muammo_service, "xarita_muammolar", new_callable=AsyncMock) as mock_xarita:
            mock_xarita.return_value = []

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.get(
                "/api/muammolar/xarita",
                params={"bbox": "71.0,40.0,72.0,41.0", "status": "ochiq"},
            )
            assert resp.status_code == 200
            assert mock_xarita.call_args.kwargs["status"] == "ochiq"

    def test_xarita_invalid_bbox_format(self, client_factory):
        """Noto'g'ri bbox formati — 422."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        resp = client.get("/api/muammolar/xarita", params={"bbox": "71.0,40.0,72.0"})
        assert resp.status_code == 422
        assert resp.json()["ok"] is False

    def test_xarita_bbox_not_numbers(self, client_factory):
        """Son bo'lmagan bbox qiymatlari — 422."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        resp = client.get("/api/muammolar/xarita", params={"bbox": "a,b,c,d"})
        assert resp.status_code == 422

    def test_xarita_bbox_min_greater_max(self, client_factory):
        """min > max bo'lgan bbox — 422."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        resp = client.get("/api/muammolar/xarita", params={"bbox": "72.0,41.0,71.0,40.0"})
        assert resp.status_code == 422

    def test_xarita_missing_bbox(self, client_factory):
        """bbox parametrsiz so'rov — 422."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        resp = client.get("/api/muammolar/xarita")
        assert resp.status_code == 422


# ============ GET /api/muammolar/{muammo_id} ============

class TestGetMuammoEndpoint:

    def test_get_success(self, client_factory):
        """Muammoni muvaffaqiyatli olish."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()
        muammo_dict = _make_muammo_dict(id=42)

        mock_muammo = MagicMock()
        mock_muammo.xodim_id = 1

        with patch.object(muammo_service, "get_muammo", new_callable=AsyncMock) as mock_get, \
             patch.object(muammo_service, "_muammo_to_response", return_value=muammo_dict):

            mock_get.return_value = mock_muammo

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.get("/api/muammolar/42")
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert data["data"]["id"] == 42

    def test_get_xodim_own(self, client_factory):
        """Xodim o'zining muammosini ko'ra oladi."""
        mock_user = _make_user(user_id=1, rol=UserRole.xodim)
        mock_db = AsyncMock()

        mock_muammo = MagicMock()
        mock_muammo.xodim_id = 1  # same as user

        with patch.object(muammo_service, "get_muammo", new_callable=AsyncMock) as mock_get, \
             patch.object(muammo_service, "_muammo_to_response", return_value=_make_muammo_dict()):

            mock_get.return_value = mock_muammo

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.get("/api/muammolar/1")
            assert resp.status_code == 200

    def test_get_xodim_others_forbidden(self, client_factory):
        """Xodim boshqaning muammosini ko'ra olmaydi."""
        mock_user = _make_user(user_id=1, rol=UserRole.xodim)
        mock_db = AsyncMock()

        mock_muammo = MagicMock()
        mock_muammo.xodim_id = 2  # different from user

        with patch.object(muammo_service, "get_muammo", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_muammo

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.get("/api/muammolar/2")
            assert resp.status_code == 403

    def test_get_not_found(self, client_factory):
        """Topilmagan muammo — 404."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        with patch.object(muammo_service, "get_muammo", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = HTTPException(status_code=404, detail="Muammo topilmadi")

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.get("/api/muammolar/999")
            assert resp.status_code == 404
            assert resp.json()["detail"] == "Muammo topilmadi"


# ============ PATCH /api/muammolar/{muammo_id} ============

class TestUpdateMuammoEndpoint:

    def test_update_success_rahbar(self, client_factory):
        """Rahbar muammo holatini yangilay oladi."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()

        mock_muammo = MagicMock()
        updated_dict = _make_muammo_dict(status="jarayonda")

        with patch.object(muammo_service, "get_muammo", new_callable=AsyncMock) as mock_get, \
             patch.object(muammo_service, "update_muammo", new_callable=AsyncMock) as mock_update, \
             patch.object(muammo_service, "_muammo_to_response", return_value=updated_dict):

            mock_get.return_value = mock_muammo
            mock_update.return_value = mock_muammo

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.patch("/api/muammolar/1", json={"status": "jarayonda"})
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert data["data"]["status"] == "jarayonda"

    def test_update_forbidden_xodim(self, client_factory):
        """Xodim muammo holatini yangilay olmaydi (require_role)."""
        mock_user = _make_user(rol=UserRole.xodim)
        mock_db = AsyncMock()

        client = client_factory(
            user_override=lambda: mock_user,
            db_override=lambda: mock_db,
        )

        resp = client.patch("/api/muammolar/1", json={"status": "jarayonda"})
        assert resp.status_code == 403

    def test_update_with_muddat(self, client_factory):
        """Muddat belgilash."""
        mock_user = _make_user(rol=UserRole.superadmin)
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()

        mock_muammo = MagicMock()
        updated_dict = _make_muammo_dict(muddat="2026-08-15")

        with patch.object(muammo_service, "get_muammo", new_callable=AsyncMock) as mock_get, \
             patch.object(muammo_service, "update_muammo", new_callable=AsyncMock) as mock_update, \
             patch.object(muammo_service, "_muammo_to_response", return_value=updated_dict):

            mock_get.return_value = mock_muammo
            mock_update.return_value = mock_muammo

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.patch("/api/muammolar/1", json={"muddat": "2026-08-15"})
            assert resp.status_code == 200
            assert resp.json()["data"]["muddat"] == "2026-08-15"

    def test_update_with_tashkilot(self, client_factory):
        """Tashkilotga yo'naltirish."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()

        mock_muammo = MagicMock()
        updated_dict = _make_muammo_dict(tashkilot="Gaz ta'minoti")

        with patch.object(muammo_service, "get_muammo", new_callable=AsyncMock) as mock_get, \
             patch.object(muammo_service, "update_muammo", new_callable=AsyncMock) as mock_update, \
             patch.object(muammo_service, "_muammo_to_response", return_value=updated_dict):

            mock_get.return_value = mock_muammo
            mock_update.return_value = mock_muammo

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.patch("/api/muammolar/1", json={"tashkilot": "Gaz ta'minoti"})
            assert resp.status_code == 200

    def test_update_not_found(self, client_factory):
        """Mavjud bo'lmagan muammoni yangilash — 404."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        with patch.object(muammo_service, "get_muammo", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = HTTPException(status_code=404, detail="Muammo topilmadi")

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.patch("/api/muammolar/999", json={"status": "jarayonda"})
            assert resp.status_code == 404


# ============ POST /api/muammolar/{muammo_id}/yop ============

class TestYopMuammoEndpoint:

    def test_yop_success(self, client_factory):
        """Muammoni muvaffaqiyatli yopish."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()

        mock_muammo = MagicMock()
        mock_muammo.xodim_id = 1
        mock_muammo.tavsif = "Oldingi tavsif"
        closed_dict = _make_muammo_dict(status="yopilgan", yopilgan_sana="2026-07-14T10:00:00Z")

        with patch.object(muammo_service, "get_muammo", new_callable=AsyncMock) as mock_get, \
             patch.object(muammo_service, "_muammo_to_response", return_value=closed_dict):

            mock_get.return_value = mock_muammo

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.post(
                "/api/muammolar/1/yop",
                json={"ornida_bartaraf": True, "tavsif": "Bartaraf etildi"},
            )
            assert resp.status_code == 200
            assert resp.json()["ok"] is True

    def test_yop_without_tavsif(self, client_factory):
        """Yopish — tavsifsiz."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()

        mock_muammo = MagicMock()
        mock_muammo.xodim_id = 1
        mock_muammo.tavsif = None
        closed_dict = _make_muammo_dict(status="yopilgan")

        with patch.object(muammo_service, "get_muammo", new_callable=AsyncMock) as mock_get, \
             patch.object(muammo_service, "_muammo_to_response", return_value=closed_dict):

            mock_get.return_value = mock_muammo

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.post("/api/muammolar/1/yop", json={"ornida_bartaraf": True})
            assert resp.status_code == 200

    def test_yop_xodim_others_forbidden(self, client_factory):
        """Xodim boshqaning muammosini yopa olmaydi."""
        mock_user = _make_user(user_id=1, rol=UserRole.xodim)
        mock_db = AsyncMock()

        mock_muammo = MagicMock()
        mock_muammo.xodim_id = 2  # boshqa xodim

        with patch.object(muammo_service, "get_muammo", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_muammo

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.post("/api/muammolar/2/yop", json={"ornida_bartaraf": True})
            assert resp.status_code == 403

    def test_yop_xodim_own(self, client_factory):
        """Xodim o'zining muammosini yopa oladi."""
        mock_user = _make_user(user_id=1, rol=UserRole.xodim)
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()

        mock_muammo = MagicMock()
        mock_muammo.xodim_id = 1  # own
        mock_muammo.tavsif = None
        closed_dict = _make_muammo_dict(status="yopilgan")

        with patch.object(muammo_service, "get_muammo", new_callable=AsyncMock) as mock_get, \
             patch.object(muammo_service, "_muammo_to_response", return_value=closed_dict):

            mock_get.return_value = mock_muammo

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.post("/api/muammolar/1/yop", json={"ornida_bartaraf": True})
            assert resp.status_code == 200

    def test_yop_not_found(self, client_factory):
        """Mavjud bo'lmagan muammoni yopish — 404."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        with patch.object(muammo_service, "get_muammo", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = HTTPException(status_code=404, detail="Muammo topilmadi")

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.post("/api/muammolar/999/yop", json={"ornida_bartaraf": True})
            assert resp.status_code == 404

    def test_yop_allaqachon_yopilgan_rad_etiladi(self, client_factory):
        """Allaqachon yopilgan muammoni qayta yopishga urinish — 422, cheksiz qayta yopishning oldi olinadi."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        mock_muammo = MagicMock()
        mock_muammo.xodim_id = 1
        mock_muammo.status = MuammoStatus.yopilgan

        with patch.object(muammo_service, "get_muammo", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_muammo

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.post("/api/muammolar/1/yop", json={"ornida_bartaraf": True})
            assert resp.status_code == 422
            assert resp.json()["ok"] is False
            # DB'ga hech narsa yozilmasligi kerak — status tekshiruvi flush'dan oldin bo'ladi
            mock_db.flush.assert_not_called()


# ============ POST /api/muammolar/{muammo_id}/fotolar ============

class TestAddFotolarEndpoint:

    def test_add_fotos_success(self, client_factory):
        """Fotolarni muvaffaqiyatli qo'shish."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()

        mock_muammo = MagicMock()
        mock_muammo.xodim_id = 1

        mock_foto = MagicMock(spec=Foto)
        mock_foto.id = 1
        mock_foto.turi = FotoTuri.keyin
        mock_foto.fayl_yoli = "uploads/foto1.jpg"
        mock_foto.yuklangan = datetime(2026, 7, 14, 10, 0, tzinfo=timezone.utc)

        with patch.object(muammo_service, "get_muammo", new_callable=AsyncMock) as mock_get, \
             patch.object(muammo_service, "add_fotos_to_muammo", new_callable=AsyncMock) as mock_add:

            mock_get.return_value = mock_muammo
            mock_add.return_value = [mock_foto]

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.post(
                "/api/muammolar/1/fotolar",
                json={
                    "fotolar": [
                        {"fayl_yoli": "uploads/foto1.jpg", "sha256": "a" * 64}
                    ]
                },
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["ok"] is True
            assert data["data"]["jami"] == 1
            assert len(data["data"]["fotolar"]) == 1

    def test_add_fotos_xodim_own(self, client_factory):
        """Xodim o'z muammosiga foto qo'sha oladi."""
        mock_user = _make_user(user_id=1, rol=UserRole.xodim)
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()

        mock_muammo = MagicMock()
        mock_muammo.xodim_id = 1

        mock_foto = MagicMock(spec=Foto)
        mock_foto.id = 1
        mock_foto.turi = FotoTuri.keyin
        mock_foto.fayl_yoli = "uploads/foto1.jpg"
        mock_foto.yuklangan = datetime(2026, 7, 14, 10, 0, tzinfo=timezone.utc)

        with patch.object(muammo_service, "get_muammo", new_callable=AsyncMock) as mock_get, \
             patch.object(muammo_service, "add_fotos_to_muammo", new_callable=AsyncMock) as mock_add:

            mock_get.return_value = mock_muammo
            mock_add.return_value = [mock_foto]

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.post(
                "/api/muammolar/1/fotolar",
                json={
                    "fotolar": [
                        {"fayl_yoli": "uploads/foto1.jpg", "sha256": "b" * 64}
                    ]
                },
            )
            assert resp.status_code == 200

    def test_add_fotos_xodim_others_forbidden(self, client_factory):
        """Xodim boshqa muammoga foto qo'sha olmaydi."""
        mock_user = _make_user(user_id=1, rol=UserRole.xodim)
        mock_db = AsyncMock()

        mock_muammo = MagicMock()
        mock_muammo.xodim_id = 2

        with patch.object(muammo_service, "get_muammo", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_muammo

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.post(
                "/api/muammolar/2/fotolar",
                json={
                    "fotolar": [
                        {"fayl_yoli": "uploads/foto1.jpg", "sha256": "b" * 64}
                    ]
                },
            )
            assert resp.status_code == 403

    def test_add_fotos_empty_list_validation(self, client_factory):
        """Bo'sh fotolar ro'yxati — validatsiya xatosi."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        mock_muammo = MagicMock()
        mock_muammo.xodim_id = 1

        with patch.object(muammo_service, "get_muammo", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_muammo

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.post(
                "/api/muammolar/1/fotolar",
                json={"fotolar": []},
            )
            assert resp.status_code == 422

    def test_add_fotos_not_found(self, client_factory):
        """Mavjud bo'lmagan muammoga foto qo'shish — 404."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        with patch.object(muammo_service, "get_muammo", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = HTTPException(status_code=404, detail="Muammo topilmadi")

            client = client_factory(
                user_override=lambda: mock_user,
                db_override=lambda: mock_db,
            )

            resp = client.post(
                "/api/muammolar/999/fotolar",
                json={"fotolar": [{"fayl_yoli": "uploads/f.jpg", "sha256": "c" * 64}]},
            )
            assert resp.status_code == 404
