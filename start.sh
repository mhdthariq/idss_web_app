#!/bin/sh
# Startup script for cloud deployment.
# NO set -e — we want to fallback gracefully.

cd /app
export PYTHONPATH="/app:${PYTHONPATH:-}"

echo "=== IDSS Startup ==="
echo "CWD: $(pwd)"
echo "Python: $(python3 --version 2>&1)"

# Try entry.py first (catches import errors, shows them at /api/debug)
echo "Trying entry.py..."
exec uvicorn backend.app.entry:app --host 0.0.0.0 --port "${PORT:-8080}" 2>&1

# If exec fails (shouldn't reach here due to exec), try minimal
echo "entry.py failed, trying minimal.py..."
exec uvicorn backend.app.minimal:app --host 0.0.0.0 --port "${PORT:-8080}" 2>&1
