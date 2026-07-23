"""
XAVFSIZ XONADON — FastAPI ilova fabrikasi.
Barcha marshrutizatorlar, CORS, middleware shu yerda ro'yxatdan o'tadi.
"""
import logging
import asyncio as _asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.api import auth, users, muammo, xonadon, hudud, upload, lokatsiya, topshiriq_intizom, statistika
from app.core.exceptions import AppException, general_exception_handler, app_exception_handler
from app.core.ratelimit import limiter

logger = logging.getLogger("xavfsiz_xonadon")


def _rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded"},
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ilova hayot sikli: startup/shutdown."""
    logger.info(f"XAVFSIZ XONADON ishga tushmoqda — {settings.APP_ENV} muhitida")

    # Telegram bot — background task sifatida ishga tushirish
    from app.bot.bot import start_polling, stop_polling
    bot_task = _asyncio.create_task(start_polling())
    logger.info("Telegram bot polling boshlandi")

    # APScheduler — fon vazifalari (cleanup, VACUUM, muammo/Telegram/backup)
    from app.tasks.audit import start_scheduler, stop_scheduler, scheduler
    from app.tasks.muammo import register_muammo_jobs
    register_muammo_jobs(scheduler)
    start_scheduler()

    yield

    # Schedulerni to'xtatish
    stop_scheduler()

    # Botni to'xtatish
    await stop_polling()
    if not bot_task.done():
        bot_task.cancel()
        try:
            await bot_task
        except _asyncio.CancelledError:
            pass
    logger.info("XAVFSIZ XONADON to'xtatilmoqda")


def create_app() -> FastAPI:
    """FastAPI ilovasini yaratish va sozlash."""
    app = FastAPI(
        title="XAVFSIZ XONADON API",
        description="Uychi tumani FVV bo'limi uchun raqamli nazorat platformasi",
        version="1.0.0",
        docs_url="/docs" if settings.APP_ENV != "production" else None,
        redoc_url="/redoc" if settings.APP_ENV != "production" else None,
        lifespan=lifespan,
    )

    # CORS — faqat dashboard domeni
    origins = settings.cors_origins_list
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Istisno handlerlar
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)

    # Marshrutizatorlarni ro'yxatdan o'tkazish
    app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
    app.include_router(users.router, prefix="/api/users", tags=["Users"])
    app.include_router(muammo.router, prefix="/api/muammolar", tags=["Muammolar"])
    app.include_router(xonadon.router, prefix="/api/xonadonlar", tags=["Xonadonlar"])
    app.include_router(hudud.router, prefix="/api", tags=["Hudud"])
    app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
    app.include_router(lokatsiya.router, prefix="/api", tags=["Lokatsiya"])
    app.include_router(topshiriq_intizom.router, prefix="/api", tags=["Topshiriq", "Intizom"])
    app.include_router(statistika.router, prefix="/api", tags=["Statistika"])

    # Static files — yuklangan fotolar
    uploads_dir = settings.UPLOAD_DIR
    import os
    if not os.path.isabs(uploads_dir):
        uploads_dir = os.path.join(os.path.dirname(__file__), "..", uploads_dir)
    if os.path.exists(uploads_dir):
        app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

    # Health check
    @app.get("/api/health", tags=["System"])
    async def health_check():
        return {"ok": True, "data": {"status": "healthy", "version": "1.0.0"}}

    # Rate limiting — yagona limiter (app/core/ratelimit.py), global default ham ishlaydi
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    return app


app = create_app()
