"""
XAVFSIZ XONADON — Vaqt/sana yordamchilari.

Barcha hisobot va filtrlar Toshkent (Asia/Tashkent) kunlari bo'yicha
ishlaydi. Bazada vaqtlar UTC saqlanadi, shuning uchun "kun" chegaralarini
UTC ga o'girib berish kerak — aks holda mahalliy 00:00–05:00 oralig'idagi
yozuvlar oldingi kunga tushib qoladi (Toshkent UTC+5).
"""
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

TOSHKENT_TZ = ZoneInfo("Asia/Tashkent")


def kun_boshi_utc(kun: date) -> datetime:
    """Toshkent bo'yicha `kun` boshlanishi (00:00) — UTC aware datetime."""
    return datetime(kun.year, kun.month, kun.day, tzinfo=TOSHKENT_TZ)


def kun_oxiri_utc(kun: date) -> datetime:
    """Toshkent bo'yicha `kun` tugashi (ertangi kun 00:00) — UTC aware datetime.

    Yarim ochiq oraliq uchun: [kun_boshi_utc(k), kun_oxiri_utc(k)).
    """
    return kun_boshi_utc(kun + timedelta(days=1))


def bugun_toshkent() -> date:
    """Toshkent vaqti bo'yicha bugungi sana."""
    return datetime.now(TOSHKENT_TZ).date()
