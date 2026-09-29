#!/usr/bin/env bash
# Legacy ApnaDairy single-build launcher (SQLite edition, delivered 2026-09-27).
# The current rebuild lives in ./backend (FastAPI + PostgreSQL/Supabase) and
# ./frontend (Vite React). This script keeps the legacy build runnable.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/../apnadairy-legacy/backend"
FRONTEND="$ROOT/../apnadairy-legacy/frontend"
PORT="${PORT:-8000}"
echo "==> ApnaDairy LEGACY startup (SQLite edition)"
if [ ! -d "$BACKEND/.venv" ]; then
  echo "--> creating backend venv"
  python3 -m venv "$BACKEND/.venv"
fi
"$BACKEND/.venv/bin/pip" install -q -r "$BACKEND/requirements.txt"
if [ ! -d "$FRONTEND/dist" ] || [ -z "$(ls -A "$FRONTEND/dist" 2>/dev/null)" ]; then
  echo "--> building legacy frontend (first run only)"
  cd "$FRONTEND"
  if [ ! -d node_modules ]; then npm install --no-audit --no-fund; fi
  npm run build
  cd "$ROOT"
fi
if [ ! -f "$BACKEND/data/apnadairy.db" ]; then
  echo "--> seeding database"
  (cd "$BACKEND" && .venv/bin/python seed.py)
fi
echo "--> starting legacy FastAPI on http://localhost:${PORT}"
cd "$BACKEND"
exec .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
