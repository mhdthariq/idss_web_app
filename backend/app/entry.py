"""
Diagnostic entry point for cloud deployments.
Import FastAPI FIRST, then try the real app inside try/except.
"""
import os
import sys
import traceback

# Import FastAPI BEFORE anything else — this must work
from fastapi import FastAPI

_diagnostic_app = FastAPI(title="IDSS Diagnostic Mode")
_import_error: str | None = None

# Now try importing the real app
try:
    from backend.app.main import app  # noqa: F401
except Exception:
    _import_error = traceback.format_exc()
    # Use the diagnostic app instead
    app = _diagnostic_app

    @app.get("/")
    def root():
        return {"status": "diagnostic_mode", "error": "Real app failed to import"}

    @app.get("/api/health")
    def health():
        return {"status": "diagnostic_mode", "startup_error": _import_error}

    @app.get("/api/debug")
    def debug():
        return {
            "status": "diagnostic_mode",
            "import_error": _import_error,
            "cwd": os.getcwd(),
            "pythonpath": sys.path[:15],
            "python_version": sys.version,
            "env_PYTHONPATH": os.environ.get("PYTHONPATH", "(not set)"),
            "env_IDSS_PROJECT_ROOT": os.environ.get("IDSS_PROJECT_ROOT", "(not set)"),
            "files_in_cwd": sorted(os.listdir("."))[:30],
            "models_dir_exists": os.path.isdir("models"),
            "models_contents": sorted(os.listdir("models"))[:20] if os.path.isdir("models") else [],
            "src_dir_exists": os.path.isdir("src"),
            "backend_dir_exists": os.path.isdir("backend"),
            "data_dir_exists": os.path.isdir("data"),
        }
