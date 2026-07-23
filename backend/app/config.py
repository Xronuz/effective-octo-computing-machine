"""
XAVFSIZ XONADON — Konfiguratsiya boshqaruvi
Barcha muhit o'zgaruvchilari shu yerda markazlashtirilgan.
"""

from pydantic import model_validator
from pydantic_settings import BaseSettings
from typing import List
import json

# Dev compose uchun default qiymatlar — production'da almashtirilishi shart
_DEFAULT_JWT_SECRET = "0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2"
_DEFAULT_DB_PASSWORD = "almashtirilsin_2026"


class Settings(BaseSettings):
    # ============ Ilova ============
    APP_ENV: str = "development"  # development, staging, production
    DEBUG: bool = False

    # ============ Database ============
    DATABASE_URL: str = "postgresql+asyncpg://xavfsiz_user:almashtirilsin_2026@localhost:5432/xavfsiz_xonadon"

    # ============ JWT ============
    JWT_SECRET: str = "0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2"
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
        """Production'da default secret/parol qolgan bo'lsa — start'da to'xtatish."""
        if self.APP_ENV != "production":
            return self
        xatolar = []
        if self.JWT_SECRET == _DEFAULT_JWT_SECRET:
            xatolar.append("JWT_SECRET default qiymatda qolgan — uni almashtiring")
        if _DEFAULT_DB_PASSWORD in self.DATABASE_URL:
            xatolar.append("DATABASE_URL ichida default DB paroli qolgan — uni almashtiring")
        if xatolar:
            raise ValueError(
                "XAVFSIZLIK XATOSI (APP_ENV=production): " + "; ".join(xatolar)
            )
        return self


# Global settings obyekti — hamma joyda shu ishlatiladi
settings = Settings()
