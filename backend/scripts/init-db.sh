#!/bin/bash
# ============================================================
# XAVFSIZ XONADON — PostgreSQL initialization
# Avtomatik ishga tushadi: /docker-entrypoint-initdb.d/init-db.sh
# Barcha jadvallar va ENUM turlar Alembic orqali yaratiladi.
# Bu yerda FAQAT kengaytmalar yoqiladi.
# ============================================================
set -e

echo "⚙️  XAVFSIZ XONADON — PostgreSQL PostGIS sozlanmoqda..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE EXTENSION IF NOT EXISTS postgis_topology;
    SELECT PostGIS_Full_Version();
EOSQL

echo "✅ PostGIS kengaytmalari yoqildi. Jadvallar Alembic orqali yaratiladi."
