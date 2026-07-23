"""
XAVFSIZ XONADON — Statistika API endpoint testlari.
FastAPI TestClient + Dependency Injection mock.
patch.object bilan, test_api_muammo.py namunasi bo'yicha.
"""
import io
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.main import create_app
from app.core.deps import get_current_user, get_db
from app.models.user import User, UserRole
from app.services import statistika as stat_service
from app.schemas.statistika import (
    UmumiyStatistika, MuammoTuriStat, MuammoXavfStat,
    MuammoStatusStat, MFYStatistika, TopshiriqStat,
    IntizomStat, VaqtDavriStat, StatistikaResponse,
    XodimStatistika,
)


# ============ Helpers ============

def _make_user(user_id=1, rol=UserRole.xodim):
    u = MagicMock(spec=User)
    u.id = user_id
    u.guvohnoma_raqami = f"XODIM{user_id:03d}"
    u.rol = rol
    u.holat = "faol"
    u.full_name = f"Test User {user_id}"
    u.bloklangan = False
    u.tasdiqlangan = True
    return u


def _make_mock_statistika_response() -> StatistikaResponse:
    return StatistikaResponse(
        umumiy=UmumiyStatistika(
            xonadon_soni=500, muammo_soni=120, ochiq_muammolar=45,
            yopilgan_muammolar=75, xodim_soni=12, mfy_soni=53,
            tekshirilgan_xonadon=320, foiz=64.0,
        ),
        muammo_turlari=[
            MuammoTuriStat(turi="ochiq_elektr_simi", soni=40),
            MuammoTuriStat(turi="gaz_hidi", soni=35),
        ],
        muammo_xavf=[MuammoXavfStat(xavf="yuqori", soni=30)],
        muammo_status=[MuammoStatusStat(status="ochiq", soni=45)],
        mfylar=[MFYStatistika(mfy_id=1, mfy_nomi="Namuna", xonadon_soni=100, tekshirilgan=60, ochiq_muammo=10, yopilgan_muammo=5, foiz=60.0)],
        topshiriqlar=TopshiriqStat(jami=50, yangi=10, korildi=20, bajarildi=15, kechikkan=5),
        intizom=IntizomStat(jami=8, ogohlantirish=5, hayfsan=2, ragbat=1),
        vaqt_dinamika=[VaqtDavriStat(davr="2026-07", ochilgan=30, yopilgan=25)],
    )


def _make_mock_xodim_list():
    return [
        XodimStatistika(xodim_id=1, xodim_fio="Ali Valiyev", jami_muammo=25, ochiq_muammo=5, yopilgan_muammo=20, jami_tekshirish=30, oxirgi_faollik="2026-07-14T10:00:00Z"),
        XodimStatistika(xodim_id=2, xodim_fio="Bekzod Karimov", jami_muammo=18, ochiq_muammo=3, yopilgan_muammo=15, jami_tekshirish=22, oxirgi_faollik=None),
    ]


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


# ============ GET /api/statistika ============

class TestGetStatistika:

    def test_success_as_xodim(self, client_factory):
        """Xodim rolida to'liq statistikani olish."""
        mock_user = _make_user(rol=UserRole.xodim)
        mock_db = AsyncMock()

        with patch.object(stat_service, "get_full_statistika", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = _make_mock_statistika_response()
            client = client_factory(user_override=lambda: mock_user, db_override=lambda: mock_db)
            resp = client.get("/api/statistika")

        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert data["data"]["umumiy"]["xonadon_soni"] == 500
        assert data["data"]["umumiy"]["mfy_soni"] == 53
        assert len(data["data"]["muammo_turlari"]) == 2

    def test_success_as_rahbar(self, client_factory):
        """Rahbar rolida to'liq statistikani olish."""
        mock_user = _make_user(rol=UserRole.rahbar)
        mock_db = AsyncMock()

        with patch.object(stat_service, "get_full_statistika", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = _make_mock_statistika_response()
            client = client_factory(user_override=lambda: mock_user, db_override=lambda: mock_db)
            resp = client.get("/api/statistika")

        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert data["xato"] is None

    def test_requires_auth(self, client_factory):
        """Autentifikatsiyasiz so'rovga 422 qaytariladi."""
        mock_db = AsyncMock()
        client = client_factory(user_override=None, db_override=lambda: mock_db)
        resp = client.get("/api/statistika")
        assert resp.status_code in [422, 403]

    def test_service_error_returns_ok_false(self, client_factory):
        """Xizmat xatolik berganda ok=False qaytadi."""
        mock_user = _make_user()
        mock_db = AsyncMock()

        with patch.object(stat_service, "get_full_statistika", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = Exception("DB ulanish xatosi")
            client = client_factory(user_override=lambda: mock_user, db_override=lambda: mock_db)
            resp = client.get("/api/statistika")

        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is False
        assert data["xato"] is not None
        assert "DB ulanish xatosi" in data["xato"]

    def test_returns_all_sections(self, client_factory):
        """Javobda barcha bo'limlar mavjud."""
        mock_user = _make_user()
        mock_db = AsyncMock()

        with patch.object(stat_service, "get_full_statistika", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = _make_mock_statistika_response()
            client = client_factory(user_override=lambda: mock_user, db_override=lambda: mock_db)
            resp = client.get("/api/statistika")

        data = resp.json()["data"]
        assert "umumiy" in data
        assert "muammo_turlari" in data
        assert "muammo_xavf" in data
        assert "muammo_status" in data
        assert "mfylar" in data
        assert "topshiriqlar" in data
        assert "intizom" in data
        assert "vaqt_dinamika" in data


# ============ GET /api/statistika/xodimlar ============

class TestGetXodimStatistika:

    def test_success_with_default_pagination(self, client_factory):
        """Default pagination bilan xodimlar statistikasi."""
        mock_user = _make_user()
        mock_db = AsyncMock()
        xodimlar = _make_mock_xodim_list()

        with patch.object(stat_service, "get_xodim_statistika", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = (xodimlar, 2)
            client = client_factory(user_override=lambda: mock_user, db_override=lambda: mock_db)
            resp = client.get("/api/statistika/xodimlar")

        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert data["data"]["total"] == 2
        assert data["data"]["page"] == 1
        assert data["data"]["size"] == 20
        assert data["data"]["pages"] == 1
        assert len(data["data"]["items"]) == 2

    def test_custom_pagination(self, client_factory):
        """Maxsus page va size bilan xodimlar statistikasi."""
        mock_user = _make_user()
        mock_db = AsyncMock()
        xodimlar = _make_mock_xodim_list()

        with patch.object(stat_service, "get_xodim_statistika", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = (xodimlar, 2)
            client = client_factory(user_override=lambda: mock_user, db_override=lambda: mock_db)
            resp = client.get("/api/statistika/xodimlar?page=2&size=10")

        assert resp.status_code == 200
        data = resp.json()
        assert data["data"]["page"] == 2
        assert data["data"]["size"] == 10

    def test_empty_result(self, client_factory):
        """Xodimlar ro'yxati bo'sh."""
        mock_user = _make_user()
        mock_db = AsyncMock()

        with patch.object(stat_service, "get_xodim_statistika", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = ([], 0)
            client = client_factory(user_override=lambda: mock_user, db_override=lambda: mock_db)
            resp = client.get("/api/statistika/xodimlar")

        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert data["data"]["total"] == 0
        assert len(data["data"]["items"]) == 0
        assert data["data"]["pages"] == 0

    def test_service_error(self, client_factory):
        """Xodim statistikasida xatolik."""
        mock_user = _make_user()
        mock_db = AsyncMock()

        with patch.object(stat_service, "get_xodim_statistika", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = Exception("Query xatosi")
            client = client_factory(user_override=lambda: mock_user, db_override=lambda: mock_db)
            resp = client.get("/api/statistika/xodimlar")

        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is False
        assert "Query xatosi" in data["xato"]

    def test_invalid_page_param_clamped(self, client_factory):
        """page=0 (ge=1 chegarasi) → 422."""
        mock_user = _make_user()
        mock_db = AsyncMock()
        client = client_factory(user_override=lambda: mock_user, db_override=lambda: mock_db)
        resp = client.get("/api/statistika/xodimlar?page=0")
        assert resp.status_code == 422

    def test_invalid_size_param_clamped(self, client_factory):
        """size=500 (le=100 chegarasi) → 422."""
        mock_user = _make_user()
        mock_db = AsyncMock()
        client = client_factory(user_override=lambda: mock_user, db_override=lambda: mock_db)
        resp = client.get("/api/statistika/xodimlar?size=500")
        assert resp.status_code == 422


# ============ GET /api/statistika/excel ============

class TestGetExcelExport:

    def test_success_returns_xlsx(self, client_factory):
        """Excel eksport muvaffaqiyatli — to'g'ri content-type."""
        mock_user = _make_user()
        mock_db = AsyncMock()

        fake_bytes_content = io.BytesIO(b"fake-xlsx-bytes")

        with patch.object(stat_service, "get_full_statistika", new_callable=AsyncMock) as mock_get, \
             patch.object(stat_service, "generate_excel", return_value=fake_bytes_content) as mock_excel:
            mock_get.return_value = _make_mock_statistika_response()
            client = client_factory(user_override=lambda: mock_user, db_override=lambda: mock_db)
            resp = client.get("/api/statistika/excel")

        assert resp.status_code == 200
        assert "spreadsheetml" in resp.headers.get("content-type", "")
        assert "xavfsiz_xonadon_statistika.xlsx" in resp.headers.get("content-disposition", "")
        assert resp.content == fake_bytes_content.getvalue()

    def test_error_returns_json(self, client_factory):
        """Excel eksportda xatolik — JSON xatolik qaytariladi."""
        mock_user = _make_user()
        mock_db = AsyncMock()

        with patch.object(stat_service, "get_full_statistika", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = Exception("Excel yaratishda xatolik")
            client = client_factory(user_override=lambda: mock_user, db_override=lambda: mock_db)
            resp = client.get("/api/statistika/excel")

        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is False
        assert "Excel" in data["xato"]

    def test_requires_auth(self, client_factory):
        """Autentifikatsiyasiz Excel so'rovi."""
        mock_db = AsyncMock()
        client = client_factory(user_override=None, db_override=lambda: mock_db)
        resp = client.get("/api/statistika/excel")
        assert resp.status_code in [422, 403]


# ============ GET /api/statistika/pdf ============

class TestGetPdfExport:

    def test_success_returns_pdf(self, client_factory):
        """PDF eksport muvaffaqiyatli — to'g'ri content-type."""
        mock_user = _make_user()
        mock_db = AsyncMock()

        fake_pdf_content = io.BytesIO(b"%PDF-1.4 fake pdf content")

        with patch.object(stat_service, "get_full_statistika", new_callable=AsyncMock) as mock_get, \
             patch.object(stat_service, "generate_pdf", return_value=fake_pdf_content) as mock_pdf:
            mock_get.return_value = _make_mock_statistika_response()
            client = client_factory(user_override=lambda: mock_user, db_override=lambda: mock_db)
            resp = client.get("/api/statistika/pdf")

        assert resp.status_code == 200
        assert "pdf" in resp.headers.get("content-type", "")
        assert "xavfsiz_xonadon_statistika.pdf" in resp.headers.get("content-disposition", "")
        assert resp.content == fake_pdf_content.getvalue()

    def test_error_returns_json(self, client_factory):
        """PDF eksportda xatolik — JSON xatolik."""
        mock_user = _make_user()
        mock_db = AsyncMock()

        with patch.object(stat_service, "get_full_statistika", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = Exception("PDF yaratishda xatolik")
            client = client_factory(user_override=lambda: mock_user, db_override=lambda: mock_db)
            resp = client.get("/api/statistika/pdf")

        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is False
        assert "PDF" in data["xato"]

    def test_requires_auth(self, client_factory):
        """Autentifikatsiyasiz PDF so'rovi."""
        mock_db = AsyncMock()
        client = client_factory(user_override=None, db_override=lambda: mock_db)
        resp = client.get("/api/statistika/pdf")
        assert resp.status_code in [422, 403]
