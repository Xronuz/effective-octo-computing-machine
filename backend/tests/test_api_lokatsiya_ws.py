"""
XAVFSIZ XONADON — WebSocket /api/ws/lokatsiya rol tekshiruvi testlari.
Faqat rahbar/superadmin ulana oladi; xodim 4403 kodi bilan yopiladi.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import WebSocketDisconnect
from fastapi.testclient import TestClient

from app.main import create_app
from app.models.user import UserRole


def _make_user(user_id=1, rol=UserRole.rahbar):
    """WS endpoint DB dan qaytaradigan mock foydalanuvchi."""
    u = MagicMock()
    u.id = user_id
    u.rol = rol
    return u


def _patch_auth(user):
    """decode_access_token va async_session_maker ni mocklash."""
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none = MagicMock(return_value=user)
    db.execute = AsyncMock(return_value=result)

    session_ctx = MagicMock()
    session_ctx.__aenter__ = AsyncMock(return_value=db)
    session_ctx.__aexit__ = AsyncMock(return_value=False)

    return (
        patch("app.core.security.decode_access_token", return_value={"sub": str(user.id)}),
        patch("app.database.async_session_maker", return_value=session_ctx),
    )


class TestWsLokatsiyaRoleCheck:
    """WS ulanishda rol tekshiruvi."""

    def test_xodim_rejected_4403(self):
        """Xodim roli — ulanish 4403 kodi bilan yopiladi."""
        user = _make_user(rol=UserRole.xodim)
        p_token, p_session = _patch_auth(user)

        with p_token, p_session:
            client = TestClient(create_app())
            with pytest.raises(WebSocketDisconnect) as exc_info:
                with client.websocket_connect("/api/ws/lokatsiya?token=test-token"):
                    pass
            assert exc_info.value.code == 4403

    def test_rahbar_allowed(self):
        """Rahbar roli — ulanish qabul qilinadi, ping/pong ishlaydi."""
        user = _make_user(rol=UserRole.rahbar)
        p_token, p_session = _patch_auth(user)

        with p_token, p_session:
            client = TestClient(create_app())
            with client.websocket_connect("/api/ws/lokatsiya?token=test-token") as ws:
                ws.send_text("ping")
                assert ws.receive_text() == "pong"

    def test_superadmin_allowed(self):
        """Superadmin roli — ulanish qabul qilinadi."""
        user = _make_user(rol=UserRole.superadmin)
        p_token, p_session = _patch_auth(user)

        with p_token, p_session:
            client = TestClient(create_app())
            with client.websocket_connect("/api/ws/lokatsiya?token=test-token") as ws:
                ws.send_text("ping")
                assert ws.receive_text() == "pong"

    def test_invalid_token_rejected(self):
        """Noto'g'ri token — 4001 kodi bilan yopiladi."""
        with patch("app.core.security.decode_access_token", return_value=None):
            client = TestClient(create_app())
            with pytest.raises(WebSocketDisconnect) as exc_info:
                with client.websocket_connect("/api/ws/lokatsiya?token=yaroqsiz"):
                    pass
            assert exc_info.value.code == 4001
