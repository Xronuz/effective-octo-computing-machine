"""
XAVFSIZ XONADON — Yagona rate limiter.
main.py va auth.py shu instansiyani ishlatadi — alohida Limiter'lar yo'q.
SlowAPIMiddleware orqali global default_limits ham qo'llanadi.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Bitta global limiter — IP bo'yicha, default 200/minute
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
