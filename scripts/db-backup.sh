#!/usr/bin/env bash
# Baza + yuklangan fayllar zaxirasi (docs/BACKUP-RESTORE.md).
#
# Ishlatish:
#   DATABASE_URL=postgresql://... MEDIA_ROOT=/yo/l/media BACKUP_DIR=~/barff/backups \
#     scripts/db-backup.sh
#
# Nima qiladi:
#   1. pg_dump (custom format, siqilgan)  -> barff-db-YYYYmmdd-HHMMSS.dump
#   2. MEDIA_ROOT/public + private        -> barff-media-YYYYmmdd-HHMMSS.tar.gz
#   3. SHA-256 nazorat summalari          -> *.sha256
#   4. KEEP_DAYS (standart 14) kundan eskilarini o'chiradi
#
# Parol skript chiqishiga YOZILMAYDI.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL berilishi shart}"
: "${BACKUP_DIR:?BACKUP_DIR berilishi shart}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"

umask 077
mkdir -p "$BACKUP_DIR"

DB_FILE="$BACKUP_DIR/barff-db-$STAMP.dump"
pg_dump --format=custom --compress=6 --no-owner --no-privileges "$DATABASE_URL" --file "$DB_FILE"
echo "baza: $(basename "$DB_FILE") ($(du -h "$DB_FILE" | cut -f1))"

if [[ -n "${MEDIA_ROOT:-}" && -d "$MEDIA_ROOT" ]]; then
  MEDIA_FILE="$BACKUP_DIR/barff-media-$STAMP.tar.gz"
  tar -C "$MEDIA_ROOT" -czf "$MEDIA_FILE" .
  echo "fayllar: $(basename "$MEDIA_FILE") ($(du -h "$MEDIA_FILE" | cut -f1))"
else
  echo "OGOHLANTIRISH: MEDIA_ROOT berilmagan yoki yo'q — yuklangan rasmlar zaxiralanmadi" >&2
fi

( cd "$BACKUP_DIR" && sha256sum barff-*-"$STAMP".* > "barff-$STAMP.sha256" )

find "$BACKUP_DIR" -maxdepth 1 -name 'barff-*' -type f -mtime +"$KEEP_DAYS" -delete
echo "tayyor: $BACKUP_DIR"
