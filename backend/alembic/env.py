"""
XAVFSIZ XONADON — Alembic async migratsiya sozlamasi
SQLAlchemy 2.0 async engine bilan ishlaydi.
"""

import asyncio
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.database import Base
from app.config import settings

# Barcha modellarni import qilish — Alembic autogenerate ko'rishi uchun
from app.models import *  # noqa: F401, F403

# Alembic Config
config = context.config

# SQLAlchemy metadata
target_metadata = Base.metadata

# async engine uchun URL (sinxron engine offline migratsiya uchun kerak emas)
if not config.get_main_option("sqlalchemy.url"):
    # asyncpg URL → psycopg2 URL ga o'zgartirish
    sync_url = settings.DATABASE_URL.replace("+asyncpg", "")
    config.set_main_option("sqlalchemy.url", sync_url)

# Logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


def run_migrations_offline() -> None:
    """
    Offline migratsiya: SQL skript generatsiyasi.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """
    Online migratsiya: aktiv DB ulanishi orqali.
    """
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """
    Async engine orqali migratsiyani ishga tushirish.
    """
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = settings.DATABASE_URL
    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """
    Online migratsiya (async).
    """
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
