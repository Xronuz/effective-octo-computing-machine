"""
XAVFSIZ XONADON — Telegram avtopost xizmati testlari.
yangi_muammo_xabar, bartaraf_xabar, muddati_otdi_xabar, _guruhga_yubor.
"""
import pytest
from datetime import date, datetime, timezone
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch


# ============ Helpers ============

def _make_muammo(fotolar=None):
    """MagicMock muammo — telegram_xabar funksiyalari uchun."""
    m = MagicMock()
    m.id = 5
    m.xonadon_id = 1
    m.xodim_id = 2
    m.turi = "ochiq_elektr_simi"
    m.xavf = "yuqori"
    m.muddat = date(2026, 7, 14)
    m.qurilma_vaqti = datetime(2026, 7, 10, 10, 15, tzinfo=timezone.utc)
    m.yopilgan_sana = datetime(2026, 7, 13, 16, 40, tzinfo=timezone.utc)

    xonadon = MagicMock()
    xonadon.full_address = "7-MFY, Navoiy ko'chasi, 12-uy"
    m.xonadon = xonadon

    xodim = MagicMock()
    xodim.short_name = "Karimov A.A."
    m.xodim = xodim

    m.fotolar = fotolar or []
    return m


def _make_foto(turi, fayl_yoli):
    f = MagicMock()
    f.turi = turi
    f.fayl_yoli = fayl_yoli
    return f


def _mock_bot():
    bot = MagicMock()
    bot.send_message = AsyncMock()
    bot.send_photo = AsyncMock()
    return bot


# ============ yangi_muammo_xabar ============

class TestYangiMuammoXabar:

    @pytest.mark.asyncio
    async def test_tz_formatidagi_xabar_yuboriladi(self):
        """TZ formatidagi xabar guruhga yuboriladi."""
        from app.config import settings

        bot = _mock_bot()
        muammo = _make_muammo()

        with patch.object(settings, "TELEGRAM_GROUP_CHAT_ID", "-1001234567"), \
             patch("app.bot.bot.bot", bot):
            from app.services.telegram_xabar import yangi_muammo_xabar
            await yangi_muammo_xabar(muammo)

        bot.send_message.assert_awaited_once()
        kwargs = bot.send_message.await_args.kwargs
        assert kwargs["chat_id"] == -1001234567
        matn = kwargs["text"]
        assert "YANGI MUAMMO" in matn
        assert "7-MFY, Navoiy ko'chasi, 12-uy" in matn
        assert "Ochiq elektr simi" in matn
        assert "xavf: yuqori" in matn
        assert "Karimov A.A." in matn
        assert "10.07.2026, 10:15" in matn
        assert "Muddat: 14.07.2026" in matn

    @pytest.mark.asyncio
    async def test_chat_id_bosh_bolsa_yuborilmaydi(self):
        """TELEGRAM_GROUP_CHAT_ID bo'sh — xato tashlanmaydi, yuborilmaydi."""
        from app.config import settings

        bot = _mock_bot()
        muammo = _make_muammo()

        with patch.object(settings, "TELEGRAM_GROUP_CHAT_ID", ""), \
             patch("app.bot.bot.bot", bot):
            from app.services.telegram_xabar import yangi_muammo_xabar
            await yangi_muammo_xabar(muammo)  # xatosiz o'tishi kerak

        bot.send_message.assert_not_called()
        bot.send_photo.assert_not_called()

    @pytest.mark.asyncio
    async def test_bot_none_bolsa_xatolik_tashlanmaydi(self):
        """Bot ishga tushmagan bo'lsa — faqat log, xato yo'q."""
        from app.config import settings

        muammo = _make_muammo()

        with patch.object(settings, "TELEGRAM_GROUP_CHAT_ID", "-100123"), \
             patch("app.bot.bot.bot", None):
            from app.services.telegram_xabar import yangi_muammo_xabar
            await yangi_muammo_xabar(muammo)  # xatosiz o'tishi kerak


# ============ bartaraf_xabar ============

class TestBartarafXabar:

    @pytest.mark.asyncio
    async def test_oldin_foto_bilan_yuboriladi(self):
        """Oldin-foto bor bo'lsa — send_photo (caption bilan)."""
        from app.config import settings

        bot = _mock_bot()
        muammo = _make_muammo(fotolar=[
            _make_foto("keyin", "uploads/muammolar/keyin.jpg"),
            _make_foto("oldin", "uploads/muammolar/oldin.jpg"),
        ])

        with patch.object(settings, "TELEGRAM_GROUP_CHAT_ID", "-100123"), \
             patch("app.bot.bot.bot", bot), \
             patch("app.services.upload.get_file_abs_path", return_value=Path("/tmp/oldin.jpg")):
            from app.services.telegram_xabar import bartaraf_xabar
            await bartaraf_xabar(muammo)

        bot.send_photo.assert_awaited_once()
        kwargs = bot.send_photo.await_args.kwargs
        assert "BARTARAF ETILDI" in kwargs["caption"]
        assert "7-MFY, Navoiy ko'chasi, 12-uy" in kwargs["caption"]
        bot.send_message.assert_not_called()

    @pytest.mark.asyncio
    async def test_foto_topilmasa_matn_yuboriladi(self):
        """Foto fayli topilmasa — matn xabariga qaytadi."""
        from app.config import settings

        bot = _mock_bot()
        muammo = _make_muammo(fotolar=[_make_foto("oldin", "uploads/muammolar/yoq.jpg")])

        with patch.object(settings, "TELEGRAM_GROUP_CHAT_ID", "-100123"), \
             patch("app.bot.bot.bot", bot), \
             patch("app.services.upload.get_file_abs_path", return_value=None):
            from app.services.telegram_xabar import bartaraf_xabar
            await bartaraf_xabar(muammo)

        bot.send_photo.assert_not_called()
        bot.send_message.assert_awaited_once()


# ============ muddati_otdi_xabar ============

class TestMuddatiOtdiXabar:

    @pytest.mark.asyncio
    async def test_kechikkan_kun_korsatiladi(self):
        """🚨 MUDDATI O'TDI — kechikkan kunlar soni ko'rsatiladi."""
        from app.config import settings

        bot = _mock_bot()
        muammo = _make_muammo()

        with patch.object(settings, "TELEGRAM_GROUP_CHAT_ID", "-100123"), \
             patch("app.bot.bot.bot", bot):
            from app.services.telegram_xabar import muddati_otdi_xabar
            await muddati_otdi_xabar(muammo, kechikkan_kun=3)

        bot.send_message.assert_awaited_once()
        matn = bot.send_message.await_args.kwargs["text"]
        assert "MUDDATI O'TDI" in matn
        assert "3 kun" in matn
        assert "Muddat: 14.07.2026" in matn
