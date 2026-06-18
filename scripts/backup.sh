#!/usr/bin/env bash
# Бэкап базы MongoDB и локальной папки медиа.
# Сохранность данных — приоритет: запускать по cron/вручную.
#
# Использование:
#   MONGO_URL=mongodb://localhost:27017 DB_NAME=vinyl MEDIA_DIR=./backend/media \
#     scripts/backup.sh [куда]
set -euo pipefail

MONGO_URL="${MONGO_URL:-mongodb://localhost:27017}"
DB_NAME="${DB_NAME:-vinyl}"
MEDIA_DIR="${MEDIA_DIR:-./backend/media}"
DEST="${1:-./backups}"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$DEST/$STAMP"
mkdir -p "$OUT"

echo "→ mongodump $DB_NAME → $OUT/db"
mongodump --uri "$MONGO_URL" --db "$DB_NAME" --out "$OUT/db"

if [ -d "$MEDIA_DIR" ]; then
  echo "→ архив медиа $MEDIA_DIR → $OUT/media.tar.gz"
  tar czf "$OUT/media.tar.gz" -C "$(dirname "$MEDIA_DIR")" "$(basename "$MEDIA_DIR")"
else
  echo "→ папка медиа $MEDIA_DIR не найдена, пропускаю"
fi

echo "✓ бэкап готов: $OUT"
