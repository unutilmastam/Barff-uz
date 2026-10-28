#!/usr/bin/env bash
# Zaxira HAQIQATAN tiklanishini tekshiradi (docs/BACKUP-RESTORE.md).
#
# Zaxira "bor" degani yetarli emas: tiklab ko'rilmagan zaxira zaxira emas.
# Bu skript eng yangi dump'ni VAQTINCHALIK bazaga tiklaydi va har bir
# jadvaldagi qatorlar sonini ASL baza bilan solishtiradi, so'ng vaqtinchalik
# bazani o'chiradi. Asl bazaga TEGMAYDI (faqat o'qiydi).
#
# Ishlatish:
#   DATABASE_URL=... ADMIN_DATABASE_URL=... BACKUP_DIR=... scripts/db-restore-check.sh [fayl.dump]
#
# ADMIN_DATABASE_URL — baza yaratish huquqi bor ulanish (odatda DATABASE_URL ning o'zi).
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL berilishi shart}"
: "${BACKUP_DIR:?BACKUP_DIR berilishi shart}"
ADMIN_URL="${ADMIN_DATABASE_URL:-$DATABASE_URL}"

DUMP="${1:-$(ls -1t "$BACKUP_DIR"/barff-db-*.dump | head -1)}"
[[ -f "$DUMP" ]] || { echo "XATO: dump topilmadi" >&2; exit 2; }

# Nazorat summasi tekshiriladi: buzilgan fayl tiklashdan oldin topilsin.
SUM_FILE="$(ls -1 "$BACKUP_DIR"/barff-*.sha256 2>/dev/null | while read -r f; do
  grep -q "$(basename "$DUMP")" "$f" && echo "$f"; done | head -1 || true)"
if [[ -n "$SUM_FILE" ]]; then
  ( cd "$BACKUP_DIR" && grep "$(basename "$DUMP")" "$SUM_FILE" | sha256sum -c - >/dev/null ) \
    && echo "nazorat summasi: mos" || { echo "XATO: nazorat summasi MOS EMAS" >&2; exit 3; }
else
  echo "OGOHLANTIRISH: nazorat summasi fayli topilmadi" >&2
fi

TMP_DB="barff_restore_check_$$"
# Ulanish satridagi baza nomini almashtirib, vaqtinchalik bazaga ulanish satri yasaymiz.
TMP_URL="$(printf '%s' "$ADMIN_URL" | sed -E "s#/[^/?]+(\\?|\$)#/$TMP_DB\\1#")"

cleanup() { psql "$ADMIN_URL" -qc "DROP DATABASE IF EXISTS \"$TMP_DB\"" >/dev/null 2>&1 || true; }
trap cleanup EXIT

psql "$ADMIN_URL" -qc "CREATE DATABASE \"$TMP_DB\""
pg_restore --no-owner --no-privileges --exit-on-error --dbname "$TMP_URL" "$DUMP"
echo "tiklandi: $(basename "$DUMP") -> $TMP_DB"

# Har bir jadval uchun qatorlar soni: asl baza va tiklangan baza.
count_sql="SELECT format('%s=%s', relname, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', schemaname, relname), false, true, '')))[1]::text)
           FROM pg_stat_user_tables ORDER BY relname"
orig="$(psql "$DATABASE_URL" -tAc "$count_sql")"
rest="$(psql "$TMP_URL" -tAc "$count_sql")"

tables="$(printf '%s\n' "$rest" | grep -c . || true)"
if [[ "$orig" == "$rest" ]]; then
  echo "TIKLASH TASDIQLANDI: $tables ta jadval, qatorlar soni aynan bir xil"
else
  echo "XATO: tiklangan baza asl bazadan FARQ QILADI:" >&2
  diff <(printf '%s\n' "$orig") <(printf '%s\n' "$rest") >&2 || true
  echo "(dump olingandan keyin baza o'zgargan bo'lsa farq normal — yangi dump oling)" >&2
  exit 1
fi
