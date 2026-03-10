#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATION_FILE="$ROOT_DIR/migrations/20260310_portal_records.sql"

if [[ ! -f "$MIGRATION_FILE" ]]; then
  echo "Migration file not found: $MIGRATION_FILE"
  exit 1
fi

cd "$ROOT_DIR"

DB_USER="${POSTGRES_USER:-admin}"
DB_NAME="${POSTGRES_DB:-bba_os}"

if ! docker compose ps db >/dev/null 2>&1; then
  echo "Database service not available. Start the stack first (./scripts/dev-start.sh)."
  exit 1
fi

echo "Applying migration: $MIGRATION_FILE"
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" < "$MIGRATION_FILE"

echo "Migration applied successfully."
