"""
XAVFSIZ XONADON — MFY chegaralarini GeoJSON fayldan bazaga yuklash.

Fayl formati: GeoJSON FeatureCollection. Har bir feature'da:
    - properties.raqami  — MFY raqami (int), bazadagi mfy.raqami bilan match
    - geometry           — Polygon (EPSG:4326 / WGS84)

Chegara ma'lumotlari OpenStreetMap yoki QGIS eksportidan olinadi
(masalan, JOSM/QGIS da poligon chizib, GeoJSON sifatida saqlash).
Ma'lumot faylini FVV taqdim etadi — kutilgan joylashuv:
    backend/scripts/data/mfy_chegaralar.geojson

Ishga tushirish:
    python scripts/seed_chegaralar.py scripts/data/mfy_chegaralar.geojson
    # yoki Docker'da:
    docker compose exec backend python scripts/seed_chegaralar.py scripts/data/mfy_chegaralar.geojson

Skript idempotent — UPDATE asosida ishlaydi, qayta yurgizish xavfsiz.
"""

import argparse
import asyncio
import json
import os
import sys

# Ensure backend is on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from app.database import async_session


def load_features(fayl_yoli: str) -> list[dict]:
    """GeoJSON faylni o'qib, feature'larni validatsiya qilish."""
    if not os.path.isfile(fayl_yoli):
        print(f"❌ Xatolik: fayl topilmadi — {fayl_yoli}")
        print("   Chegara ma'lumotlari OpenStreetMap/QGIS eksportidan olinadi.")
        print("   Kutilgan joylashuv: backend/scripts/data/mfy_chegaralar.geojson")
        sys.exit(1)

    try:
        with open(fayl_yoli, encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ Xatolik: fayl yaroqsiz JSON — {e}")
        sys.exit(1)

    if data.get("type") != "FeatureCollection" or not isinstance(data.get("features"), list):
        print("❌ Xatolik: fayl GeoJSON FeatureCollection emas.")
        sys.exit(1)

    features = []
    for i, feature in enumerate(data["features"], start=1):
        raqami = feature.get("properties", {}).get("raqami")
        geometry = feature.get("geometry")

        if raqami is None:
            print(f"⚠️  Feature #{i}: properties.raqami yo'q — o'tkazib yuborildi.")
            continue
        if not geometry or geometry.get("type") != "Polygon":
            turi = geometry.get("type") if geometry else "yo'q"
            print(f"⚠️  MFY #{raqami}: geometry turi '{turi}' (faqat Polygon qabul qilinadi) — o'tkazib yuborildi.")
            continue

        features.append({"raqami": int(raqami), "geometry": geometry})

    return features


async def seed_chegaralar(fayl_yoli: str):
    """GeoJSON fayldagi chegaralarni mfy.raqami bo'yicha match qilib yuklash."""
    features = load_features(fayl_yoli)
    if not features:
        print("❌ Yuklash uchun yaroqli feature topilmadi.")
        sys.exit(1)

    stmt = text(
        "UPDATE mfy SET chegara = ST_GeomFromGeoJSON(:geom) WHERE raqami = :raqami"
    )

    yangilangan = 0
    topilmagan = []
    async with async_session() as session:
        for feature in features:
            result = await session.execute(
                stmt,
                {"geom": json.dumps(feature["geometry"]), "raqami": feature["raqami"]},
            )
            if result.rowcount:
                yangilangan += 1
            else:
                topilmagan.append(feature["raqami"])
        await session.commit()

    print(f"✅ {yangilangan} ta MFY chegarasi muvaffaqiyatli yuklandi!")
    if topilmagan:
        print(f"⚠️  Bazada topilmagan MFY raqamlari: {topilmagan}")


async def main():
    parser = argparse.ArgumentParser(description="MFY chegaralarini GeoJSON fayldan yuklash.")
    parser.add_argument(
        "fayl",
        nargs="?",
        default=os.path.join(os.path.dirname(__file__), "data", "mfy_chegaralar.geojson"),
        help="GeoJSON fayl yo'li (standart: scripts/data/mfy_chegaralar.geojson)",
    )
    args = parser.parse_args()

    try:
        await seed_chegaralar(args.fayl)
    except SystemExit:
        raise
    except Exception as e:
        print(f"❌ Seed xatosi: {e}")
        sys.exit(1)
    finally:
        from app.database import engine
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
