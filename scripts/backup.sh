#!/usr/bin/env bash
# ============================================================
# XAVFSIZ XONADON — Backup skripti
# PostgreSQL dump + uploads (fotolar) arxivi + MAJBURIY gpg shifrlash
# Natija: bitta paket — xavfsiz_<sana>.tar.gz.gpg
#   paket ichida: db.sql.gz (pg_dump) + uploads.tar.gz (fotolar)
# ============================================================
#
# Ishlatish:
#   ./scripts/backup.sh
#
# Prod'da alohida backup konteyneri (crond) ishga tushiradi:
#   0 2 * * * /app/backup.sh >> /var/log/backup.log 2>&1
# ============================================================

set -euo pipefail

# ---------- Konfiguratsiya ----------
BACKUP_DIR="${BACKUP_DIR:-/backups}"
UPLOAD_DIR="${UPLOAD_DIR:-/app/uploads}"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${POSTGRES_USER:-xavfsiz_user}"
DB_NAME="${POSTGRES_DB:-xavfsiz_xonadon}"
DB_PASSWORD="${POSTGRES_PASSWORD:-}"
ENCRYPT_PASS="${BACKUP_ENCRYPT_PASSWORD:-}"
SAQLASH_KUN="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TEMP_WORK="${BACKUP_DIR}/.tmp_${TIMESTAMP}"
DB_DUMP="${TEMP_WORK}/db.sql.gz"
UPLOADS_ARCHIVE="${TEMP_WORK}/uploads.tar.gz"
BACKUP_FILE="${BACKUP_DIR}/xavfsiz_${TIMESTAMP}.tar.gz"
BACKUP_FILE_ENC="${BACKUP_FILE}.gpg"

# ---------- Papka yaratish ----------
mkdir -p "${BACKUP_DIR}" "${TEMP_WORK}"
trap 'rm -rf "${TEMP_WORK}"' EXIT

# ---------- Log funk ----------
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# ---------- Shifrlash MAJBURIY ----------
if [ -z "${ENCRYPT_PASS}" ]; then
    log "❌ XATO: BACKUP_ENCRYPT_PASSWORD bo'sh — shifrlash majburiy!"
    log "   BACKUP_ENCRYPT_PASSWORD muhit o'zgaruvchisini o'rnating va qayta ishga tushiring."
    exit 1
fi

log "Backup boshlanmoqda: ${TIMESTAMP}"

# ---------- pg_dump ----------
log "pg_dump bajarilmoqda..."
PGPASSWORD="${DB_PASSWORD}" pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --no-owner \
    --no-acl \
    --compress=6 \
    -f "${DB_DUMP}"

DB_SIZE=$(du -h "${DB_DUMP}" | cut -f1)
log "pg_dump yakunlandi: db.sql.gz (${DB_SIZE})"

# ---------- Uploads (fotolar) arxivi ----------
if [ -d "${UPLOAD_DIR}" ]; then
    log "Fotolar arxivlanmoqda: ${UPLOAD_DIR}"
    tar -czf "${UPLOADS_ARCHIVE}" -C "${UPLOAD_DIR}" .
    UPLOADS_SIZE=$(du -h "${UPLOADS_ARCHIVE}" | cut -f1)
    log "Fotolar arxivi: uploads.tar.gz (${UPLOADS_SIZE})"
else
    log "⚠️  UPLOAD_DIR topilmadi (${UPLOAD_DIR}) — fotolarsiz davom etiladi"
    mkdir -p "${TEMP_WORK}/empty_uploads"
    tar -czf "${UPLOADS_ARCHIVE}" -C "${TEMP_WORK}/empty_uploads" .
fi

# ---------- Bitta paketga jamlash (db + fotolar) ----------
log "Paket yaratilmoqda: ${BACKUP_FILE}"
tar -czf "${BACKUP_FILE}" -C "${TEMP_WORK}" db.sql.gz uploads.tar.gz

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
log "Paket tayyor: ${BACKUP_FILE} (${BACKUP_SIZE})"

# ---------- Shifrlash (MAJBURIY — parol yuqorida tekshirilgan) ----------
log "Shifrlash bajarilmoqda (gpg AES256)..."
gpg --batch --yes --passphrase "${ENCRYPT_PASS}" \
    --symmetric --cipher-algo AES256 \
    -o "${BACKUP_FILE_ENC}" "${BACKUP_FILE}"

# Asl (shifrlanmagan) nusxani o'chirish
rm -f "${BACKUP_FILE}"
log "Shifrlangan: ${BACKUP_FILE_ENC}"

# ---------- Tozalash: eski backup'larni o'chirish ----------
log "Eski backup'larni tozalash (${SAQLASH_KUN} kundan eski)..."
find "${BACKUP_DIR}" -name "xavfsiz_*.tar.gz*" -mtime "+${SAQLASH_KUN}" -delete
find "${BACKUP_DIR}" -name "xavfsiz_*.sql.gz*" -mtime "+${SAQLASH_KUN}" -delete
find "${BACKUP_DIR}" -name "xavfsiz_*.sql" -mtime "+${SAQLASH_KUN}" -delete

# ---------- Statistika ----------
QOLGAN_SONI=$(find "${BACKUP_DIR}" -name "xavfsiz_*" -type f | wc -l | xargs)
JAMI_HAJM=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)
log "Backup yakunlandi. Qolgan nusxalar: ${QOLGAN_SONI} ta. Jami hajm: ${JAMI_HAJM}"

echo "OK"
