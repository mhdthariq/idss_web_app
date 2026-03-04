#!/bin/sh
# Bulletproof startup script for cloud deployment.
# Handles PYTHONPATH, working directory, and logging.
set -e

echo "=== IDSS Startup Script ==="
echo "CWD: $(pwd)"
echo "Python: $(python3 --version 2>&1)"
echo "Contents: $(ls -la /app/ 2>/dev/null | head -10)"
echo "==========================="

# Ensure we're in the right directory
cd /app 2>/dev/null || cd "$(dirname "$0")" || true

# Set PYTHONPATH
export PYTHONPATH="${PYTHONPATH:-/app}:/app"

# Start with minimal app first if real app fails
python3 -c "from backend.app.entry import app; print('Import OK')" 2>&1 && \
  exec uvicorn backend.app.entry:app --host 0.0.0.0 --port "${PORT:-8080}" || \
  exec uvicorn backend.app.minimal:app --host 0.0.0.0 --port "${PORT:-8080}"
