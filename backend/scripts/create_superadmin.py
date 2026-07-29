"""
XAVFSIZ XONADON — Superadmin yaratish skripti
Agar superadmin mavjud bo'lmasa, yaratadi. Idempotent.

Ishga tushirish:
    python scripts/create_superadmin.py
"""

import asyncio
import getpass
import secrets
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from app.database import async_session
from app.models.user import User, UserRole, UserStatus
from app.core.security import hash_password, validate_password_strength, validate_guvohnoma_raqami

# ============================================================
# SUPERADMIN SOZLAMALARI
# Parol bu yerda saqlanmaydi — SUPERADMIN_PAROL env yoki getpass orqali olinadi
# ============================================================
SUPERADMIN = {
    "guvohnoma_raqami": "ADMIN001",
    "familiya": "Adminov",
    "ism": "Admin",
    "sharif": "Adminovich",
    "lavozim": "Tizim administratori",
    "telefon": "+998901234567",
    "rol": UserRole.superadmin,
    "holat": UserStatus.faol,
}


def generate_parol() -> str:
    """Kuchli tasodifiy parol — validate_password_strength talablariga mos."""
    alifbo = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
    while True:
        parol = "".join(secrets.choice(alifbo) for _ in range(20))
        try:
            validate_password_strength(parol)
            return parol
        except Exception:
            continue


def get_superadmin_parol() -> tuple[str, bool]:
    """
    Parolni SUPERADMIN_PAROL env'dan, bo'lmasa interaktiv getpass orqali olish.
    Production'dan tashqari muhitlarda va interaktiv rejim yo'q bo'lsa —
    tasodifiy parol generatsiya qilinadi (repo'da hech qanday default parol
    saqlanmaydi). Qaytaradi: (parol, generatsiya_qilindimi).
    """
    parol = os.environ.get("SUPERADMIN_PAROL", "").strip()
    if parol:
        return parol, False

    if not sys.stdin.isatty():
        if os.environ.get("APP_ENV", "development") == "production":
            print(
                "❌ Xatolik: APP_ENV=production, lekin SUPERADMIN_PAROL muhit "
                "o'zgaruvchisi berilmagan va interaktiv rejim mavjud emas."
            )
            sys.exit(1)
        return generate_parol(), True

    parol = getpass.getpass("Superadmin parolini kiriting: ").strip()
    if not parol:
        print("❌ Xatolik: parol bo'sh bo'lishi mumkin emas.")
        sys.exit(1)
    return parol, False


async def create_superadmin():
    """Superadmin yaratish. Agar mavjud bo'lsa — o'tkazib yuboriladi."""
    parol, generatsiya_qilindi = get_superadmin_parol()

    async with async_session() as session:
        # Tekshirish: shu guvohnoma raqamli superadmin bormi?
        result = await session.execute(
            select(User).where(
                User.guvohnoma_raqami == SUPERADMIN["guvohnoma_raqami"]
            )
        )
        existing = result.scalars().first()

        if existing:
            print(f"⚠️  Superadmin allaqachon mavjud: {existing.full_name}")
            print(f"   Guvohnoma: {existing.guvohnoma_raqami}, Rol: {getattr(existing.rol, 'value', existing.rol)}")
            return

        # Validatsiya
        validate_guvohnoma_raqami(SUPERADMIN["guvohnoma_raqami"])
        validate_password_strength(parol)

        # Yaratish
        user = User(
            guvohnoma_raqami=SUPERADMIN["guvohnoma_raqami"],
            parol_hash=hash_password(parol),
            familiya=SUPERADMIN["familiya"],
            ism=SUPERADMIN["ism"],
            sharif=SUPERADMIN["sharif"],
            lavozim=SUPERADMIN["lavozim"],
            telefon=SUPERADMIN["telefon"],
            rol=SUPERADMIN["rol"],
            holat=SUPERADMIN["holat"],
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        print("=" * 60)
        print("✅ SUPERADMIN YARATILDI")
        print("=" * 60)
        print(f"   Guvohnoma raqami: {SUPERADMIN['guvohnoma_raqami']}")
        print(f"   F.I.Sh:           {user.full_name}")
        print(f"   Rol:              {getattr(user.rol, 'value', user.rol)}")
        if generatsiya_qilindi:
            print(f"   Parol:            {parol}")
            print("=" * 60)
            print("⚠️  SUPERADMIN_PAROL berilmagani uchun parol tasodifiy")
            print("   generatsiya qilindi va faqat shu yerda ko'rsatiladi —")
            print("   nusxalab oling. Barqaror parol uchun .env ichida")
            print("   SUPERADMIN_PAROL bering va skriptni qayta ishga tushiring.")
        else:
            print("=" * 60)
            print("⚠️  Ishlab chiqarishda parolni darhol almashtiring!")


async def main():
    try:
        await create_superadmin()
    except Exception as e:
        print(f"❌ Superadmin yaratishda xatolik: {e}")
        sys.exit(1)
    finally:
        from app.database import engine
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
