"""
Backend configuration — paths, settings, and environment variables.

This module resolves paths to the model artifacts and processed data
so the FastAPI backend can load them at startup.

When hosting independently, all artifacts (src/, models/, data/, docs/)
live inside the idss_web_app/ directory itself — no dependency on the
parent project root.

Directory layout (expected):
    idss_web_app/              ← PROJECT_ROOT
    ├── src/                   ← shared ML code (features.py, models.py, …)
    ├── data/processed/        ← CSV, PNG, JSON artifacts
    ├── models/                ← pipeline_maps.pkl, xgb_orig_v4.pkl, mlp_v4.*, etc.
    ├── docs/figures/          ← static thesis figures
    └── backend/
        └── app/
            └── config.py      ← YOU ARE HERE
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Path resolution
# ---------------------------------------------------------------------------

# idss_web_app/backend/app/config.py  →  idss_web_app/
_WEB_APP_ROOT = Path(__file__).resolve().parent.parent.parent

# The project root is now idss_web_app/ itself (self-contained),
# NOT the parent debt_prediction/ directory.
# Allow overriding via environment variable for Docker / CI.
PROJECT_ROOT = Path(os.environ.get("IDSS_PROJECT_ROOT", str(_WEB_APP_ROOT)))

# Legacy alias — some modules may still reference PARENT_PROJECT_ROOT.
# Point it to the same self-contained root so nothing breaks.
PARENT_PROJECT_ROOT = PROJECT_ROOT

# Ensure the project root's `src` package is importable.
# This lets us `from src.features import …` inside the backend.
_project_src = str(PROJECT_ROOT)
if _project_src not in sys.path:
    sys.path.insert(0, _project_src)

# ---------------------------------------------------------------------------
# Artifact paths (all relative to the project root = idss_web_app/)
# ---------------------------------------------------------------------------

DATA_DIR = PROJECT_ROOT / "data"
PROCESSED_DIR = DATA_DIR / "processed"
MODELS_DIR = PROJECT_ROOT / "models"
FIGURES_DIR = PROJECT_ROOT / "docs" / "figures"

# --- Model files ---
PIPELINE_MAPS_PATH = MODELS_DIR / "pipeline_maps.pkl"
XGB_MODEL_PATH = MODELS_DIR / "xgb_orig_v4.pkl"
MLP_WEIGHTS_PATH = MODELS_DIR / "mlp_v4.pt"
MLP_ONNX_PATH = MODELS_DIR / "mlp_v4.onnx"
MLP_SCALER_PATH = MODELS_DIR / "mlp_v4_scaler.pkl"
MLP_CONFIG_PATH = MODELS_DIR / "mlp_v4_config.json"

# --- Static analysis JSON files ---
FEATURE_IMPORTANCE_PATH = MODELS_DIR / "feature_importance_v4.json"
SHAP_VALUES_PATH = MODELS_DIR / "shap_values_v4.pkl"
ML_METRICS_PATH = MODELS_DIR / "ml_metrics_v4.json"
INSTABILITY_RESULTS_JSON_PATH = MODELS_DIR / "split_instability_results.json"
INSTABILITY_SUMMARY_JSON_PATH = MODELS_DIR / "split_instability_summary.json"
STATISTICAL_TESTS_PATH = MODELS_DIR / "statistical_tests_v4.json"
CALIBRATION_METRICS_PATH = MODELS_DIR / "calibration_metrics_v4.json"
COST_ANALYSIS_PATH = MODELS_DIR / "cost_analysis_v4.json"

# --- Processed CSV files ---
TEST_CSV_PATH = PROCESSED_DIR / "test.csv"
TRAIN_CSV_PATH = PROCESSED_DIR / "train.csv"
VAL_CSV_PATH = PROCESSED_DIR / "val.csv"
INSTABILITY_RESULTS_CSV_PATH = PROCESSED_DIR / "split_instability_results.csv"
INSTABILITY_SUMMARY_CSV_PATH = PROCESSED_DIR / "split_instability_summary.csv"
FEATURE_CONFIG_PATH = PROCESSED_DIR / "feature_config.json"

# ---------------------------------------------------------------------------
# Application settings
# ---------------------------------------------------------------------------

# CORS — origins allowed to call the API.
# In development the Next.js dev server runs on localhost:3000.
CORS_ORIGINS: list[str] = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3456,https://*.vercel.app",
).split(",")

# Host / port for uvicorn (used by the `run.py` convenience script)
API_HOST: str = os.environ.get("API_HOST", "0.0.0.0")
API_PORT: int = int(os.environ.get("API_PORT", "8000"))

# ---------------------------------------------------------------------------
# Convenience: quick check that critical artifacts exist
# ---------------------------------------------------------------------------

REQUIRED_ARTIFACTS: list[Path] = [
    PIPELINE_MAPS_PATH,
    XGB_MODEL_PATH,
    TEST_CSV_PATH,
]

OPTIONAL_ARTIFACTS: dict[str, Path] = {
    "MLP weights": MLP_WEIGHTS_PATH,
    "MLP ONNX": MLP_ONNX_PATH,
    "MLP scaler": MLP_SCALER_PATH,
    "MLP config": MLP_CONFIG_PATH,
    "SHAP values": SHAP_VALUES_PATH,
    "Feature importance": FEATURE_IMPORTANCE_PATH,
    "ML metrics": ML_METRICS_PATH,
    "Train CSV": TRAIN_CSV_PATH,
}


def check_artifacts(strict: bool = False) -> dict[str, bool]:
    """
    Verify which model/data artifacts are available.

    Parameters
    ----------
    strict : bool
        If True, raise FileNotFoundError when any *required* artifact is
        missing.  Otherwise just return the status dict.

    Returns
    -------
    dict mapping artifact description → exists (bool).
    """
    status: dict[str, bool] = {}

    for path in REQUIRED_ARTIFACTS:
        exists = path.exists()
        status[f"[required] {path.name}"] = exists
        if strict and not exists:
            raise FileNotFoundError(
                f"Required artifact not found: {path}\n"
                f"Ensure that the models/ and data/ directories inside "
                f"{PROJECT_ROOT} contain the necessary artifacts.\n"
                f"You can generate them by running "
                f"`python app/prepare_pipeline.py` from the original "
                f"debt_prediction project root."
            )

    for label, path in OPTIONAL_ARTIFACTS.items():
        status[f"[optional] {label} ({path.name})"] = path.exists()

    return status
