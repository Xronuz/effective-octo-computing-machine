"""
XAVFSIZ XONADON — APScheduler fon vazifalari testlari.
_cleanup_old_locations, _cleanup_old_audit_logs, _vacuum_tables,
start_scheduler, stop_scheduler.
"""
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch


# ============ _cleanup_old_locations ============

class TestCleanupOldLocations:

    @pytest.mark.asyncio
    async def test_deletes_old_records_logs_count(self):
        """90 kundan eski lokatsiya yozuvlarini o'chirish — muvaffaqiyatli."""
        mock_session = MagicMock()
        mock_session.execute = AsyncMock()
        mock_result = MagicMock()
        mock_result.rowcount = 15
        mock_session.execute.return_value = mock_result
        mock_session.commit = AsyncMock()

        with patch("app.tasks.audit.async_session_maker") as mock_factory:
            mock_factory.return_value.__aenter__.return_value = mock_session
            from app.tasks.audit import _cleanup_old_locations
            await _cleanup_old_locations()

        mock_session.execute.assert_called_once()
        mock_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_no_records_to_delete(self):
        """O'chiriladigan yozuv yo'q bo'lsa."""
        mock_session = MagicMock()
        mock_session.execute = AsyncMock()
        mock_result = MagicMock()
        mock_result.rowcount = 0
        mock_session.execute.return_value = mock_result
        mock_session.commit = AsyncMock()

        with patch("app.tasks.audit.async_session_maker") as mock_factory:
            mock_factory.return_value.__aenter__.return_value = mock_session
            from app.tasks.audit import _cleanup_old_locations
            await _cleanup_old_locations()

        mock_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_exception_rollback_and_log_error(self):
        """Xatolik yuz berganda rollback va log.error chaqiriladi."""
        mock_session = MagicMock()
        mock_session.execute = AsyncMock(side_effect=Exception("DB ulanish xatosi"))
        mock_session.commit = AsyncMock()
        mock_session.rollback = AsyncMock()

        with patch("app.tasks.audit.async_session_maker") as mock_factory:
            mock_factory.return_value.__aenter__.return_value = mock_session
            from app.tasks.audit import _cleanup_old_locations
            await _cleanup_old_locations()

        mock_session.rollback.assert_called_once()
        mock_session.commit.assert_not_called()


# ============ _cleanup_old_audit_logs ============

class TestCleanupOldAuditLogs:

    @pytest.mark.asyncio
    async def test_deletes_old_audit_records(self):
        """180 kundan eski audit loglarni o'chirish — muvaffaqiyatli."""
        mock_session = MagicMock()
        mock_session.execute = AsyncMock()
        mock_result = MagicMock()
        mock_result.rowcount = 42
        mock_session.execute.return_value = mock_result
        mock_session.commit = AsyncMock()

        with patch("app.tasks.audit.async_session_maker") as mock_factory:
            mock_factory.return_value.__aenter__.return_value = mock_session
            from app.tasks.audit import _cleanup_old_audit_logs
            await _cleanup_old_audit_logs()

        mock_session.execute.assert_called_once()
        mock_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_exception_rollback(self):
        """Audit tozalashda xatolik — rollback."""
        mock_session = MagicMock()
        mock_session.execute = AsyncMock(side_effect=Exception("DB error"))
        mock_session.commit = AsyncMock()
        mock_session.rollback = AsyncMock()

        with patch("app.tasks.audit.async_session_maker") as mock_factory:
            mock_factory.return_value.__aenter__.return_value = mock_session
            from app.tasks.audit import _cleanup_old_audit_logs
            await _cleanup_old_audit_logs()

        mock_session.rollback.assert_called_once()
        mock_session.commit.assert_not_called()


# ============ _vacuum_tables ============

class TestVacuumTables:

    @pytest.mark.asyncio
    async def test_executes_vacuum_analyze_successfully(self):
        """VACUUM ANALYZE muvaffaqiyatli bajariladi."""
        mock_session = MagicMock()
        mock_session.execute = AsyncMock()
        mock_session.commit = AsyncMock()

        with patch("app.tasks.audit.async_session_maker") as mock_factory:
            mock_factory.return_value.__aenter__.return_value = mock_session
            from app.tasks.audit import _vacuum_tables
            await _vacuum_tables()

        mock_session.execute.assert_called_once()
        mock_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_vacuum_exception_rollback(self):
        """VACUUM xatolik berganda rollback."""
        mock_session = MagicMock()
        mock_session.execute = AsyncMock(side_effect=Exception("VACUUM error"))
        mock_session.commit = AsyncMock()
        mock_session.rollback = AsyncMock()

        with patch("app.tasks.audit.async_session_maker") as mock_factory:
            mock_factory.return_value.__aenter__.return_value = mock_session
            from app.tasks.audit import _vacuum_tables
            await _vacuum_tables()

        mock_session.rollback.assert_called_once()
        mock_session.commit.assert_not_called()


# ============ start_scheduler ============

class TestStartScheduler:

    def test_adds_three_jobs(self):
        """Scheduler ishga tushganda 3 ta job qo'shiladi."""
        with patch("app.tasks.audit.scheduler") as mock_scheduler:
            mock_scheduler.running = False
            from app.tasks.audit import start_scheduler
            start_scheduler()

        assert mock_scheduler.add_job.call_count == 3
        mock_scheduler.start.assert_called_once()

    def test_does_not_restart_if_already_running(self):
        """Scheduler ishlayotgan bo'lsa, qayta start qilmaydi."""
        with patch("app.tasks.audit.scheduler") as mock_scheduler:
            mock_scheduler.running = True
            from app.tasks.audit import start_scheduler
            start_scheduler()

        mock_scheduler.start.assert_not_called()

    def test_jobs_have_correct_ids(self):
        """Job'lar to'g'ri ID va nom bilan qo'shiladi."""
        with patch("app.tasks.audit.scheduler") as mock_scheduler:
            mock_scheduler.running = False
            from app.tasks.audit import start_scheduler
            start_scheduler()

        job_ids = [call.kwargs.get("id") for call in mock_scheduler.add_job.call_args_list]
        assert "cleanup_locations" in job_ids
        assert "cleanup_audit" in job_ids
        assert "vacuum_tables" in job_ids


# ============ stop_scheduler ============

class TestStopScheduler:

    def test_shuts_down_running_scheduler(self):
        """Ishlayotgan scheduler to'xtatiladi."""
        with patch("app.tasks.audit.scheduler") as mock_scheduler:
            mock_scheduler.running = True
            from app.tasks.audit import stop_scheduler
            stop_scheduler()

        mock_scheduler.shutdown.assert_called_once()

    def test_noop_if_not_running(self):
        """Ishlamayotgan scheduler uchun hech narsa qilmaydi."""
        with patch("app.tasks.audit.scheduler") as mock_scheduler:
            mock_scheduler.running = False
            from app.tasks.audit import stop_scheduler
            stop_scheduler()

        mock_scheduler.shutdown.assert_not_called()
