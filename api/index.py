"""
Vercel serverless entrypoint.

Vercel's Python runtime expects a WSGI/ASGI app at api/index.py → `app`.
This file simply re-exports the FastAPI app instance from the backend.
"""

from backend.app.main import app  # noqa: F401
