# ============================================================
# XAVFSIZ XONADON — Backend Dockerfile
# Python 3.11 + FastAPI — ishlab chiqarish uchun
# ============================================================

FROM python:3.11-slim-bookworm

# Tizim kutubxonalari (psycopg2 binary o'rniga asyncpg, Pillow uchun)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libjpeg-dev \
    zlib1g-dev \
    libwebp-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Ilova katalogi
WORKDIR /app

# Pip tezroq ishlashi uchun
ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Bog'liqliklarni alohida nusxalash (qatlam kesh)
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Ilova kodi
COPY . .

# Upload papkasi
RUN mkdir -p /app/uploads /backups

# Port
EXPOSE 8000

# Ishga tushirish
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
