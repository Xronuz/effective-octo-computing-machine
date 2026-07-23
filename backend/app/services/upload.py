"""
XAVFSIZ XONADON — Foto yuklash xizmati.
SHA256 tekshiruvi, fayl validatsiyasi, xavfsiz nomlash.
"""
import hashlib
import io
import logging
import os
import uuid
from pathlib import Path
from typing import Optional

from fastapi import UploadFile

from app.config import settings
from app.core.exceptions import ValidationException

# Try to import Pillow for image processing
try:
    from PIL import Image, ExifTags
    PILLOW_AVAILABLE = True
except ImportError:
    PILLOW_AVAILABLE = False

logger = logging.getLogger("xavfsiz_xonadon")

# Ruxsat etilgan MIME tiplar
ALLOWED_MIME = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

# Maksimal fayl o'lchami (bayt)
MAX_SIZE = settings.MAX_FOTO_SIZE_MB * 1024 * 1024


def _magic_bytes_ok(content_type: str, contents: bytes) -> bool:
    """Fayl mazmuni (magic bytes) Content-Type ga mosligini tekshirish."""
    if content_type == "image/jpeg":
        return contents[:3] == b"\xff\xd8\xff"
    if content_type == "image/png":
        return contents[:4] == b"\x89PNG"
    if content_type == "image/webp":
        return contents[:4] == b"RIFF" and contents[8:12] == b"WEBP"
    return False


def _get_upload_dir(subdir: str = "") -> Path:
    """Yuklash papkasini olish va kerak bo'lsa yaratish."""
    base = Path(settings.UPLOAD_DIR)
    if subdir:
        base = base / subdir
    base.mkdir(parents=True, exist_ok=True)
    return base


async def save_upload(
    file: UploadFile,
    subdir: str = "muammolar",
) -> dict:
    """
    Yuklangan faylni saqlash.
    sha256 ORIGINAL baytlardan hisoblanadi (siqishdan oldin) —
    dublikat tekshiruvi shu hash ustida ishlaydi.
    Qaytaradi: {"fayl_yoli": str, "sha256": str, "olcham_byte": int,
                "exif_lat": float|None, "exif_lng": float|None, "exif_vaqt": str|None}
    """
    # MIME turi tekshiruvi
    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME:
        raise ValidationException(
            f"Ruxsat etilmagan fayl turi: {content_type}. "
            f"Ruxsat etilgan: JPEG, PNG, WebP"
        )

    # Faylni xotiraga o'qish (o'lcham tekshiruvi bilan)
    contents = await file.read()

    if len(contents) == 0:
        raise ValidationException("Bo'sh fayl yuklab bo'lmaydi.")

    if len(contents) > MAX_SIZE:
        raise ValidationException(
            f"Fayl hajmi {settings.MAX_FOTO_SIZE_MB} MB dan oshmasligi kerak. "
            f"Hozirgi: {len(contents) / 1024 / 1024:.1f} MB"
        )

    # SHA256 — ORIGINAL yuklangan baytlardan (siqishdan OLDIN).
    # Dublikat tekshiruvi klient va server bir xil baytlar ustida ishlashi uchun.
    original_sha256 = hashlib.sha256(contents).hexdigest()

    # Magic bytes tekshiruvi — Content-Type headerga ishonib bo'lmaydi
    if not _magic_bytes_ok(content_type, contents):
        raise ValidationException(
            "Fayl mazmuni rasm formatiga mos kelmaydi (magic bytes tekshiruvi)."
        )

    # Pillow bilan qat'iy validatsiya — ochib bo'lmasa fayl SAQLANMAYDI
    image = None
    if PILLOW_AVAILABLE:
        try:
            image = Image.open(io.BytesIO(contents))
            image.load()
        except Exception as exc:
            logger.warning("Buzilgan rasm fayli rad etildi: %s", exc)
            raise ValidationException(
                "Rasm fayli buzilgan yoki noto'g'ri formatda."
            )

    # EXIF ma'lumotlarini auszib olish
    exif_lat: Optional[float] = None
    exif_lng: Optional[float] = None
    exif_vaqt: Optional[str] = None

    if image is not None:
        try:
            exif_data = image.getexif()

            if exif_data:
                # GPS ma'lumotlarini auszib olish
                gps_info = exif_data.get(34853)  # GPSInfo tag
                if gps_info:
                    def _convert_to_degrees(value):
                        """Convert GPS coordinates to decimal degrees"""
                        d, m, s = value
                        return float(d) + float(m) / 60 + float(s) / 3600

                    try:
                        # GPS latitude
                        lat_ref = gps_info.get(1)  # N or S
                        lat_val = gps_info.get(2)  # degrees, minutes, seconds
                        if lat_ref and lat_val:
                            lat = _convert_to_degrees(lat_val)
                            if lat_ref == 'S':
                                lat = -lat
                            exif_lat = lat

                        # GPS longitude
                        lng_ref = gps_info.get(3)  # E or W
                        lng_val = gps_info.get(4)  # degrees, minutes, seconds
                        if lng_ref and lng_val:
                            lng = _convert_to_degrees(lng_val)
                            if lng_ref == 'W':
                                lng = -lng
                            exif_lng = lng
                    except (ValueError, TypeError, IndexError) as exc:
                        logger.debug("EXIF GPS koordinatalarini ajratib olib bo'lmadi: %s", exc)

                # DateTimeOriginal ni auszib olish (tag 36867)
                datetime_original = exif_data.get(36867)
                if datetime_original:
                    try:
                        exif_vaqt = str(datetime_original)
                        if len(exif_vaqt) < 10:
                            exif_vaqt = None
                    except Exception as exc:
                        logger.debug("EXIF DateTimeOriginal ajratib olishda xatolik: %s", exc)
                        exif_vaqt = None
        except Exception as exc:
            logger.debug("Rasm EXIF ma'lumotlarini o'qishda xatolik: %s", exc)

    # Rasimni kompaksaytirish (max 1600px, JPEG quality 75)
    if image is not None:
        try:
            # RGB ga o'zgartirish agar kerak bo'lsa (JPEG uchun)
            if image.mode in ('RGBA', 'LA', 'P'):
                rgb_image = Image.new('RGB', image.size, (255, 255, 255))
                rgb_image.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = rgb_image
            elif image.mode != 'RGB':
                image = image.convert('RGB')

            # Maksimal 1600px uzunlikka o'lchamini hisoblash
            max_size = 1600
            width, height = image.size
            if width > max_size or height > max_size:
                if width > height:
                    new_width = max_size
                    new_height = int(round(height * max_size / width))
                else:
                    new_height = max_size
                    new_width = int(round(width * max_size / height))
                image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)

            # JPEG formatida saqlash, quality 75
            output_buffer = io.BytesIO()
            image.save(output_buffer, format='JPEG', quality=75)
            contents = output_buffer.getvalue()
        except Exception as exc:
            logger.warning("Rasmni kompaksaytirishda xatolik, fayl rad etildi: %s", exc)
            raise ValidationException(
                "Rasmni qayta ishlashda xatolik yuz berdi."
            )

    # Fayl kengaytmasi
    ext_map = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }
    ext = ext_map.get(content_type, ".bin")

    # Xavfsiz nom: UUID + kengaytma
    filename = f"{uuid.uuid4().hex}{ext}"

    # Saqlash
    upload_dir = _get_upload_dir(subdir)
    filepath = upload_dir / filename
    filepath.write_bytes(contents)

    # Nisbiy yo'l (API orqali xizmat ko'rsatish uchun)
    relative_path = f"uploads/{subdir}/{filename}"

    logger.info(
        f"Foto saqlandi: {relative_path} "
        f"({len(contents) / 1024:.1f} KB, sha256={original_sha256[:12]}...)"
    )

    return {
        "fayl_yoli": relative_path,
        "sha256": original_sha256,
        "olcham_byte": len(contents),
        "exif_lat": exif_lat,
        "exif_lng": exif_lng,
        "exif_vaqt": exif_vaqt,
    }


def get_file_abs_path(relative_path: str) -> Optional[Path]:
    """Nisbiy yo'ldan absolyut fayl yo'lini olish."""
    # Xavfsizlik: path traversal oldini olish
    safe = relative_path.replace("..", "").lstrip("/")
    abs_path = Path(settings.UPLOAD_DIR).parent.parent / safe
    if abs_path.exists() and abs_path.is_file():
        return abs_path
    return None


def delete_upload(relative_path: str) -> bool:
    """Yuklangan faylni o'chirish."""
    abs_path = get_file_abs_path(relative_path)
    if abs_path:
        abs_path.unlink()
        logger.info(f"Foto o'chirildi: {relative_path}")
        return True
    return False
