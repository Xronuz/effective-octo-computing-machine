"""
XAVFSIZ XONADON — Ma'lumotlar bazasi ulanishi
SQLAlchemy 2.0 async engine + asyncpg. PostGIS qo'llab-quvvatlanadi.
"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# Async engine — connection pooling bilan
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,                 # productionda False
    pool_size=10,               # bir vaqtda 10 ta ulanish
    max_overflow=20,            # ko'pi bilan 20 ta qo'shimcha
    pool_pre_ping=True,         # ulanish avval tekshiriladi
    connect_args={
        "server_settings": {
            # O'zbekiston vaqti uchun
            "timezone": "Asia/Tashkent",
        }
    },
)

# Async sessionmaker — har bir so'rovga bitta session
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # commit'dan keyin obyektlar yangilanadi
    autocommit=False,
    autoflush=False,
)

# Alias — bot va boshqa modullar uchun
async_session_maker = async_session


class Base(DeclarativeBase):
    """Barcha SQLAlchemy modellari uchun asosiy sinf."""
    pass


# ============ Utility ============

async def get_db() -> AsyncSession:
    """Har bir request uchun yangi database session yaratish.
    FastAPI Depends() orqali ishlatiladi.

    Pattern: session yaratish → yield → commit (yoki rollback) → close.
    async with ISHLATILMAYDI chunki biz commit/rollback/close ni o'zimiz boshqaramiz.
    """
    session = async_session()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()
