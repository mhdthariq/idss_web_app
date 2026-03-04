"""
FastAPI main application — IDSS Backend API.

Intelligent Decision Support System for Accounts Receivable
Late Payment Risk Prediction.

This module creates the FastAPI app instance, configures CORS middleware,
manages the application lifespan (loading ML models on startup, releasing
them on shutdown), and registers all API route modules.

Launch (development):
    cd idss_web_app
    uv run uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import logging
import time
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("idss_backend")


# ---------------------------------------------------------------------------
# Lifespan — load models on startup, release on shutdown
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    FastAPI lifespan context manager.

    On startup:
      1. Load pipeline_maps, XGBoost, MLP, and SHAP explainer into the
         model registry (singleton module-level state).
      2. Load precomputed SHAP values for the analysis endpoints.

    On shutdown:
      Release all loaded artifacts to free memory.

    NOTE: The entire startup is wrapped in try/except so the app ALWAYS
    starts, even if model loading fails.  This is critical for deployments
    where logs are hard to access — the /api/health endpoint will report
    the startup error.
    """
    logger.info("=" * 60)
    logger.info("  IDSS Backend — Starting up")
    logger.info("=" * 60)

    start = time.perf_counter()
    startup_error: str | None = None

    try:
        # --- 1. Import config (puts parent project's `src` on sys.path) ---
        from backend.app.config import PARENT_PROJECT_ROOT, check_artifacts

        logger.info("Parent project root: %s", PARENT_PROJECT_ROOT)

        # Quick artifact check (non-strict — log missing but don't crash)
        artifact_status = check_artifacts(strict=False)
        for name, exists in artifact_status.items():
            level = logging.INFO if exists else logging.WARNING
            symbol = "✓" if exists else "✗"
            logger.log(level, "  %s %s", symbol, name)

        # --- 2. Initialise model registry ---
        from backend.app.ml import model_registry

        registry_status = model_registry.initialise()
        for name, loaded in registry_status.items():
            symbol = "✓" if loaded else "✗"
            logger.info("  Model registry: %s %s", symbol, name)

        # --- 3. Load precomputed SHAP data ---
        from backend.app.services.shap_service import load_precomputed_shap

        shap_status = load_precomputed_shap()
        for name, loaded in shap_status.items():
            symbol = "✓" if loaded else "✗"
            logger.info("  SHAP service: %s %s", symbol, name)

    except Exception as exc:
        startup_error = f"{type(exc).__name__}: {exc}"
        logger.exception("STARTUP FAILED — app will run in degraded mode")

    elapsed = time.perf_counter() - start
    logger.info("Startup complete in %.2f seconds", elapsed)
    if startup_error:
        logger.error("STARTUP ERROR: %s", startup_error)
    logger.info("=" * 60)

    # Store startup error on the app state for /api/health to report
    app.state.startup_error = startup_error

    # --- Yield control to the application ---
    yield

    # --- Shutdown ---
    logger.info("IDSS Backend — Shutting down")
    try:
        from backend.app.ml import model_registry
        model_registry.teardown()
        from backend.app.services.shap_service import teardown as shap_teardown
        shap_teardown()
    except Exception:
        logger.exception("Error during shutdown")
    logger.info("Shutdown complete.")


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application instance.

    This is a factory function so tests can create isolated app instances.
    """
    _app = FastAPI(
        title="IDSS — Debt Prediction API",
        description=(
            "Intelligent Decision Support System for Accounts Receivable "
            "Late Payment Risk Prediction.\n\n"
            "This API provides:\n"
            "- **Single & batch prediction** with dual models (XGBoost + MLP)\n"
            "- **SHAP explanations** for model transparency\n"
            "- **Test-set analysis** data for client-side threshold tuning\n"
            "- **Static analysis data** (instability, metrics, calibration, figures)\n"
            "- **Configuration** endpoints (unique values for dropdowns)\n\n"
            "All prediction endpoints return **raw probabilities only** — no "
            "labels.  The frontend applies the threshold client-side so slider "
            "changes are instant."
        ),
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # --- CORS Middleware ---
    from backend.app.config import CORS_ORIGINS

    _app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Register routers ---
    from backend.app.api.analysis import (
        analysis_router,
        config_router,
        data_router,
        health_router,
    )
    from backend.app.api.predict import router as predict_router

    _app.include_router(predict_router)
    _app.include_router(analysis_router)
    _app.include_router(data_router)
    _app.include_router(config_router)
    _app.include_router(health_router)

    # --- Root redirect to docs ---
    @_app.get("/", include_in_schema=False)
    async def root():
        """Redirect root to API documentation."""
        from fastapi.responses import RedirectResponse

        return RedirectResponse(url="/docs")

    return _app


# ---------------------------------------------------------------------------
# Module-level app instance (used by uvicorn)
# ---------------------------------------------------------------------------

app = create_app()
