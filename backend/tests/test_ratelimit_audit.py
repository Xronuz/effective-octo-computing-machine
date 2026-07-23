"""
XAVFSIZ XONADON — Rate limit tartibi testlari.
Yagona Limiter (app/core/ratelimit.py) main.py va auth.py da ulanganligi.
"""
from unittest.mock import AsyncMock, MagicMock


# ============ Yagona limiter ============

class TestSingleLimiter:

    def test_auth_va_main_bitta_limiter(self):
        """auth.py va main.py bir xil limiter instansiyasini ishlatadi."""
        import app.main as main_module
        from app.core.ratelimit import limiter
        from app.api import auth as auth_module

        assert auth_module.limiter is limiter
        assert main_module.limiter is limiter

    def test_app_state_va_middleware(self):
        """app.state.limiter o'rnatilgan va SlowAPIMiddleware ulangan."""
        from slowapi.middleware import SlowAPIMiddleware
        from app.core.ratelimit import limiter
        from app.main import app

        assert app.state.limiter is limiter
        middleware_classes = [m.cls for m in app.user_middleware]
        assert SlowAPIMiddleware in middleware_classes

    def test_default_limits_sozlangan(self):
        """Global default limit (200/minute) saqlangan."""
        from app.core.ratelimit import limiter

        assert limiter._default_limits  # bo'sh emas


# ============ Audit helper ============

class TestAuditYozish:

    async def test_audit_log_yozuvi_yaratiladi(self):
        """audit_yozish — AuditLog qo'shadi va flush qiladi."""
        from app.models.audit import AuditLog
        from app.services.audit import audit_yozish

        db = MagicMock()
        db.add = MagicMock()
        db.flush = AsyncMock()

        await audit_yozish(
            db,
            user_id=1,
            amal="user.tasdiqlash",
            obyekt_turi="users",
            obyekt_id=5,
            eski_qiymat={"holat": "kutilmoqda"},
            yangi_qiymat={"holat": "faol"},
            ip="127.0.0.1",
            user_agent="test-agent",
        )

        db.add.assert_called_once()
        yozuv = db.add.call_args.args[0]
        assert isinstance(yozuv, AuditLog)
        assert yozuv.amal == "user.tasdiqlash"
        assert yozuv.obyekt_turi == "users"
        assert yozuv.obyekt_id == 5
        assert yozuv.user_id == 1
        assert yozuv.eski_qiymat == {"holat": "kutilmoqda"}
        assert yozuv.yangi_qiymat == {"holat": "faol"}
        assert yozuv.ip == "127.0.0.1"
        assert yozuv.user_agent == "test-agent"
        db.flush.assert_awaited_once()
