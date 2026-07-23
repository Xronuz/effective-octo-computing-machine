"""
XAVFSIZ XONADON — Muammo fon vazifalari testlari (app/tasks/muammo.py).
muddat_tekshiruvi, muddat_ogohlantirish, kunlik_hisobot, backup,
register_muammo_jobs.
"""
import pytest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch


# ============ Helpers ============

def _mock_session_factory():
    """Mock AsyncSession + async_session_maker patch'i uchun juftlik."""
    mock_session = MagicMock()
    mock_session.execute = AsyncMock()
    mock_session.commit = AsyncMock()
    mock_session.rollback = AsyncMock()
    return mock_session


def _muammo_result(muammolar):
    """select() natijasini taqlid qilish (unique().scalars().all())."""
    result = MagicMock()
    result.unique.return_value.scalars.return_value.all.return_value = muammolar
    return result


def _make_muammo(muammo_id=1, muddat=None, telegram_chat_id=None):
    m = MagicMock()
    m.id = muammo_id
    m.xonadon_id = 10
    m.xodim_id = 20
    m.turi = "gaz_hidi"
    m.xavf = "yuqori"
    m.muddat = muddat
    m.status = "ochiq"
    m.fotolar = []

    xonadon = MagicMock()
    xonadon.full_address = "3-MFY, Bog'ot ko'chasi, 5-uy"
    m.xonadon = xonadon

    xodim = MagicMock()
    xodim.short_name = "Toshpo'latov B.B."
    xodim.telegram_chat_id = telegram_chat_id
    m.xodim = xodim
    return m


# ============ muddat_tekshiruvi ============

class TestMuddatTekshiruvi:

    @pytest.mark.asyncio
    async def test_muddati_otgan_muammo_statusi_ozgaradi_va_xabar(self):
        """Muddati o'tgan muammo → 'muddati_otgan' + Telegram xabar (faqat o'zgarganlarga)."""
        from app.models.muammo import MuammoStatus

        muammo = _make_muammo(muddat=date.today() - timedelta(days=2))
        mock_session = _mock_session_factory()
        mock_session.execute.return_value = _muammo_result([muammo])

        with patch("app.tasks.muammo.async_session_maker") as mock_factory, \
             patch("app.tasks.muammo.muddati_otdi_xabar", new=AsyncMock()) as mock_xabar:
            mock_factory.return_value.__aenter__.return_value = mock_session
            from app.tasks.muammo import muddat_tekshiruvi
            await muddat_tekshiruvi()

        assert muammo.status == MuammoStatus.muddati_otgan
        mock_xabar.assert_awaited_once()
        # kechikkan_kun uzatilgan bo'lishi kerak
        assert mock_xabar.await_args.kwargs["kechikkan_kun"] == 2
        mock_session.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_muammo_yoq_bolsa_xabar_yuborilmaydi(self):
        """Muddati o'tgan muammo yo'q — hech qanday xabar yo'q."""
        mock_session = _mock_session_factory()
        mock_session.execute.return_value = _muammo_result([])

        with patch("app.tasks.muammo.async_session_maker") as mock_factory, \
             patch("app.tasks.muammo.muddati_otdi_xabar", new=AsyncMock()) as mock_xabar:
            mock_factory.return_value.__aenter__.return_value = mock_session
            from app.tasks.muammo import muddat_tekshiruvi
            await muddat_tekshiruvi()

        mock_xabar.assert_not_called()
        mock_session.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_xatolikda_rollback(self):
        """DB xatoligi — rollback, xato tashlanmaydi."""
        mock_session = _mock_session_factory()
        mock_session.execute.side_effect = Exception("DB xatolik")

        with patch("app.tasks.muammo.async_session_maker") as mock_factory:
            mock_factory.return_value.__aenter__.return_value = mock_session
            from app.tasks.muammo import muddat_tekshiruvi
            await muddat_tekshiruvi()

        mock_session.rollback.assert_awaited_once()
        mock_session.commit.assert_not_called()


# ============ muddat_ogohlantirish ============

class TestMuddatOgohlantirish:

    @pytest.mark.asyncio
    async def test_xodimga_telegram_eslatma(self):
        """telegram_chat_id bor xodimga eslatma yuboriladi."""
        muammo = _make_muammo(muddat=date.today() + timedelta(days=1), telegram_chat_id=123456)
        mock_session = _mock_session_factory()
        mock_session.execute.return_value = _muammo_result([muammo])

        bot = MagicMock()
        bot.send_message = AsyncMock()

        with patch("app.tasks.muammo.async_session_maker") as mock_factory, \
             patch("app.tasks.muammo._get_bot", return_value=bot):
            mock_factory.return_value.__aenter__.return_value = mock_session
            from app.tasks.muammo import muddat_ogohlantirish
            await muddat_ogohlantirish()

        bot.send_message.assert_awaited_once()
        kwargs = bot.send_message.await_args.kwargs
        assert kwargs["chat_id"] == 123456
        assert "MUDDAT ESLATMASI" in kwargs["text"]
        assert "3-MFY, Bog'ot ko'chasi, 5-uy" in kwargs["text"]
        assert "Gaz hidi" in kwargs["text"]

    @pytest.mark.asyncio
    async def test_chat_id_yoq_bolsa_yuborilmaydi(self):
        """telegram_chat_id yo'q xodimga — yuborilmaydi, xato ham yo'q."""
        muammo = _make_muammo(muddat=date.today() + timedelta(days=1), telegram_chat_id=None)
        mock_session = _mock_session_factory()
        mock_session.execute.return_value = _muammo_result([muammo])

        bot = MagicMock()
        bot.send_message = AsyncMock()

        with patch("app.tasks.muammo.async_session_maker") as mock_factory, \
             patch("app.tasks.muammo._get_bot", return_value=bot):
            mock_factory.return_value.__aenter__.return_value = mock_session
            from app.tasks.muammo import muddat_ogohlantirish
            await muddat_ogohlantirish()

        bot.send_message.assert_not_called()


# ============ kunlik_hisobot ============

class TestKunlikHisobot:

    @pytest.mark.asyncio
    async def test_hisobot_guruhga_yuboriladi(self):
        """Kunlik hisobot matni guruhga yuboriladi."""
        r1 = MagicMock()
        r1.scalar.return_value = 4   # bugungi tekshiruvlar
        r2 = MagicMock()
        r2.scalar.return_value = 7   # ochiq muammolar
        r3 = MagicMock()
        r3.scalar.return_value = 2   # bugun yopilgan

        mock_session = _mock_session_factory()
        mock_session.execute.side_effect = [r1, r2, r3]

        with patch("app.tasks.muammo.async_session_maker") as mock_factory, \
             patch("app.tasks.muammo._guruhga_yubor", new=AsyncMock()) as mock_yubor:
            mock_factory.return_value.__aenter__.return_value = mock_session
            from app.tasks.muammo import kunlik_hisobot
            await kunlik_hisobot()

        mock_yubor.assert_awaited_once()
        matn = mock_yubor.await_args.args[0]
        assert "KUNLIK HISOBOT" in matn
        assert "4 ta" in matn
        assert "7 ta" in matn
        assert "2 ta" in matn


# ============ backup ============

class TestBackup:

    @pytest.mark.asyncio
    async def test_skript_yoq_bolsa_warning(self):
        """Skript topilmasa — subprocess chaqirilmaydi, xato yo'q."""
        with patch("app.tasks.muammo.BACKUP_SCRIPT", Path("/nonexistent/scripts/backup.sh")), \
             patch("app.tasks.muammo.asyncio.create_subprocess_exec", new=AsyncMock()) as mock_exec:
            from app.tasks.muammo import backup
            await backup()

        mock_exec.assert_not_called()

    @pytest.mark.asyncio
    async def test_skript_muvaffaqiyatli_ishlaydi(self, tmp_path):
        """Skript mavjud — subprocess orqali ishga tushiriladi."""
        skript = tmp_path / "backup.sh"
        skript.write_text("#!/bin/bash\nexit 0\n")

        jarayon = MagicMock()
        jarayon.communicate = AsyncMock(return_value=(b"", b""))
        jarayon.returncode = 0

        with patch("app.tasks.muammo.BACKUP_SCRIPT", skript), \
             patch("app.tasks.muammo.asyncio.create_subprocess_exec", new=AsyncMock(return_value=jarayon)) as mock_exec:
            from app.tasks.muammo import backup
            await backup()

        mock_exec.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_skript_xato_bolsa_warning_xatolik_tashlanmaydi(self, tmp_path):
        """Skript xato kodi bilan tugasa — log warning, istisno tashlanmaydi."""
        skript = tmp_path / "backup.sh"
        skript.write_text("#!/bin/bash\nexit 1\n")

        jarayon = MagicMock()
        jarayon.communicate = AsyncMock(return_value=(b"", b"xatolik"))
        jarayon.returncode = 1

        with patch("app.tasks.muammo.BACKUP_SCRIPT", skript), \
             patch("app.tasks.muammo.asyncio.create_subprocess_exec", new=AsyncMock(return_value=jarayon)):
            from app.tasks.muammo import backup
            await backup()  # xatosiz o'tishi kerak


# ============ register_muammo_jobs ============

class TestRegisterMuammoJobs:

    def test_tortta_job_qoshiladi(self):
        """Scheduler'ga 4 ta job qo'shiladi."""
        mock_scheduler = MagicMock()
        from app.tasks.muammo import register_muammo_jobs
        register_muammo_jobs(mock_scheduler)

        assert mock_scheduler.add_job.call_count == 4

    def test_job_idlari_togri(self):
        """Job ID'lari TZ dagidek nomlanadi."""
        mock_scheduler = MagicMock()
        from app.tasks.muammo import register_muammo_jobs
        register_muammo_jobs(mock_scheduler)

        job_ids = [call.kwargs.get("id") for call in mock_scheduler.add_job.call_args_list]
        assert "muddat_tekshiruvi" in job_ids
        assert "muddat_ogohlantirish" in job_ids
        assert "kunlik_hisobot" in job_ids
        assert "backup" in job_ids
