"""
Minimal diagnostic entry point for LeapCell.

This module tries to import the real app; if that fails, it creates
a bare-bones diagnostic app that reports the error.

Usage:
    uvicorn backend.app.entry:app --host 0.0.0.0 --port 8080
"""
import os
import sys
import traceback

# Try to import the real app
try:
    from backend.app.main import app  # noqa: F401
except Exception:
    # If the real app fails to import, create a diagnostic app
    _startup_traceback = traceback.format_exc()

    from fastapi import FastAPI

    app = FastAPI(title="IDSS Diagnostic Mode")

    @app.get("/")
    def root():
        return {"status": "diagnostic_mode", "error": "Real app failed to import"}

    @app.get("/api/health")
    def health():
        return {"status": "diagnostic_mode", "error": _startup_traceback}

    @app.get("/api/debug")
    def debug():
        return {
            "status": "diagnostic_mode",
            "import_error": _startup_traceback,
            "cwd": os.getcwd(),
            "pythonpath": sys.path[:15],
            "python_version": sys.version,
            "env_PYTHONPATH": os.environ.get("PYTHONPATH", "(not set)"),
            "env_IDSS_PROJECT_ROOT": os.environ.get("IDSS_PROJECT_ROOT", "(not set)"),
            "files_in_cwd": sorted(os.listdir("."))[:30],
            "models_dir_exists": os.path.isdir("models"),
            "src_dir_exists": os.path.isdir("src"),
            "backend_dir_exists": os.path.isdir("backend"),
            "data_dir_exists": os.path.isdir("data"),
        }
