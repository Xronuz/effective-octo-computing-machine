"""
XAVFSIZ XONADON — WebSocket Connection Manager.
Faol xodimlar GPS lokatsiyasini veb-dashboardga jonli uzatish.
"""
import json
import logging
from typing import Dict, Set

from fastapi import WebSocket

logger = logging.getLogger("xavfsiz_xonadon")


class ConnectionManager:
    """
    WebSocket ulanishlarni boshqarish.
    Har bir foydalanuvchi uchun bir nechta qurilma bo'lishi mumkin.
    """

    def __init__(self):
        # user_id → set of WebSocket connections
        self._connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        """Yangi ulanishni qabul qilish."""
        await websocket.accept()
        if user_id not in self._connections:
            self._connections[user_id] = set()
        self._connections[user_id].add(websocket)
        logger.info(f"WebSocket ulandi: user_id={user_id}, jami={len(self._connections)}")

    def disconnect(self, websocket: WebSocket, user_id: int):
        """Ulanishni uzish."""
        if user_id in self._connections:
            self._connections[user_id].discard(websocket)
            if not self._connections[user_id]:
                del self._connections[user_id]
        logger.info(f"WebSocket uzildi: user_id={user_id}")

    async def broadcast_json(self, data: dict):
        """Barcha ulangan klientlarga JSON yuborish."""
        dead: list[tuple[int, WebSocket]] = []
        for user_id, sockets in self._connections.items():
            for ws in sockets:
                try:
                    await ws.send_json(data)
                except Exception:
                    dead.append((user_id, ws))

        # O'lik ulanishlarni tozalash
        for user_id, ws in dead:
            self.disconnect(ws, user_id)

    async def send_json(self, user_id: int, data: dict):
        """Aniq bir foydalanuvchiga yuborish."""
        if user_id not in self._connections:
            return
        dead: list[WebSocket] = []
        for ws in self._connections[user_id]:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, user_id)

    @property
    def active_count(self) -> int:
        """Faol ulanishlar soni."""
        return sum(len(sockets) for sockets in self._connections.values())


# Global instance
manager = ConnectionManager()


async def broadcast_xavfsiz(data: dict) -> None:
    """Xatolikka chidamli broadcast — asosiy oqimni sindirmaydi.

    Ulangan klient bo'lmasa jimgina o'tadi; yuborishdagi har qanday
    xatolik faqat log'ga yoziladi (Telegram hook'lari kabi).
    """
    if manager.active_count == 0:
        return
    try:
        await manager.broadcast_json(data)
    except Exception as e:
        logger.error(f"WebSocket broadcast xatolik (type={data.get('type')}): {e}")
