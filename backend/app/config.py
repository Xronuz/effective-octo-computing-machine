"""
XAVFSIZ XONADON — Konfiguratsiya boshqaruvi
Barcha muhit o'zgaruvchilari shu yerda markazlashtirilgan.
"""

from pydantic import model_validator
from pydantic_settings import BaseSettings
from typing import List
import json
import secrets
import sys

# Repo tarixida ochiq tarqalgan eski dev JWT_SECRET — endi default emas, faqat
# aniqlash uchun saqlanadi: kimda .env ichida shu qiymat qolgan bo'lsa,
# almashtirishi shart (u GitHub'da hammaga ko'rinadi).
_LEAKED_JWT_SECRET = "0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2"
_DEFAULT_DB_PASSWORD = "almashtirilsin_2026"


class Settings(BaseSettings):
    # ============ Ilova ============
    APP_ENV: str = "development"  # development, staging, production
    DEBUG: bool = False

    # ============ Database ============
    DATABASE_URL: str = "postgresql+asyncpg://xavfsiz_user:almashtirilsin_2026@localhost:5432/xavfsiz_xonadon"

    # ============ JWT ============
    # Default yo'q: production'da bo'sh bo'lsa start to'xtaydi, dev'da esa
    # har ishga tushishda tasodifiy qiymat generatsiya qilinadi.
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ============ Bcrypt ============
    BCRYPT_COST: int = 12

    # ============ Telegram ============
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_GROUP_CHAT_ID: str = ""

    # ============ Foto ============
    UPLOAD_DIR: str = "/app/uploads"
    MAX_FOTO_SIZE_MB: int = 10

    # ============ CORS ============
    CORS_ORIGINS: str = '["http://localhost:5173","http://localhost:3000"]'

    @property
    def cors_origins_list(self) -> list[str]:
        """CORS_ORIGINS JSON string → list. Agar parse qilib bo'lmasa default."""
        try:
            return json.loads(self.CORS_ORIGINS)
        except (json.JSONDecodeError, TypeError):
            return ["http://localhost:5173", "http://localhost:3000"]

    # ============ Expo Push ============
    EXPO_ACCESS_TOKEN: str = ""

    # ============ Backup ============
    BACKUP_DIR: str = "/backups"
    BACKUP_ENCRYPT_PASSWORD: str = ""

    # ============ Ish vaqti ============
    ISH_BOSHLANISH_SOAT: int = 9   # 09:00
    ISH_TUGASH_SOAT: int = 18      # 18:00

    # ============ Lokatsiya ============
    LOKATSIYA_SAQLASH_KUN: int = 90  # 90 kundan eski loglar o'chiriladi

    # ============ Rate limit ============
    LOGIN_RATE_LIMIT: str = "5/15m"  # 5 urinish / 15 daqiqa

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",  # noma'lum o'zgaruvchilarni e'tiborsiz qoldir
    }

    @model_validator(mode="after")
    def check_production_secrets(self):
        """
        Production'da bo'sh/tarqalgan secret yoki default DB paroli bo'lsa —
        start'da to'xtatish. Dev'da JWT_SECRET bo'sh bo'lsa tasodifiy
        generatsiya qilinadi (repo'da hech qanday ishlaydigan secret yotmaydi).
        """
        if self.APP_ENV != "production":
            if not self.JWT_SECRET:
                self.JWT_SECRET = secrets.token_hex(32)
                print(
                    "⚠️  JWT_SECRET berilmagan — bu ishga tushish uchun tasodifiy "
                    "qiymat generatsiya qilindi. Restart'dan keyin barcha tokenlar "
                    "bekor bo'ladi. Barqaror dev sessiyasi uchun .env ichida "
                    "JWT_SECRET bering (openssl rand -hex 32).",
                    file=sys.stderr,
                )
            elif self.JWT_SECRET == _LEAKED_JWT_SECRET:
                print(
                    "⚠️  JWT_SECRET repo tarixidagi ochiq tarqalgan qiymatga teng — "
                    "uni almashtiring (openssl rand -hex 32).",
                    file=sys.stderr,
                )
            return self

        xatolar = []
        if not self.JWT_SECRET:
            xatolar.append("JWT_SECRET berilmagan — uni .env ichida belgilang")
        elif self.JWT_SECRET == _LEAKED_JWT_SECRET:
            xatolar.append(
                "JWT_SECRET repo tarixidagi ochiq tarqalgan qiymatda — uni almashtiring"
            )
        elif len(self.JWT_SECRET) < 32:
            xatolar.append("JWT_SECRET juda qisqa — kamida 32 belgi bo'lsin")
        if _DEFAULT_DB_PASSWORD in self.DATABASE_URL:
            xatolar.append("DATABASE_URL ichida default DB paroli qolgan — uni almashtiring")
        if xatolar:
            raise ValueError(
                "XAVFSIZLIK XATOSI (APP_ENV=production): " + "; ".join(xatolar)
            )
        return self


# Global settings obyekti — hamma joyda shu ishlatiladi
settings = Settings()
