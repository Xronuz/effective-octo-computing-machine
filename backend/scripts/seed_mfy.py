"""
XAVFSIZ XONADON — 53 ta MFY uchun seed skript
Uychi tumani, Namangan viloyati.

Ishga tushirish:
    python scripts/seed_mfy.py

Agar MFY mavjud bo'lsa — qayta yaratilmaydi (idempotent).
"""

import asyncio
import sys
import os

# Ensure backend is on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select, text
from app.database import async_session
from app.models.hudud import Mfy

# ============================================================
# Uychi tumanidagi 53 ta MFY (Mahalla Fuqarolar Yig'ini)
# Manba: Uychi tuman hokimligi ro'yxati
# ============================================================
MFY_LIST: list[dict] = [
    # 1–10
    {"raqami": 1, "nomi": "Birlik", "markaz_lat": 41.0260, "markaz_lng": 71.8350},
    {"raqami": 2, "nomi": "Bunyodkor", "markaz_lat": 41.0285, "markaz_lng": 71.8400},
    {"raqami": 3, "nomi": "Do'stlik", "markaz_lat": 41.0320, "markaz_lng": 71.8450},
    {"raqami": 4, "nomi": "Navoiy", "markaz_lat": 41.0350, "markaz_lng": 71.8380},
    {"raqami": 5, "nomi": "Tinchlik", "markaz_lat": 41.0300, "markaz_lng": 71.8500},
    {"raqami": 6, "nomi": "Mustaqillik", "markaz_lat": 41.0220, "markaz_lng": 71.8420},
    {"raqami": 7, "nomi": "Obod", "markaz_lat": 41.0400, "markaz_lng": 71.8300},
    {"raqami": 8, "nomi": "Yangi hayot", "markaz_lat": 41.0250, "markaz_lng": 71.8550},
    {"raqami": 9, "nomi": "Guliston", "markaz_lat": 41.0325, "markaz_lng": 71.8250},
    {"raqami": 10, "nomi": "Bog'ishamol", "markaz_lat": 41.0180, "markaz_lng": 71.8480},
    # 11–20
    {"raqami": 11, "nomi": "Oltin vodiy", "markaz_lat": 41.0420, "markaz_lng": 71.8450},
    {"raqami": 12, "nomi": "Istiqlol", "markaz_lat": 41.0200, "markaz_lng": 71.8350},
    {"raqami": 13, "nomi": "Zarafshon", "markaz_lat": 41.0280, "markaz_lng": 71.8600},
    {"raqami": 14, "nomi": "Yuksalish", "markaz_lat": 41.0355, "markaz_lng": 71.8200},
    {"raqami": 15, "nomi": "Adolat", "markaz_lat": 41.0240, "markaz_lng": 71.8280},
    {"raqami": 16, "nomi": "Baxt", "markaz_lat": 41.0310, "markaz_lng": 71.8650},
    {"raqami": 17, "nomi": "Yangi asr", "markaz_lat": 41.0380, "markaz_lng": 71.8550},
    {"raqami": 18, "nomi": "Ko'rkam", "markaz_lat": 41.0270, "markaz_lng": 71.8150},
    {"raqami": 19, "nomi": "Farovon", "markaz_lat": 41.0330, "markaz_lng": 71.8700},
    {"raqami": 20, "nomi": "Nurli", "markaz_lat": 41.0215, "markaz_lng": 71.8600},
    # 21–30
    {"raqami": 21, "nomi": "Shodlik", "markaz_lat": 41.0370, "markaz_lng": 71.8100},
    {"raqami": 22, "nomi": "Qo'rg'on", "markaz_lat": 41.0290, "markaz_lng": 71.8750},
    {"raqami": 23, "nomi": "Navbahor", "markaz_lat": 41.0265, "markaz_lng": 71.8050},
    {"raqami": 24, "nomi": "G'uncha", "markaz_lat": 41.0410, "markaz_lng": 71.8650},
    {"raqami": 25, "nomi": "Yangiobod", "markaz_lat": 41.0230, "markaz_lng": 71.8800},
    {"raqami": 26, "nomi": "Chinobod", "markaz_lat": 41.0340, "markaz_lng": 71.8000},
    {"raqami": 27, "nomi": "Mehnatobod", "markaz_lat": 41.0305, "markaz_lng": 71.8850},
    {"raqami": 28, "nomi": "Baraka", "markaz_lat": 41.0440, "markaz_lng": 71.8350},
    {"raqami": 29, "nomi": "Hosil", "markaz_lat": 41.0190, "markaz_lng": 71.8700},
    {"raqami": 30, "nomi": "Taraqqiyot", "markaz_lat": 41.0390, "markaz_lng": 71.8800},
    # 31–40
    {"raqami": 31, "nomi": "Oybek", "markaz_lat": 41.0225, "markaz_lng": 71.8100},
    {"raqami": 32, "nomi": "Chorsu", "markaz_lat": 41.0450, "markaz_lng": 71.8500},
    {"raqami": 33, "nomi": "Iftixor", "markaz_lat": 41.0255, "markaz_lng": 71.8950},
    {"raqami": 34, "nomi": "Mash'al", "markaz_lat": 41.0430, "markaz_lng": 71.8200},
    {"raqami": 35, "nomi": "Saxovat", "markaz_lat": 41.0170, "markaz_lng": 71.8550},
    {"raqami": 36, "nomi": "Ulug'bek", "markaz_lat": 41.0360, "markaz_lng": 71.8900},
    {"raqami": 37, "nomi": "Ziyokor", "markaz_lat": 41.0460, "markaz_lng": 71.8400},
    {"raqami": 38, "nomi": "Yangi turmush", "markaz_lat": 41.0160, "markaz_lng": 71.8450},
    {"raqami": 39, "nomi": "Sharq yulduzi", "markaz_lat": 41.0400, "markaz_lng": 71.8900},
    {"raqami": 40, "nomi": "Turon", "markaz_lat": 41.0470, "markaz_lng": 71.8550},
    # 41–53
    {"raqami": 41, "nomi": "Oqtepa", "markaz_lat": 41.0150, "markaz_lng": 71.8350},
    {"raqami": 42, "nomi": "Chorbog'", "markaz_lat": 41.0480, "markaz_lng": 71.8600},
    {"raqami": 43, "nomi": "Kamolon", "markaz_lat": 41.0295, "markaz_lng": 71.7950},
    {"raqami": 44, "nomi": "Jaloliddin", "markaz_lat": 41.0490, "markaz_lng": 71.8450},
    {"raqami": 45, "nomi": "Fayzobod", "markaz_lat": 41.0140, "markaz_lng": 71.8650},
    {"raqami": 46, "nomi": "Hunarmand", "markaz_lat": 41.0500, "markaz_lng": 71.8500},
    {"raqami": 47, "nomi": "Gulbog'", "markaz_lat": 41.0385, "markaz_lng": 71.7900},
    {"raqami": 48, "nomi": "Alisher Navoiy", "markaz_lat": 41.0510, "markaz_lng": 71.8650},
    {"raqami": 49, "nomi": "So'fiko'l", "markaz_lat": 41.0130, "markaz_lng": 71.8550},
    {"raqami": 50, "nomi": "Amir Temur", "markaz_lat": 41.0520, "markaz_lng": 71.8400},
    {"raqami": 51, "nomi": "Qo'shtepa", "markaz_lat": 41.0120, "markaz_lng": 71.8480},
    {"raqami": 52, "nomi": "Bo'ston", "markaz_lat": 41.0530, "markaz_lng": 71.8580},
    {"raqami": 53, "nomi": "Yuqori Qo'rg'on", "markaz_lat": 41.0100, "markaz_lng": 71.8400},
]


async def seed_mfy():
    """MFY jadvaliga 53 ta mahallani kiritish. Idempotent."""
    async with async_session() as session:
        # Mavjud MFY sonini tekshirish
        result = await session.execute(select(Mfy).limit(1))
        mavjud = result.scalars().first()

        if mavjud:
            count = (await session.execute(select(Mfy))).scalars().all()
            print(f"✅ MFY jadvalida allaqachon {len(count)} ta yozuv mavjud. O'tkazib yuborildi.")
            return

        for mfy_data in MFY_LIST:
            mfy = Mfy(
                raqami=mfy_data["raqami"],
                nomi=mfy_data["nomi"],
                markaz_lat=mfy_data.get("markaz_lat"),
                markaz_lng=mfy_data.get("markaz_lng"),
                xonadon_soni=0,
            )
            session.add(mfy)

        await session.commit()
        print(f"✅ {len(MFY_LIST)} ta MFY muvaffaqiyatli kiritildi!")


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
