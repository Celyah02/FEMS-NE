#!/usr/bin/env bash
# Backs up the FEMS PostgreSQL database to ./backups/fems_<timestamp>.sql
# Usage: ./db/backup.sh   (postgres container must be running via docker compose)
set -euo pipefail
CONTAINER="fems-postgres"
DB="${PGDATABASE:-fems}"
USER="${PGUSER:-fems}"
DIR="$(dirname "$0")/backups"
mkdir -p "$DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="$DIR/fems_${STAMP}.sql"
echo "Dumping $DB from container $CONTAINER -> $OUT"
docker exec -t "$CONTAINER" pg_dump -U "$USER" -d "$DB" > "$OUT"
echo "Backup complete: $OUT"
