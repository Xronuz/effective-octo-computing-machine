"""
XAVFSIZ XONADON — Ko'chalarni tuman ro'yxatidan (.xlsx, kirill) bazaga yuklash.

Manba: scripts/data/uychi_kochalar_2026.xlsx (tuman hokimligi ro'yxati).
MFY bilan moslash — mfy.raqami orqali (avval seed_mfy.py ishga tushirilgan
bo'lishi kerak).

Ishga tushirish:
    python scripts/seed_kochalar.py

Idempotent — allaqachon ko'chasi bor MFY o'tkazib yuboriladi, shuning
uchun qayta yurgizish (masalan deploy paytida) xavfsiz va real
tekshiruv ma'lumotlarini (xonadonlar) buzmaydi.
"""

import asyncio
import os
import sys

# Ensure backend is on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from app.database import async_session
from app.models.hudud import Kocha, Mfy
from _uychi_manba import mfy_royxatini_oqish

XLSX_FAYL = os.path.join(os.path.dirname(__file__), "data", "uychi_kochalar_2026.xlsx")


async def seed_kochalar():
    mfy_royxati = mfy_royxatini_oqish(XLSX_FAYL)

    async with async_session() as session:
        mfy_result = await session.execute(select(Mfy))
        mfy_by_raqami = {mfy.raqami: mfy for mfy in mfy_result.scalars().all()}

        yaratildi = 0
        otkazib_yuborildi = 0
        topilmagan = []

        for mfy_data in mfy_royxati:
            mfy = mfy_by_raqami.get(mfy_data["raqami"])
            if mfy is None:
                topilmagan.append(mfy_data["raqami"])
                continue

            mavjud_soni = await session.scalar(
                select(Kocha).where(Kocha.mfy_id == mfy.id).limit(1)
            )
            if mavjud_soni is not None:
                otkazib_yuborildi += 1
                continue

            for kocha_nomi in mfy_data["kochalar"]:
                session.add(Kocha(mfy_id=mfy.id, nomi=kocha_nomi))
                yaratildi += 1

        await session.commit()

    print(f"✅ {yaratildi} ta ko'cha muvaffaqiyatli kiritildi!")
    if otkazib_yuborildi:
        print(f"ℹ️  {otkazib_yuborildi} ta MFY'da ko'chalar allaqachon mavjud — o'tkazib yuborildi.")
    if topilmagan:
        print(f"⚠️  Bazada topilmagan MFY raqamlari: {topilmagan}")


async def main():
    try:
        await seed_kochalar()
    except Exception as e:
        print(f"❌ Seed xatosi: {e}")
        sys.exit(1)
    finally:
        from app.database import engine
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
