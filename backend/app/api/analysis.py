"""
Analysis API routes.

Endpoints
---------
- GET /api/analysis/test-set     — Raw probabilities + true labels for client-side threshold tuning
- GET /api/data/instability      — Split instability / stability analysis data
- GET /api/data/metrics          — Model comparison metrics
- GET /api/data/shap             — Precomputed SHAP values + feature importance
- GET /api/data/calibration      — Calibration metrics, statistical tests, cost analysis
- GET /api/data/figures/{name}   — Serve static thesis figures / PNG images
- GET /api/config/unique-values  — Unique categorical values for frontend dropdowns
- GET /api/config/feature-config — Feature configuration metadata
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from backend.app.config import (
    CALIBRATION_METRICS_PATH,
    COST_ANALYSIS_PATH,
    FEATURE_CONFIG_PATH,
    FIGURES_DIR,
    INSTABILITY_RESULTS_CSV_PATH,
    INSTABILITY_RESULTS_JSON_PATH,
    INSTABILITY_SUMMARY_CSV_PATH,
    INSTABILITY_SUMMARY_JSON_PATH,
    ML_METRICS_PATH,
    PROCESSED_DIR,
    STATISTICAL_TESTS_PATH,
    TEST_CSV_PATH,
)
from backend.app.ml import model_registry
from backend.app.schemas.analysis import (
    CalibrationResponse,
    CurveData,
    FeatureConfigResponse,
    HealthResponse,
    InstabilityResponse,
    MetricsResponse,
    ShapDataResponse,
    TestSetResponse,
    UniqueValuesResponse,
)
from backend.app.services.shap_service import get_combined_shap_data

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Routers — we use multiple routers so they can be mounted at different
# prefixes in main.py
# ---------------------------------------------------------------------------

analysis_router = APIRouter(prefix="/api/analysis", tags=["analysis"])
data_router = APIRouter(prefix="/api/data", tags=["data"])
config_router = APIRouter(prefix="/api/config", tags=["config"])
health_router = APIRouter(tags=["health"])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _safe_load_json(path: Path, label: str) -> dict | None:
    """Load a JSON file, returning ``None`` if missing or invalid."""
    if not path.exists():
        logger.info("%s not found at %s", label, path)
        return None
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        logger.warning("Failed to load %s from %s", label, path, exc_info=True)
        return None


def _safe_load_csv(path: Path, label: str) -> pd.DataFrame | None:
    """Load a CSV file as a DataFrame, returning ``None`` on failure."""
    if not path.exists():
        logger.info("%s not found at %s", label, path)
        return None
    try:
        return pd.read_csv(path)
    except Exception:
        logger.warning("Failed to load %s from %s", label, path, exc_info=True)
        return None


def _df_to_records(df: pd.DataFrame) -> list[dict]:
    """
    Convert a DataFrame to a list of dicts, converting numpy types
    to native Python types for JSON serialisation.
    """
    records = df.to_dict(orient="records")
    # Ensure numpy scalars become Python natives
    clean: list[dict] = []
    for row in records:
        clean_row = {}
        for k, v in row.items():
            if isinstance(v, np.integer):
                clean_row[k] = int(v)
            elif isinstance(v, np.floating):
                if np.isnan(v):
                    clean_row[k] = None
                else:
                    clean_row[k] = float(v)
            elif isinstance(v, np.bool_):
                clean_row[k] = bool(v)
            else:
                clean_row[k] = v
        clean.append(clean_row)
    return clean


# ===================================================================
# GET /api/analysis/test-set
# ===================================================================


@analysis_router.get(
    "/test-set",
    response_model=TestSetResponse,
    summary="Test-set probabilities and labels for client-side threshold sweep",
    description=(
        "Returns raw probabilities and ground-truth labels for the entire "
        "test set.  The **frontend** computes all threshold-dependent metrics "
        "(precision, recall, F1, confusion matrix) client-side so the "
        "threshold slider updates instantly without a server round-trip.\n\n"
        "Also includes precomputed ROC and PR curve data points."
    ),
)
async def get_test_set_data() -> TestSetResponse:
    """Serve test-set analysis data."""
    from sklearn.metrics import (
        average_precision_score,
        precision_recall_curve,
        roc_auc_score,
        roc_curve,
    )

    # Import feature list from parent project
    from src.features import CONSERVATIVE_FEATURES  # type: ignore[import-untyped]

    # Load test CSV
    test_df = _safe_load_csv(TEST_CSV_PATH, "test.csv")
    if test_df is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Test dataset not found. Ensure data/processed/test.csv exists.",
        )

    # Verify the target column exists
    if "Is_Late" not in test_df.columns:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Test CSV is missing the 'Is_Late' target column.",
        )

    y_true = test_df["Is_Late"].astype(int).tolist()
    n_samples = len(y_true)

    # --- XGBoost predictions ---
    xgb_probabilities: list[float] = []
    roc_curve_data: dict[str, CurveData] = {}
    pr_curve_data: dict[str, CurveData] = {}

    try:
        xgb_model = model_registry.get_xgb_model()
        X_test = test_df[CONSERVATIVE_FEATURES].fillna(0).replace([np.inf, -np.inf], 0)
        xgb_probs = xgb_model.predict_proba(X_test)[:, 1]
        xgb_probabilities = [round(float(p), 6) for p in xgb_probs]

        # ROC curve
        y_np = np.array(y_true)
        fpr, tpr, _ = roc_curve(y_np, xgb_probs)
        auc_val = roc_auc_score(y_np, xgb_probs)
        roc_curve_data["xgboost"] = CurveData(
            fpr=[round(float(x), 6) for x in fpr],
            tpr=[round(float(x), 6) for x in tpr],
            auc=round(float(auc_val), 6),
        )

        # PR curve
        prec_arr, rec_arr, _ = precision_recall_curve(y_np, xgb_probs)
        ap_val = average_precision_score(y_np, xgb_probs)
        pr_curve_data["xgboost"] = CurveData(
            precision=[round(float(x), 6) for x in prec_arr],
            recall=[round(float(x), 6) for x in rec_arr],
            ap=round(float(ap_val), 6),
        )
    except Exception:
        logger.warning("XGBoost test-set prediction failed", exc_info=True)
        # Return empty probabilities; the endpoint still works for data
        xgb_probabilities = [0.0] * n_samples

    # --- MLP predictions ---
    mlp_probabilities: list[float] | None = None

    mlp_tuple = model_registry.get_mlp()
    if mlp_tuple is not None:
        try:
            import torch
            from src.features import CAT_FEATURES, CONT_FEATURES  # type: ignore[import-untyped]

            model, scaler, config = mlp_tuple
            X_all = test_df[CONSERVATIVE_FEATURES].fillna(0).replace([np.inf, -np.inf], 0)

            X_cont_raw = X_all[CONT_FEATURES].values
            X_cont = np.nan_to_num(scaler.transform(X_cont_raw), nan=0.0, posinf=0.0, neginf=0.0)

            X_cat = X_all[CAT_FEATURES].values.astype(np.int64)
            cat_cardinalities = config.get("cat_cardinalities", {})
            for ci, col in enumerate(CAT_FEATURES):
                max_valid = int(cat_cardinalities.get(col, 999)) - 1
                X_cat[:, ci] = np.clip(X_cat[:, ci], 0, max_valid)

            model.eval()
            with torch.no_grad():
                cont_t = torch.FloatTensor(X_cont)
                cat_t = torch.LongTensor(X_cat)
                logits = model(cont_t, cat_t)
                mlp_probs = torch.sigmoid(logits).cpu().numpy()

            mlp_probabilities = [round(float(p), 6) for p in mlp_probs]

            # MLP ROC curve
            y_np = np.array(y_true)
            fpr_m, tpr_m, _ = roc_curve(y_np, mlp_probs)
            auc_m = roc_auc_score(y_np, mlp_probs)
            roc_curve_data["mlp"] = CurveData(
                fpr=[round(float(x), 6) for x in fpr_m],
                tpr=[round(float(x), 6) for x in tpr_m],
                auc=round(float(auc_m), 6),
            )

            # MLP PR curve
            prec_m, rec_m, _ = precision_recall_curve(y_np, mlp_probs)
            ap_m = average_precision_score(y_np, mlp_probs)
            pr_curve_data["mlp"] = CurveData(
                precision=[round(float(x), 6) for x in prec_m],
                recall=[round(float(x), 6) for x in rec_m],
                ap=round(float(ap_m), 6),
            )
        except Exception:
            logger.warning("MLP test-set prediction failed", exc_info=True)

    return TestSetResponse(
        n_samples=n_samples,
        y_true=y_true,
        xgb_probabilities=xgb_probabilities,
        mlp_probabilities=mlp_probabilities,
        roc_curve=roc_curve_data,
        pr_curve=pr_curve_data,
    )


# ===================================================================
# GET /api/data/instability
# ===================================================================


@data_router.get(
    "/instability",
    response_model=InstabilityResponse,
    summary="Split instability / stability analysis data",
    description=(
        "Returns 30-seed split instability experiment results (per-seed "
        "rows and aggregated summary) for the stability analysis page."
    ),
)
async def get_instability_data() -> InstabilityResponse:
    """Serve instability analysis data."""
    results_df = _safe_load_csv(INSTABILITY_RESULTS_CSV_PATH, "instability results CSV")
    summary_df = _safe_load_csv(INSTABILITY_SUMMARY_CSV_PATH, "instability summary CSV")

    if results_df is None and summary_df is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instability analysis data not found.",
        )

    results = _df_to_records(results_df) if results_df is not None else []
    summary = _df_to_records(summary_df) if summary_df is not None else []

    # Also try to load the JSON version if it exists
    json_data = _safe_load_json(INSTABILITY_RESULTS_JSON_PATH, "instability results JSON")

    return InstabilityResponse(
        results=results,
        summary=summary,
        json_data=json_data,
    )


# ===================================================================
# GET /api/data/metrics
# ===================================================================


@data_router.get(
    "/metrics",
    response_model=MetricsResponse,
    summary="Model comparison metrics",
    description="Returns ml_metrics_v4.json content for model comparison pages.",
)
async def get_metrics_data() -> MetricsResponse:
    """Serve model comparison metrics."""
    data = _safe_load_json(ML_METRICS_PATH, "ML metrics")
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ML metrics file not found.",
        )
    return MetricsResponse(data=data)


# ===================================================================
# GET /api/data/shap
# ===================================================================


@data_router.get(
    "/shap",
    response_model=ShapDataResponse,
    summary="Precomputed SHAP values and feature importance",
    description=(
        "Returns global SHAP values and feature importance data for the "
        "feature importance / SHAP analysis page."
    ),
)
async def get_shap_data() -> ShapDataResponse:
    """Serve precomputed SHAP data."""
    combined = get_combined_shap_data()
    return ShapDataResponse(
        shap_values=combined.get("shap_values"),
        feature_importance=combined.get("feature_importance"),
    )


# ===================================================================
# GET /api/data/calibration
# ===================================================================


@data_router.get(
    "/calibration",
    response_model=CalibrationResponse,
    summary="Calibration metrics, statistical tests, and cost analysis",
    description=(
        "Returns calibration, statistical test, and cost-sensitive analysis "
        "data for the calibration & statistics page."
    ),
)
async def get_calibration_data() -> CalibrationResponse:
    """Serve calibration and statistical analysis data."""
    calibration = _safe_load_json(CALIBRATION_METRICS_PATH, "calibration metrics")
    statistical_tests = _safe_load_json(STATISTICAL_TESTS_PATH, "statistical tests")
    cost_analysis = _safe_load_json(COST_ANALYSIS_PATH, "cost analysis")

    if calibration is None and statistical_tests is None and cost_analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No calibration / statistics data found.",
        )

    return CalibrationResponse(
        calibration=calibration,
        statistical_tests=statistical_tests,
        cost_analysis=cost_analysis,
    )


# ===================================================================
# GET /api/data/figures/{filename}
# ===================================================================

# Allowed image directories: both docs/figures and data/processed (for PNGs)
_ALLOWED_IMAGE_DIRS: list[Path] = [FIGURES_DIR, PROCESSED_DIR]
_ALLOWED_EXTENSIONS: set[str] = {".png", ".jpg", ".jpeg", ".svg", ".webp"}


@data_router.get(
    "/figures/{filename:path}",
    summary="Serve static thesis figures and generated plots",
    description=(
        "Serves PNG/SVG images from `docs/figures/` or `data/processed/`. "
        "Use the filename (including extension) as the path parameter."
    ),
    responses={
        200: {"content": {"image/png": {}}},
        404: {"description": "Image not found"},
    },
)
async def get_figure(filename: str) -> FileResponse:
    """Serve a static image file."""
    # Sanitise: prevent path traversal
    clean_name = Path(filename).name
    if not clean_name or ".." in filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename.",
        )

    suffix = Path(clean_name).suffix.lower()
    if suffix not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {suffix}",
        )

    # Search in allowed directories
    for directory in _ALLOWED_IMAGE_DIRS:
        candidate = directory / clean_name
        if candidate.exists() and candidate.is_file():
            media_type_map = {
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".svg": "image/svg+xml",
                ".webp": "image/webp",
            }
            media_type = media_type_map.get(suffix, "application/octet-stream")
            return FileResponse(
                path=str(candidate),
                media_type=media_type,
                filename=clean_name,
            )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Figure '{clean_name}' not found.",
    )


# ===================================================================
# GET /api/config/unique-values
# ===================================================================


@config_router.get(
    "/unique-values",
    response_model=UniqueValuesResponse,
    summary="Unique values for each categorical dropdown",
    description=(
        "Returns sorted unique values for each categorical field, used by "
        "the frontend to populate select/combobox dropdowns."
    ),
)
async def get_unique_values() -> UniqueValuesResponse:
    """Serve unique categorical values from pipeline maps."""
    try:
        unique_values = model_registry.get_unique_values()
    except RuntimeError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Pipeline maps not loaded — unique values unavailable.",
        )

    if not unique_values:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "No unique values found in pipeline maps. "
                "Ensure pipeline_maps.pkl was generated with unique_values."
            ),
        )

    return UniqueValuesResponse.from_pipeline_maps(unique_values)


# ===================================================================
# GET /api/config/feature-config
# ===================================================================


@config_router.get(
    "/feature-config",
    response_model=FeatureConfigResponse,
    summary="Feature configuration metadata",
    description="Returns the feature_config.json content (feature lists, settings, etc.).",
)
async def get_feature_config() -> FeatureConfigResponse:
    """Serve feature configuration metadata."""
    data = _safe_load_json(FEATURE_CONFIG_PATH, "feature config")
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feature config file not found.",
        )
    return FeatureConfigResponse(data=data)


# ===================================================================
# GET /api/health
# ===================================================================


@health_router.get(
    "/api/health",
    response_model=HealthResponse,
    summary="API health check",
    description=(
        "Returns the health status of the API and which model artifacts are currently loaded."
    ),
)
async def health_check() -> HealthResponse:
    """Return API health status."""
    from backend.app.config import check_artifacts

    artifact_status = check_artifacts(strict=False)

    models_loaded: dict[str, bool] = {}
    try:
        model_registry.get_xgb_model()
        models_loaded["xgboost"] = True
    except RuntimeError:
        models_loaded["xgboost"] = False

    models_loaded["mlp"] = model_registry.get_mlp() is not None
    models_loaded["shap_explainer"] = model_registry.get_shap_explainer() is not None

    try:
        maps = model_registry.get_pipeline_maps()
        models_loaded["pipeline_maps"] = True
        models_loaded["unique_values"] = bool(maps.get("unique_values"))
    except RuntimeError:
        models_loaded["pipeline_maps"] = False
        models_loaded["unique_values"] = False

    # Overall status
    required_ok = models_loaded.get("xgboost", False) and models_loaded.get("pipeline_maps", False)
    overall_status = "healthy" if required_ok else "degraded"

    return HealthResponse(
        status=overall_status,
        version="0.1.0",
        models_loaded=models_loaded,
    )
