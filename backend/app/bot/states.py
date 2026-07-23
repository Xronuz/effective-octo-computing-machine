"""
XAVFSIZ XONADON — Telegram bot FSM holatlari.
aiogram 3.x Finite State Machine.
"""
from aiogram.fsm.state import State, StatesGroup


class AuthState(StatesGroup):
    """/kirish autentifikatsiya oqimi."""
    guvohnoma = State()
    parol = State()


class MuammoState(StatesGroup):
    """Yangi muammo yaratish oqimi (bosqichma-bosqich)."""
    xonadon = State()    # xonadonni tanlash (ID yoki manzil qidiruv)
    turi = State()       # muammo turini tanlash (gaz/elektr/yongin/boshqa)
    tavsif = State()     # tavsif matni
    xavf = State()       # xavf darajasi (past/orta/yuqori)
    foto = State()       # foto yuborish
    gps = State()        # GPS lokatsiya
    tasdiqlash = State()  # yakuniy tasdiqlash
