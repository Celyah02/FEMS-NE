#!/usr/bin/env bash
# Restores a FEMS database dump into the running postgres container.
# Usage: ./db/restore.sh ./db/backups/fems_<timestamp>.sql
set -euo pipefail
CONTAINER="fems-postgres"
DB="${PGDATABASE:-fems}"
USER="${PGUSER:-fems}"
FILE="${1:?Usage: restore.sh <dump.sql>}"
echo "Restoring $FILE into $DB on container $CONTAINER"
cat "$FILE" | docker exec -i "$CONTAINER" psql -U "$USER" -d "$DB"
echo "Restore complete."
