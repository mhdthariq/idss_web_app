"""
Pydantic schemas for analysis and data endpoints.

These models define the response contracts for:
- GET /api/analysis/test-set
- GET /api/data/instability
- GET /api/data/metrics
- GET /api/data/shap
- GET /api/data/calibration
- GET /api/config/unique-values
- GET /api/health
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Test-Set Analysis
# ---------------------------------------------------------------------------


class CurveData(BaseModel):
    """Data points for a single model's ROC or PR curve."""

    fpr: list[float] | None = Field(None, description="False positive rates (ROC only)")
    tpr: list[float] | None = Field(None, description="True positive rates (ROC only)")
    auc: float | None = Field(None, description="Area under ROC curve")
    precision: list[float] | None = Field(None, description="Precision values (PR only)")
    recall: list[float] | None = Field(None, description="Recall values (PR only)")
    ap: float | None = Field(None, description="Average precision (PR only)")


class TestSetResponse(BaseModel):
    """
    Raw probabilities and true labels for the entire test set.

    The **frontend** computes all metrics (precision, recall, F1,
    confusion matrix) at any threshold the user selects — making
    the threshold sweep entirely client-side.
    """

    n_samples: int = Field(..., description="Number of test samples")
    y_true: list[int] = Field(..., description="Ground truth labels (0 or 1)")
    xgb_probabilities: list[float] = Field(..., description="XGBoost P(Late) for each sample")
    mlp_probabilities: list[float] | None = Field(
        None, description="MLP P(Late) for each sample (null if MLP unavailable)"
    )
    roc_curve: dict[str, CurveData] = Field(..., description="ROC curve data keyed by model name")
    pr_curve: dict[str, CurveData] = Field(
        ..., description="Precision-Recall curve data keyed by model name"
    )


# ---------------------------------------------------------------------------
# Instability / Stability Analysis
# ---------------------------------------------------------------------------


class InstabilityResponse(BaseModel):
    """
    Split instability analysis data — 30-seed experiment results.

    Contains both the per-seed results and the aggregated summary.
    """

    results: list[dict[str, Any]] = Field(
        ...,
        description=(
            "Per-seed rows from split_instability_results.csv "
            "(each dict has seed, model, metric columns)"
        ),
    )
    summary: list[dict[str, Any]] = Field(
        ...,
        description=(
            "Aggregated summary from split_instability_summary.csv "
            "(mean, std, min, max per model×metric)"
        ),
    )
    json_data: dict[str, Any] | None = Field(
        None,
        description="Additional instability JSON data if available",
    )


# ---------------------------------------------------------------------------
# Model Comparison / ML Metrics
# ---------------------------------------------------------------------------


class MetricsResponse(BaseModel):
    """
    Model comparison metrics (ml_metrics_v4.json as-is).

    Structure depends on how the training pipeline saves it — we
    pass it through as a generic dict.
    """

    data: dict[str, Any] = Field(..., description="Raw ml_metrics_v4.json content")


# ---------------------------------------------------------------------------
# SHAP / Feature Importance
# ---------------------------------------------------------------------------


class ShapDataResponse(BaseModel):
    """
    Global SHAP values and feature importance data.

    Both fields are optional because the artifacts may not exist.
    """

    shap_values: dict[str, Any] | None = Field(
        None,
        description="SHAP values (from shap_values_v4.pkl, serialised to JSON-safe dict)",
    )
    feature_importance: dict[str, Any] | None = Field(
        None,
        description="Feature importance (from feature_importance_v4.json)",
    )


# ---------------------------------------------------------------------------
# Calibration & Statistics
# ---------------------------------------------------------------------------


class CalibrationResponse(BaseModel):
    """
    Calibration metrics, statistical tests, and cost analysis.

    All three sub-fields are optional — we serve whatever is available.
    """

    calibration: dict[str, Any] | None = Field(
        None, description="Calibration metrics (calibration_metrics_v4.json)"
    )
    statistical_tests: dict[str, Any] | None = Field(
        None, description="Statistical tests (statistical_tests_v4.json)"
    )
    cost_analysis: dict[str, Any] | None = Field(
        None, description="Cost-sensitive analysis (cost_analysis_v4.json)"
    )


# ---------------------------------------------------------------------------
# Configuration — Unique values for dropdowns
# ---------------------------------------------------------------------------


class UniqueValuesResponse(BaseModel):
    """
    Unique values for each categorical dropdown field.

    Loaded from ``pipeline_maps["unique_values"]`` which is generated
    during feature engineering.
    """

    kode_customer: list[str] = Field(default_factory=list)
    nama_salesman: list[str] = Field(default_factory=list)
    nama_divisi: list[str] = Field(default_factory=list)
    nama_kategori: list[str] = Field(default_factory=list)
    nama_sub_kategori: list[str] = Field(default_factory=list)
    kode_cabang: list[str] = Field(default_factory=list)
    provinsi: list[str] = Field(default_factory=list)
    kota: list[str] = Field(default_factory=list)
    kecamatan: list[str] = Field(default_factory=list)
    nama_group_customer: list[str] = Field(default_factory=list)

    @classmethod
    def from_pipeline_maps(cls, unique_values: dict[str, list[str]]) -> UniqueValuesResponse:
        """
        Construct from the ``pipeline_maps["unique_values"]`` dict.

        The pipeline_maps use PascalCase keys (e.g. ``NamaDivisi``)
        while this schema uses snake_case. This factory handles the
        mapping.
        """
        key_map = {
            "KodeCustomer": "kode_customer",
            "NamaSalesman": "nama_salesman",
            "NamaDivisi": "nama_divisi",
            "NamaKategori": "nama_kategori",
            "NamaSubKategori": "nama_sub_kategori",
            "KodeCabang": "kode_cabang",
            "Provinsi": "provinsi",
            "Kota": "kota",
            "Kecamatan": "kecamatan",
            "NamaGroupCustomer": "nama_group_customer",
        }
        kwargs: dict[str, list[str]] = {}
        for pascal_key, snake_key in key_map.items():
            values = unique_values.get(pascal_key, [])
            # Ensure all values are strings and sorted
            kwargs[snake_key] = sorted(str(v) for v in values)
        return cls(**kwargs)


# ---------------------------------------------------------------------------
# Feature Config
# ---------------------------------------------------------------------------


class FeatureConfigResponse(BaseModel):
    """Feature configuration metadata (feature_config.json as-is)."""

    data: dict[str, Any] = Field(..., description="Raw feature_config.json content")


# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------


class ArtifactStatus(BaseModel):
    """Status of a single artifact."""

    name: str
    available: bool
    required: bool = False


class HealthResponse(BaseModel):
    """API health check response."""

    status: str = Field(..., description="'healthy' or 'degraded'")
    version: str = Field(default="0.1.0")
    models_loaded: dict[str, bool] = Field(
        ...,
        description="Which ML models / artifacts are loaded",
    )
    artifacts: list[ArtifactStatus] = Field(
        default_factory=list,
        description="Detailed per-artifact availability",
    )
