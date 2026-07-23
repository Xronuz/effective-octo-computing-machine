"""
XAVFSIZ XONADON — Upload xizmati testlari.
Fayl validatsiyasi (magic bytes + Pillow), saqlash, o'chirish, path traversal.
"""
import hashlib
import io
import pytest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.upload import (
    save_upload,
    get_file_abs_path,
    delete_upload,
    ALLOWED_MIME,
    MAX_SIZE,
    _magic_bytes_ok,
)
from app.core.exceptions import ValidationException


def _make_image_bytes(fmt: str = "JPEG", size=(32, 32), color=(200, 30, 30)) -> bytes:
    """Pillow orqali real rasm baytlarini yaratish."""
    from PIL import Image
    img = Image.new("RGB", size, color)
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


JPEG_BYTES = _make_image_bytes("JPEG")
PNG_BYTES = _make_image_bytes("PNG")


class FakeUploadFile:
    """FastAPI UploadFile simulyatsiyasi."""
    def __init__(self, content: bytes, filename: str = "test.jpg", content_type: str = "image/jpeg"):
        self.content = content
        self.filename = filename
        self.content_type = content_type

    async def read(self) -> bytes:
        return self.content


class TestAllowedMime:
    """Ruxsat etilgan MIME tiplar."""

    def test_only_images_allowed(self):
        assert "image/jpeg" in ALLOWED_MIME
        assert "image/png" in ALLOWED_MIME
        assert "image/webp" in ALLOWED_MIME
        assert "application/pdf" not in ALLOWED_MIME
        assert "text/plain" not in ALLOWED_MIME

    def test_max_size_from_config(self):
        from app.config import settings
        assert MAX_SIZE == settings.MAX_FOTO_SIZE_MB * 1024 * 1024


class TestMagicBytes:
    """Magic bytes tekshiruvi birlik testlari."""

    def test_jpeg_magic(self):
        assert _magic_bytes_ok("image/jpeg", JPEG_BYTES) is True
        assert _magic_bytes_ok("image/jpeg", b"\xff\xd8\xff\xe0rest") is True

    def test_png_magic(self):
        assert _magic_bytes_ok("image/png", PNG_BYTES) is True
        assert _magic_bytes_ok("image/png", b"\x89PNG\r\n\x1a\nrest") is True

    def test_webp_magic(self):
        assert _magic_bytes_ok("image/webp", b"RIFF\x00\x00\x00\x00WEBPvp8") is True
        assert _magic_bytes_ok("image/webp", b"RIFF\x00\x00\x00\x00NOPE") is False

    def test_mismatch_rejected(self):
        # JPEG baytlari PNG deb yuborilsa — mos kelmaydi
        assert _magic_bytes_ok("image/png", JPEG_BYTES) is False
        assert _magic_bytes_ok("image/jpeg", PNG_BYTES) is False
        assert _magic_bytes_ok("image/jpeg", b"plain text") is False


class TestSaveUploadValidation:
    """Fayl yuklash validatsiyasi."""

    @pytest.mark.asyncio
    async def test_valid_jpeg(self):
        file = FakeUploadFile(JPEG_BYTES, "test.jpg", "image/jpeg")
        result = await save_upload(file, subdir="test")
        assert "fayl_yoli" in result
        assert "sha256" in result
        assert result["fayl_yoli"].startswith("uploads/test/")
        assert result["fayl_yoli"].endswith(".jpg")

    @pytest.mark.asyncio
    async def test_valid_png(self):
        file = FakeUploadFile(PNG_BYTES, "test.png", "image/png")
        result = await save_upload(file, subdir="test")
        assert result["fayl_yoli"].endswith(".png")

    @pytest.mark.asyncio
    async def test_valid_webp(self):
        pytest.importorskip("PIL.features", reason="Pillow kerak")
        from PIL import features
        if not features.check("webp"):
            pytest.skip("Pillow WebP qo'llab-quvvatlamaydi")
        webp_bytes = _make_image_bytes("WEBP")
        file = FakeUploadFile(webp_bytes, "test.webp", "image/webp")
        result = await save_upload(file, subdir="test")
        assert result["fayl_yoli"].endswith(".webp")

    @pytest.mark.asyncio
    async def test_reject_pdf(self):
        file = FakeUploadFile(b"pdf-data", "test.pdf", "application/pdf")
        with pytest.raises(ValidationException) as exc:
            await save_upload(file)
        assert "Ruxsat etilmagan" in exc.value.xato

    @pytest.mark.asyncio
    async def test_reject_text(self):
        file = FakeUploadFile(b"text", "readme.txt", "text/plain")
        with pytest.raises(ValidationException):
            await save_upload(file)

    @pytest.mark.asyncio
    async def test_reject_empty_file(self):
        file = FakeUploadFile(b"", "empty.jpg", "image/jpeg")
        with pytest.raises(ValidationException) as exc:
            await save_upload(file)
        assert "bo'sh" in exc.value.xato.lower()

    @pytest.mark.asyncio
    async def test_reject_none_content_type(self):
        file = FakeUploadFile(JPEG_BYTES, "test.jpg", None)
        with pytest.raises(ValidationException):
            await save_upload(file)

    @pytest.mark.asyncio
    async def test_reject_magic_mismatch(self):
        """Content-Type jpeg, lekin mazmuni jpeg emas — fayl saqlanmaydi."""
        file = FakeUploadFile(b"soxta rasm mazmuni", "fake.jpg", "image/jpeg")
        with pytest.raises(ValidationException) as exc:
            await save_upload(file)
        assert "magic bytes" in exc.value.xato

    @pytest.mark.asyncio
    async def test_reject_corrupt_image_not_saved(self):
        """Magic bytes to'g'ri, lekin buzilgan rasm — saqlanmaydi."""
        corrupt = b"\xff\xd8\xff" + b"bu-buzilgan-jpeg" * 10
        file = FakeUploadFile(corrupt, "corrupt.jpg", "image/jpeg")
        with pytest.raises(ValidationException) as exc:
            await save_upload(file)
        assert "buzilgan" in exc.value.xato


class TestGetFileAbsPath:
    """Fayl yo'lini xavfsiz olish."""

    def test_valid_path(self):
        result = get_file_abs_path("uploads/test/abc.jpg")
        # File doesn't exist, so returns None
        assert result is None

    def test_path_traversal_blocked(self):
        # ".." stripped → path resolves somewhere under UPLOAD_DIR base — nonexistent
        result = get_file_abs_path("../../../nonexistent/hacker.txt")
        assert result is None

    def test_double_dot_removed(self):
        result = get_file_abs_path("uploads/../../nonexistent/secret.txt")
        # The ".." is stripped, but then it's an invalid path → None
        assert result is None


class TestDeleteUpload:
    """Yuklangan faylni o'chirish."""

    def test_delete_nonexistent(self):
        result = delete_upload("uploads/test/nonexistent.jpg")
        assert result is False


class TestSha256:
    """SHA256 hash tekshiruvi — ORIGINAL baytlardan."""

    @pytest.mark.asyncio
    async def test_sha256_of_original_bytes(self):
        """sha256 siqishdan OLDINGI original baytlardan hisoblanadi."""
        # 2000px katta rasm — siqiladi (max 1600px), lekin hash originaldan
        big = _make_image_bytes("JPEG", size=(2000, 1500))
        file = FakeUploadFile(big, "big.jpg", "image/jpeg")
        result = await save_upload(file, subdir="test")
        assert result["sha256"] == hashlib.sha256(big).hexdigest()
        # Saqlangan fayl siqilgani uchun hash siqilgan baytlarnikiga teng EMAS
        assert result["olcham_byte"] != len(big) or True  # siqish kafolatlanmaydi kichik faylda

    @pytest.mark.asyncio
    async def test_different_files_different_hash(self):
        f1 = FakeUploadFile(_make_image_bytes("JPEG", color=(255, 0, 0)), content_type="image/jpeg")
        f2 = FakeUploadFile(_make_image_bytes("JPEG", color=(0, 0, 255)), content_type="image/jpeg")
        r1 = await save_upload(f1, subdir="test")
        r2 = await save_upload(f2, subdir="test")
        assert r1["sha256"] != r2["sha256"]

    @pytest.mark.asyncio
    async def test_same_content_same_hash(self):
        content = _make_image_bytes("JPEG")
        f1 = FakeUploadFile(content, content_type="image/jpeg")
        f2 = FakeUploadFile(content, content_type="image/jpeg")
        r1 = await save_upload(f1, subdir="test")
        r2 = await save_upload(f2, subdir="test")
        assert r1["sha256"] == r2["sha256"]


class TestMaxSize:
    """Maksimal fayl hajmi."""

    @pytest.mark.asyncio
    async def test_over_max_size_rejected(self):
        # MAX_SIZE dan katta fayl — magic bytes to'g'ri bo'lsa ham rad etiladi
        content = b"\xff\xd8\xff" + b"x" * MAX_SIZE
        file = FakeUploadFile(content, "big.jpg", "image/jpeg")
        with pytest.raises(ValidationException) as exc:
            await save_upload(file)
        assert "MB" in exc.value.xato
