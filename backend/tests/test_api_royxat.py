"""
XAVFSIZ XONADON — POST /api/auth/royxat (multipart) endpoint testlari.
Selfi majburiy: selfi'siz 422, selfi bilan 200 va profil_foto_url saqlanadi.
"""
import io

import pytest
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient

from app.main import create_app
from app.core.deps import get_db
from app.core.ratelimit import limiter


# ============ Helpers ============

def _make_jpeg_bytes() -> bytes:
    """Pillow orqali haqiqiy kichik JPEG baytlari."""
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (32, 32), (200, 100, 50)).save(buf, format="JPEG")
    return buf.getvalue()


FORM_DATA = {
    "guvohnoma_raqami": "XODIM777",
    "parol": "ValidPass1",
    "familiya": "Karimov",
    "ism": "Alisher",
    "sharif": "Olimovich",
    "lavozim": "MFY inspektori",
    "telefon": "+998901234567",
}


@pytest.fixture(autouse=True)
def reset_limiter():
    """Har testdan oldin rate limiter xotirasini tozalash (3/hour limit)."""
    limiter.reset()
    yield
    limiter.reset()


@pytest.fixture
def client_factory():
    """Mock DB bilan TestClient yaratish."""
    def _make_client():
        mock_db = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.refresh = AsyncMock()
        mock_db.add = MagicMock()
        # Guvohnoma raqami band emas — dublikat topilmaydi
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)

        app = create_app()
        app.dependency_overrides[get_db] = lambda: mock_db
        return TestClient(app), mock_db
    return _make_client


# ============ POST /api/auth/royxat ============

class TestRoyxatEndpoint:

    def test_royxat_selfisiz_422(self, client_factory):
        """Selfi yuborilmasa — 422 (selfi majburiy)."""
        client, _ = client_factory()

        resp = client.post("/api/auth/royxat", data=FORM_DATA)

        assert resp.status_code == 422

    def test_royxat_selfi_bilan_200_va_foto_saqlanadi(self, client_factory):
        """Selfi bilan — 200 va profil_foto_url saqlanadi."""
        client, mock_db = client_factory()

        resp = client.post(
            "/api/auth/royxat",
            data=FORM_DATA,
            files={"selfi": ("selfi.jpg", _make_jpeg_bytes(), "image/jpeg")},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert data["xato"] is None

        # db.add ga berilgan User'ning profil_foto_url maydoni to'ldirilgan
        user = mock_db.add.call_args.args[0]
        assert user.profil_foto_url is not None
        assert user.profil_foto_url.startswith("uploads/profil/")
        assert user.guvohnoma_raqami == "XODIM777"

    def test_royxat_notogri_fayl_turi_422(self, client_factory):
        """Rasm bo'lmagan fayl selfi sifatida yuborilsa — 422."""
        client, _ = client_factory()

        resp = client.post(
            "/api/auth/royxat",
            data=FORM_DATA,
            files={"selfi": ("selfi.txt", b"bu rasm emas", "text/plain")},
        )

        assert resp.status_code == 422
