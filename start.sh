#!/bin/sh
# Startup script for cloud deployment.
set -e

cd /app
export PYTHONPATH="${PYTHONPATH:-/app}:/app"

# Always use entry.py — it catches import errors and shows them at /api/debug
exec uvicorn backend.app.entry:app --host 0.0.0.0 --port "${PORT:-8080}"
