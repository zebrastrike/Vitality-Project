#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# The Vitality Project — database backup script
#
# Dumps the Neon Postgres database via pg_dump and compresses with gzip. The
# resulting file is named with a UTC timestamp:
#     vitality-YYYYMMDDTHHMMSSZ.sql.gz
#
# Where it runs:
#   - Intended for a cron job on the production host (Hetzner) or GitHub Actions
#   - Requires `pg_dump` on the host
#   - Requires DATABASE_URL in the environment (same value as the app)
#
# Where to send backups (configure one):
#   1) LOCAL CRON       → set BACKUP_DIR below; ensure the host has disk space
#                         and rotation (logrotate / find -mtime +N -delete).
#   2) BACKBLAZE B2     → install b2 CLI, auth once, set B2_BUCKET to upload.
#   3) AWS S3           → install aws-cli, configure creds, set S3_BUCKET.
#   4) Rsync / SFTP     → uncomment and set RSYNC_TARGET at the bottom.
#
# Example crontab (daily at 03:15 UTC):
#     15 3 * * * /opt/vitality/scripts/backup-db.sh >> /var/log/vitality-backup.log 2>&1
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/vitality}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILENAME="vitality-${TIMESTAMP}.sql.gz"
FULL_PATH="${BACKUP_DIR}/${FILENAME}"

mkdir -p "${BACKUP_DIR}"

echo "[backup] dumping database → ${FULL_PATH}"
pg_dump --no-owner --no-privileges --format=plain "${DATABASE_URL}" | gzip -9 > "${FULL_PATH}"

# Basic sanity check
if [[ ! -s "${FULL_PATH}" ]]; then
  echo "[backup] ERROR: dump is empty" >&2
  exit 1
fi

# ── Optional remote upload ──────────────────────────────────────────────────
# Uncomment ONE of the following blocks and set the corresponding env vars.

# # Backblaze B2 (recommended — cheap + S3-compatible)
# if [[ -n "${B2_BUCKET:-}" ]]; then
#   echo "[backup] uploading to B2 bucket ${B2_BUCKET}"
#   b2 upload-file "${B2_BUCKET}" "${FULL_PATH}" "db-backups/${FILENAME}"
# fi

# # AWS S3
# if [[ -n "${S3_BUCKET:-}" ]]; then
#   echo "[backup] uploading to s3://${S3_BUCKET}"
#   aws s3 cp "${FULL_PATH}" "s3://${S3_BUCKET}/db-backups/${FILENAME}"
# fi

# # Rsync / SFTP
# if [[ -n "${RSYNC_TARGET:-}" ]]; then
#   echo "[backup] rsync → ${RSYNC_TARGET}"
#   rsync -az "${FULL_PATH}" "${RSYNC_TARGET}/"
# fi

# ── Local retention: delete backups older than RETENTION_DAYS ───────────────
find "${BACKUP_DIR}" -type f -name 'vitality-*.sql.gz' -mtime +"${RETENTION_DAYS}" -delete || true

echo "[backup] done — ${FILENAME}"
