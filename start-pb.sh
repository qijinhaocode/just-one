#!/bin/bash
# Start PocketBase for JustOne AI
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PB="$SCRIPT_DIR/pocketbase/pocketbase"
DATA="$SCRIPT_DIR/pocketbase/pb_data"

echo "Starting JustOne AI backend (PocketBase)..."
echo "Admin UI: http://127.0.0.1:8090/_/"
echo "API:      http://127.0.0.1:8090/api/"
echo ""
echo "Press Ctrl+C to stop."

"$PB" serve \
  --dir="$DATA" \
  --http="127.0.0.1:8090" \
  --migrationsDir="$SCRIPT_DIR/pocketbase/pb_migrations"
