#!/usr/bin/env bash
# ApnaDairy launcher for macOS, Linux, WSL, and Git Bash.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
VENV="$BACKEND/.venv"
PORT="${PORT:-8000}"

if command -v python3 >/dev/null 2>&1; then
  SYSTEM_PYTHON="python3"
elif command -v python >/dev/null 2>&1; then
  SYSTEM_PYTHON="python"
else
  echo "Python 3.11 or newer is required." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js 18 or newer (including npm) is required." >&2
  exit 1
fi

echo "==> Preparing ApnaDairy"

if [ ! -d "$VENV" ]; then
  echo "Backend environment is missing. Run ./setup.sh once before starting the server." >&2
  exit 1
fi

if [ -x "$VENV/bin/python" ]; then
  PYTHON="$VENV/bin/python"
  ALEMBIC="$VENV/bin/alembic"
else
  # Git Bash uses the Windows virtual-environment layout.
  PYTHON="$VENV/Scripts/python.exe"
  ALEMBIC="$VENV/Scripts/alembic.exe"
fi

if [ ! -d "$FRONTEND/node_modules" ]; then
  echo "Frontend dependencies are missing. Run ./setup.sh once before starting the server." >&2
  exit 1
fi

cd "$BACKEND"
DATABASE_URL_RESOLVED="$("$PYTHON" -c 'from app.core.config import get_settings; print(get_settings().DATABASE_URL)')"
if [[ "$DATABASE_URL_RESOLVED" == sqlite:* ]]; then
  echo "--> Initialising/upgrading the local SQLite database"
  "$ALEMBIC" upgrade head
else
  echo "--> External PostgreSQL selected; automatic schema changes are disabled"
  echo "    Apply backend/supabase_schema.sql in Supabase before starting."
fi

if [ -n "${ADMIN_EMAIL:-}" ] || [ -n "${ADMIN_PASSWORD:-}" ] || [ -n "${SUPERADMIN_EMAIL:-}" ] || [ -n "${SUPERADMIN_PASSWORD:-}" ]; then
  if { [ -n "${ADMIN_EMAIL:-}" ] || [ -n "${ADMIN_PASSWORD:-}" ]; } && { [ -z "${ADMIN_EMAIL:-}" ] || [ -z "${ADMIN_PASSWORD:-}" ]; }; then
    echo "ADMIN_EMAIL and ADMIN_PASSWORD must be set together." >&2
    exit 1
  fi
  if { [ -n "${SUPERADMIN_EMAIL:-}" ] || [ -n "${SUPERADMIN_PASSWORD:-}" ]; } && { [ -z "${SUPERADMIN_EMAIL:-}" ] || [ -z "${SUPERADMIN_PASSWORD:-}" ]; }; then
    echo "SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set together." >&2
    exit 1
  fi
  if [[ "$DATABASE_URL_RESOLVED" == sqlite:* ]] || [ "${APNADAIRY_SEED_LIVE:-0}" = "1" ]; then
    echo "--> Seeding the database (safe to run repeatedly)"
    "$PYTHON" -m app.seed
  else
    echo "Seed skipped for external PostgreSQL. Set APNADAIRY_SEED_LIVE=1 to confirm." >&2
  fi
else
  echo "--> Seed skipped (set Admin and/or Super Admin credentials to enable it)"
fi

echo "--> Starting ApnaDairy at http://localhost:${PORT}"
exec "$PYTHON" -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
