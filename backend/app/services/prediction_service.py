"""
Prediction service — runs XGBoost and MLP inference with optional SHAP.

This module orchestrates the full prediction pipeline:
1. Feature engineering (via ``feature_engineering.engineer_single_transaction``)
2. XGBoost inference
3. MLP inference (if available)
4. SHAP explanation for XGBoost (if explainer is available)

It deliberately returns **raw probabilities only** — no labels or thresholds.
The frontend applies the threshold client-side so slider changes are instant.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd

# The parent project's ``src`` package is on sys.path (set by backend.app.config)
from src.features import (  # type: ignore[import-untyped]
    CAT_FEATURES,
    CONSERVATIVE_FEATURES,
    CONT_FEATURES,
)

from backend.app.ml import model_registry
from backend.app.schemas.prediction import (
    BatchPredictResponse,
    BatchRowResult,
    InputSummary,
    ModelResult,
    PredictResponse,
    ShapExplanation,
    ShapFeatureContribution,
)
from backend.app.services.feature_engineering import (
    engineer_batch_transactions,
    engineer_single_transaction,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _generate_prediction_id() -> str:
    """Generate a unique, human-readable prediction ID."""
    now = datetime.now(tz=timezone.utc)
    short_uuid = uuid.uuid4().hex[:8]
    return f"pred_{now.strftime('%Y%m%d_%H%M%S')}_{short_uuid}"


def _predict_xgb(feature_df: pd.DataFrame) -> np.ndarray:
    """
    Run XGBoost inference.

    Parameters
    ----------
    feature_df : pd.DataFrame
        DataFrame with CONSERVATIVE_FEATURES columns.

    Returns
    -------
    np.ndarray
        Array of P(Late) probabilities, shape ``(n_samples,)``.
    """
    xgb_model = model_registry.get_xgb_model()
    X = feature_df[CONSERVATIVE_FEATURES].fillna(0).replace([np.inf, -np.inf], 0)
    probas = xgb_model.predict_proba(X)[:, 1]
    return probas.astype(float)


def _predict_mlp(feature_df: pd.DataFrame) -> np.ndarray | None:
    """
    Run MLP inference if the model is available.

    Returns
    -------
    np.ndarray | None
        Array of P(Late) probabilities, or ``None`` if MLP is unavailable.
    """
    mlp_tuple = model_registry.get_mlp()
    if mlp_tuple is None:
        return None

    import torch

    model, scaler, config = mlp_tuple

    X_all = feature_df[CONSERVATIVE_FEATURES].fillna(0).replace([np.inf, -np.inf], 0)

    # Scale continuous features
    X_cont_raw = X_all[CONT_FEATURES].values
    X_cont = np.nan_to_num(scaler.transform(X_cont_raw), nan=0.0, posinf=0.0, neginf=0.0)

    # Prepare categorical features with clipping
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
        proba = torch.sigmoid(logits).cpu().numpy()

    return proba.astype(float)


def _compute_shap_explanation(
    feature_df: pd.DataFrame,
    *,
    top_n: int = 10,
) -> dict[str, ShapExplanation] | None:
    """
    Compute SHAP explanation for the XGBoost model on a single row.

    Parameters
    ----------
    feature_df : pd.DataFrame
        Single-row DataFrame with CONSERVATIVE_FEATURES columns.
    top_n : int
        Number of top features (by absolute SHAP value) to include.

    Returns
    -------
    dict[str, ShapExplanation] | None
        ``{"xgboost": ShapExplanation(...)}`` or ``None`` if SHAP is
        unavailable.
    """
    explainer = model_registry.get_shap_explainer()
    if explainer is None:
        return None

    try:
        X = feature_df[CONSERVATIVE_FEATURES].fillna(0).replace([np.inf, -np.inf], 0)

        shap_values = explainer.shap_values(X)

        # shap_values may be a list (for multi-class) or a 2D array.
        # For binary classification we want the positive-class SHAP values.
        if isinstance(shap_values, list):
            # Class 1 (Late) explanation
            sv = shap_values[1] if len(shap_values) > 1 else shap_values[0]
        else:
            sv = shap_values

        # sv shape: (1, n_features) for a single row
        sv_row = sv[0] if sv.ndim == 2 else sv

        # Get base value
        base_value = explainer.expected_value
        if isinstance(base_value, (list, np.ndarray)):
            base_value = float(base_value[1]) if len(base_value) > 1 else float(base_value[0])
        else:
            base_value = float(base_value)

        # Sort by absolute SHAP value, take top N
        abs_shap = np.abs(sv_row)
        top_indices = np.argsort(abs_shap)[::-1][:top_n]

        feature_names = CONSERVATIVE_FEATURES
        feature_values = X.iloc[0]

        contributions: list[ShapFeatureContribution] = []
        for idx in top_indices:
            fname = feature_names[idx]
            fval = feature_values.iloc[idx]
            contributions.append(
                ShapFeatureContribution(
                    feature=fname,
                    shap_value=round(float(sv_row[idx]), 6),
                    feature_value=round(float(fval), 6)
                    if isinstance(fval, (int, float, np.number))
                    else str(fval),
                )
            )

        return {
            "xgboost": ShapExplanation(
                base_value=round(base_value, 6),
                top_features=contributions,
            )
        }

    except Exception:
        logger.warning("SHAP computation failed", exc_info=True)
        return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def predict_single(
    raw_input: dict[str, Any],
    *,
    include_shap: bool = True,
    include_feature_vector: bool = False,
    shap_top_n: int = 10,
) -> PredictResponse:
    """
    Run a full single-transaction prediction.

    Parameters
    ----------
    raw_input : dict
        Raw transaction data with keys:
        Jumlah, KodeCustomer, NamaSalesman, NamaDivisi, NamaKategori,
        NamaSubKategori, KodeCabang, Provinsi, Kota, Kecamatan,
        NamaGroupCustomer, Keterangan
    include_shap : bool
        Whether to compute SHAP explanations.
    include_feature_vector : bool
        Whether to include the full 69-feature vector in the response
        (useful for debugging / transparency).
    shap_top_n : int
        Number of top SHAP features to return.

    Returns
    -------
    PredictResponse
        Contains raw probabilities (no labels / threshold applied).
    """
    pipeline_maps = model_registry.get_pipeline_maps()

    # 1. Feature engineering
    feature_df = engineer_single_transaction(raw_input, pipeline_maps)

    # 2. XGBoost prediction
    xgb_probas = _predict_xgb(feature_df)
    xgb_prob = float(xgb_probas[0])

    # 3. MLP prediction (optional)
    mlp_probas = _predict_mlp(feature_df)
    mlp_result: ModelResult | None = None
    if mlp_probas is not None:
        mlp_result = ModelResult(probability=round(float(mlp_probas[0]), 6))

    # 4. SHAP (optional)
    shap_explanation = None
    if include_shap:
        shap_explanation = _compute_shap_explanation(feature_df, top_n=shap_top_n)

    # 5. Feature vector (optional)
    feature_vector: dict[str, float] | None = None
    if include_feature_vector:
        row = feature_df.iloc[0]
        feature_vector = {
            col: round(float(val), 6) if isinstance(val, (int, float, np.number)) else float(val)
            for col, val in row.items()
        }

    # 6. Build response
    return PredictResponse(
        prediction_id=_generate_prediction_id(),
        timestamp=datetime.now(tz=timezone.utc),
        input_summary=InputSummary(
            jumlah=raw_input["Jumlah"],
            customer=str(raw_input.get("KodeCustomer", "")),
            divisi=str(raw_input.get("NamaDivisi", "")),
            salesman=str(raw_input.get("NamaSalesman", "")),
            cabang=str(raw_input.get("KodeCabang", "")),
            kota=str(raw_input.get("Kota", "")),
        ),
        xgboost=ModelResult(probability=round(xgb_prob, 6)),
        mlp=mlp_result,
        shap_explanation=shap_explanation,
        feature_vector=feature_vector,
    )


def predict_batch(
    raw_inputs: list[dict[str, Any]],
) -> BatchPredictResponse:
    """
    Run predictions for a batch of transactions.

    Parameters
    ----------
    raw_inputs : list[dict]
        List of raw transaction dicts (same keys as single prediction).

    Returns
    -------
    BatchPredictResponse
        Contains per-row probabilities. No labels — frontend applies
        the threshold client-side.
    """
    pipeline_maps = model_registry.get_pipeline_maps()
    total_rows = len(raw_inputs)

    # Feature engineer all rows (collects failures)
    feature_df, failed_indices = engineer_batch_transactions(raw_inputs, pipeline_maps)

    results: list[BatchRowResult] = []

    # Mark failed rows
    for idx in failed_indices:
        results.append(
            BatchRowResult(
                row_index=idx,
                xgb_probability=0.0,
                mlp_probability=None,
                error=f"Feature engineering failed for row {idx}",
            )
        )

    if len(feature_df) > 0:
        # XGBoost batch prediction
        xgb_probas = _predict_xgb(feature_df)

        # MLP batch prediction
        mlp_probas = _predict_mlp(feature_df)

        for i, original_idx in enumerate(feature_df.index):
            xgb_p = round(float(xgb_probas[i]), 6)
            mlp_p = round(float(mlp_probas[i]), 6) if mlp_probas is not None else None

            results.append(
                BatchRowResult(
                    row_index=int(original_idx),
                    xgb_probability=xgb_p,
                    mlp_probability=mlp_p,
                    error=None,
                )
            )

    # Sort results by row_index for deterministic ordering
    results.sort(key=lambda r: r.row_index)

    processed_rows = total_rows - len(failed_indices)

    return BatchPredictResponse(
        total_rows=total_rows,
        processed_rows=processed_rows,
        failed_rows=len(failed_indices),
        results=results,
    )
