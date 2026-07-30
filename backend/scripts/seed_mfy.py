"""
XAVFSIZ XONADON — 53 ta MFY uchun seed skript
Uychi tumani, Namangan viloyati.

Manba: scripts/data/uychi_kochalar_2026.xlsx (tuman hokimligi ro'yxati, kirill).

Ishga tushirish:
    python scripts/seed_mfy.py

Agar MFY mavjud bo'lsa — qayta yaratilmaydi (idempotent).
"""

import asyncio
import os
import sys

# Ensure backend is on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from app.database import async_session
from app.models.hudud import Mfy
from _uychi_manba import mfy_royxatini_oqish

XLSX_FAYL = os.path.join(os.path.dirname(__file__), "data", "uychi_kochalar_2026.xlsx")


async def seed_mfy():
    """MFY jadvaliga tuman ro'yxatidagi mahallalarni kiritish. Idempotent."""
    async with async_session() as session:
        # Mavjud MFY sonini tekshirish
        result = await session.execute(select(Mfy).limit(1))
        mavjud = result.scalars().first()

        if mavjud:
            count = (await session.execute(select(Mfy))).scalars().all()
            print(f"✅ MFY jadvalida allaqachon {len(count)} ta yozuv mavjud. O'tkazib yuborildi.")
            return

        mfy_royxati = mfy_royxatini_oqish(XLSX_FAYL)
        for mfy_data in mfy_royxati:
            mfy = Mfy(
                raqami=mfy_data["raqami"],
                nomi=mfy_data["nomi"],
                xonadon_soni=0,
            )
            session.add(mfy)

        await session.commit()
        print(f"✅ {len(mfy_royxati)} ta MFY muvaffaqiyatli kiritildi!")


async def main():
    try:
        await seed_mfy()
    except Exception as e:
        print(f"❌ Seed xatosi: {e}")
        sys.exit(1)
    finally:
        # Close engine connections
        from app.database import engine
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
