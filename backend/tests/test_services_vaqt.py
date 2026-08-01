"""
XAVFSIZ XONADON — Vaqt/sana yordamchilari testlari.

Toshkent UTC+5. Hisobotlar mahalliy kun bo'yicha guruhlanishi shart —
aks holda mahalliy 00:00–05:00 oralig'idagi tashriflar oldingi kunga
tushib qolardi.
"""
from datetime import date, datetime, timezone

from app.services.vaqt import bugun_toshkent, kun_boshi_utc, kun_oxiri_utc


class TestKunBoshiUtc:
    def test_toshkent_yarim_tunidan_boshlanadi(self):
        """Toshkent 00:00 — UTC bo'yicha oldingi kun 19:00."""
        boshi = kun_boshi_utc(date(2026, 8, 1)).astimezone(timezone.utc)
        assert boshi == datetime(2026, 7, 31, 19, 0, tzinfo=timezone.utc)

    def test_utc_emas_mahalliy_kun(self):
        """UTC yarim tunidan boshlanmasligi kerak (eski xatolik)."""
        boshi = kun_boshi_utc(date(2026, 8, 1)).astimezone(timezone.utc)
        assert boshi != datetime(2026, 8, 1, 0, 0, tzinfo=timezone.utc)


class TestKunOxiriUtc:
    def test_ertangi_kun_boshi(self):
        assert kun_oxiri_utc(date(2026, 8, 1)) == kun_boshi_utc(date(2026, 8, 2))

    def test_oraliq_roppa_rosa_24_soat(self):
        boshi = kun_boshi_utc(date(2026, 8, 1))
        oxiri = kun_oxiri_utc(date(2026, 8, 1))
        assert (oxiri - boshi).total_seconds() == 24 * 3600

    def test_oy_chegarasi(self):
        """Oy oxiri keyingi oyning 1-kuniga o'tadi."""
        assert kun_oxiri_utc(date(2026, 7, 31)) == kun_boshi_utc(date(2026, 8, 1))


class TestKunOraligi:
    def test_mahalliy_erta_tong_shu_kunga_tushadi(self):
        """Toshkent 01:00 dagi yozuv o'sha mahalliy kun oralig'ida bo'ladi.

        Eski (UTC asosidagi) mantiqda bu yozuv oldingi kunga tushib qolardi.
        """
        # 2026-08-01 01:00 Toshkent = 2026-07-31 20:00 UTC
        yozuv = datetime(2026, 7, 31, 20, 0, tzinfo=timezone.utc)
        assert kun_boshi_utc(date(2026, 8, 1)) <= yozuv < kun_oxiri_utc(date(2026, 8, 1))

    def test_mahalliy_kech_shu_kunga_tushadi(self):
        """Toshkent 23:30 (= 18:30 UTC) ham o'sha mahalliy kunda qoladi."""
        yozuv = datetime(2026, 8, 1, 18, 30, tzinfo=timezone.utc)
        assert kun_boshi_utc(date(2026, 8, 1)) <= yozuv < kun_oxiri_utc(date(2026, 8, 1))

    def test_oldingi_kun_oraliqqa_kirmaydi(self):
        """Toshkent 23:00 (31-iyul) 1-avgust oralig'iga kirmasligi kerak."""
        yozuv = datetime(2026, 7, 31, 18, 0, tzinfo=timezone.utc)
        assert yozuv < kun_boshi_utc(date(2026, 8, 1))


class TestBugunToshkent:
    def test_date_qaytaradi(self):
        assert isinstance(bugun_toshkent(), date)
