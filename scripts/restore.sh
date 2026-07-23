#!/usr/bin/env bash
# ============================================================
# XAVFSIZ XONADON — Restore skripti
# Paket (db.sql.gz + uploads.tar.gz) + PostGIS + decryption
# ============================================================
#
# Ishlatish:
#   ./scripts/restore.sh <backup_file.tar.gz>         # shifrlanmagan paket
#   ./scripts/restore.sh <backup_file.tar.gz.gpg>     # shifrlangan (BACKUP_ENCRYPT_PASSWORD kerak)
#
# ⚠️  DIQQAT: Bu joriy bazani tashlab, qayta yaratadi!
# ============================================================

set -euo pipefail

# ---------- Konfiguratsiya ----------
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${POSTGRES_USER:-xavfsiz_user}"
DB_NAME="${POSTGRES_DB:-xavfsiz_xonadon}"
DB_PASSWORD="${POSTGRES_PASSWORD:-}"
ENCRYPT_PASS="${BACKUP_ENCRYPT_PASSWORD:-}"
UPLOAD_DIR="${UPLOAD_DIR:-/app/uploads}"
TEMP_DIR="/tmp/xavfsiz_restore_$$"

# ---------- Tekshirish ----------
if [ $# -lt 1 ]; then
    echo "❌ Ishlatish: $0 <backup_file>"
    echo "   Misol: $0 /backups/xavfsiz_20260714_020000.tar.gz"
    echo "   Misol: $0 /backups/xavfsiz_20260714_020000.tar.gz.gpg  (shifrlangan)"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ Backup fayli topilmadi: ${BACKUP_FILE}"
    exit 1
fi

echo "============================================"
echo " XAVFSIZ XONADON — Restore"
echo "============================================"
echo "  Backup:     ${BACKUP_FILE}"
echo "  Maqsad DB:  ${DB_NAME} @ ${DB_HOST}:${DB_PORT}"
echo "============================================"
echo ""

# ---------- Tasdiqlash ----------
read -r -p "⚠️  Joriy bazani o'chirib qayta yaratmoqchimisiz? (ha/yoq): " CONFIRM
if [ "${CONFIRM}" != "ha" ]; then
    echo "Bekor qilindi."
    exit 0
fi

mkdir -p "${TEMP_DIR}"
WORK_FILE="${BACKUP_FILE}"

# ---------- Deshifrlash ----------
if [[ "${WORK_FILE}" == *.gpg ]]; then
    if [ -z "${ENCRYPT_PASS}" ]; then
        echo "❌ BACKUP_ENCRYPT_PASSWORD muhit o'zgaruvchisi kerak"
        rm -rf "${TEMP_DIR}"
        exit 1
    fi
    echo "🔓 Deshifrlash..."
    WORK_FILE="${TEMP_DIR}/restore.bin"
    gpg --batch --yes --passphrase "${ENCRYPT_PASS}" \
        --decrypt -o "${WORK_FILE}" "${BACKUP_FILE}"
fi

# ---------- Paketni ochish (db.sql.gz + uploads.tar.gz) ----------
# Yangi format: tar.gz paket; eski format: to'g'ridan-to'g'ri .sql(.gz) fayl
DB_FILE="${WORK_FILE}"
UPLOADS_FILE=""
if tar -tzf "${WORK_FILE}" >/dev/null 2>&1; then
    echo "📦 Paket ochilmoqda..."
    mkdir -p "${TEMP_DIR}/pkg"
    tar -xzf "${WORK_FILE}" -C "${TEMP_DIR}/pkg"
    DB_FILE=$(find "${TEMP_DIR}/pkg" \( -name "*.sql.gz" -o -name "*.sql" \) | head -n 1)
    UPLOADS_FILE=$(find "${TEMP_DIR}/pkg" -name "uploads.tar.gz" | head -n 1)
    if [ -z "${DB_FILE}" ]; then
        echo "❌ Paket ichida DB dump topilmadi"
        rm -rf "${TEMP_DIR}"
        exit 1
    fi
fi

# ---------- Drop & recreate DB ----------
echo "🗑  Bazani o'chirish va qayta yaratish..."
PGPASSWORD="${DB_PASSWORD}" psql \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d postgres \
    -c "DROP DATABASE IF EXISTS ${DB_NAME};"

PGPASSWORD="${DB_PASSWORD}" psql \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d postgres \
    -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

# ---------- PostGIS extension (yangi bazaga, tiklashdan OLDIN) ----------
echo "🗺  PostGIS extension yaratilmoqda..."
PGPASSWORD="${DB_PASSWORD}" psql \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# ---------- Restore ----------
# pg_dump --compress=6 (plain format) haqiqiy gzip beradi, lekin eski/qo'lda
# yaratilgan fayl siqilmagan bo'lishi mumkin — gunzip -t bilan tekshiramiz.
echo "📥 Ma'lumotlarni tiklash..."
if [[ "${DB_FILE}" == *.gz ]] && gunzip -t "${DB_FILE}" 2>/dev/null; then
    gunzip -c "${DB_FILE}" | PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -q
else
    PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -f "${DB_FILE}" \
        -q
fi

# ---------- Fotolarni tiklash ----------
if [ -n "${UPLOADS_FILE}" ] && [ -f "${UPLOADS_FILE}" ]; then
    echo "🖼  Fotolar tiklanmoqda: ${UPLOAD_DIR}"
    mkdir -p "${UPLOAD_DIR}"
    tar -xzf "${UPLOADS_FILE}" -C "${UPLOAD_DIR}"
else
    echo "ℹ️  Paketda fotolar arxivi yo'q — o'tkazib yuborildi"
fi

# ---------- Tozalash ----------
rm -rf "${TEMP_DIR}"

echo ""
echo "✅ Restore yakunlandi!"
echo "   Bazani tekshiring: psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME}"
