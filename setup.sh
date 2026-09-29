#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
VENV="$BACKEND/.venv"
REINSTALL="${1:-}"

if command -v python3 >/dev/null 2>&1; then SYSTEM_PYTHON="python3"; elif command -v python >/dev/null 2>&1; then SYSTEM_PYTHON="python"; else echo "Python 3.11 or newer is required." >&2; exit 1; fi
command -v npm >/dev/null 2>&1 || { echo "Node.js 18 or newer is required." >&2; exit 1; }

if [ ! -d "$VENV" ]; then echo "--> Creating the Python virtual environment"; "$SYSTEM_PYTHON" -m venv "$VENV"; fi
if [ -x "$VENV/bin/python" ]; then PYTHON="$VENV/bin/python"; else PYTHON="$VENV/Scripts/python.exe"; fi

echo "--> Installing backend dependencies"
"$PYTHON" -m pip install -r "$BACKEND/requirements.txt"

if [ "$REINSTALL" = "--reinstall" ] || [ ! -d "$FRONTEND/node_modules" ]; then
  echo "--> Installing frontend dependencies"
  (cd "$FRONTEND" && if [ "$REINSTALL" = "--reinstall" ]; then npm install --no-audit --no-fund; else npm ci --no-audit --no-fund; fi)
else
  echo "    node_modules already exists; skipping npm install."
fi

echo "--> Building frontend"
(cd "$FRONTEND" && npm run build)
echo "Setup complete. Start with ./run.sh."
