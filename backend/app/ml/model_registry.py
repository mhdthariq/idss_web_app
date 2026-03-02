"""
Model Registry — singleton module that loads all ML artifacts once.

Usage
-----
Call ``initialise()`` during FastAPI lifespan (startup) so every
subsequent request can call ``get_xgb_model()``, ``get_mlp()``, etc.
without touching the filesystem.

The registry is intentionally **module-level state** (simple singleton
pattern) rather than a class, because FastAPI's dependency-injection
makes it easy to wrap these getters with ``Depends()``.
"""

from __future__ import annotations

import json
import logging
import pickle
from pathlib import Path
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level state (populated by ``initialise()``)
# ---------------------------------------------------------------------------
_pipeline_maps: dict[str, Any] | None = None
_xgb_model: Any | None = None
_mlp_model: Any | None = None  # ResidualEmbeddingMLP instance (eval mode)
_mlp_scaler: Any | None = None  # StandardScaler for continuous features
_mlp_config: dict[str, Any] | None = None
_shap_explainer: Any | None = None  # SHAP TreeExplainer for XGBoost
_is_initialised: bool = False


# ---------------------------------------------------------------------------
# Public helpers — used by services & route handlers
# ---------------------------------------------------------------------------


def is_initialised() -> bool:
    return _is_initialised


def get_pipeline_maps() -> dict[str, Any]:
    """Return the feature-engineering pipeline maps dict."""
    if _pipeline_maps is None:
        raise RuntimeError(
            "Model registry not initialised. Call model_registry.initialise() during app startup."
        )
    return _pipeline_maps


def get_xgb_model() -> Any:
    """Return the XGBoost model (sklearn-compatible API)."""
    if _xgb_model is None:
        raise RuntimeError("XGBoost model not loaded.")
    return _xgb_model


def get_mlp() -> tuple[Any, Any, dict[str, Any]] | None:
    """
    Return ``(model, scaler, config)`` for the MLP, or ``None`` if MLP
    artifacts were not available at startup.
    """
    if _mlp_model is None:
        return None
    return _mlp_model, _mlp_scaler, _mlp_config  # type: ignore[return-value]


def get_shap_explainer() -> Any | None:
    """Return the SHAP TreeExplainer for XGBoost, or ``None``."""
    return _shap_explainer


def get_unique_values() -> dict[str, list[str]]:
    """
    Return dropdown unique values extracted from pipeline_maps.

    Falls back to an empty dict per column if not available.
    """
    maps = get_pipeline_maps()
    return maps.get("unique_values", {})


# ---------------------------------------------------------------------------
# Initialisation
# ---------------------------------------------------------------------------


def _load_pickle(path: Path, label: str) -> Any:
    """Load a pickle file with error handling."""
    logger.info("Loading %s from %s …", label, path)
    with open(path, "rb") as f:
        return pickle.load(f)  # noqa: S301


def _load_json(path: Path, label: str) -> dict:
    """Load a JSON file with error handling."""
    logger.info("Loading %s from %s …", label, path)
    with open(path) as f:
        return json.load(f)


def _load_mlp(
    weights_path: Path,
    scaler_path: Path,
    config_path: Path,
) -> tuple[Any, Any, dict[str, Any]] | None:
    """
    Attempt to load the ResidualEmbeddingMLP and its scaler.

    Returns ``(model, scaler, config)`` on success, ``None`` on failure
    (missing files, import errors, etc.).
    """
    if not all(p.exists() for p in [weights_path, scaler_path, config_path]):
        missing = [str(p) for p in [weights_path, scaler_path, config_path] if not p.exists()]
        logger.warning("MLP artifacts missing — skipping MLP: %s", missing)
        return None

    try:
        import torch  # noqa: F811

        # The parent project's src must already be on sys.path
        # (handled by backend.app.config on import).
        from src.models import ResidualEmbeddingMLP  # type: ignore[import-untyped]

        config = _load_json(config_path, "MLP config")
        scaler = _load_pickle(scaler_path, "MLP scaler")

        cat_cardinalities = {k: int(v) for k, v in config["cat_cardinalities"].items()}

        model = ResidualEmbeddingMLP(
            cat_cardinalities=cat_cardinalities,
            n_continuous=config["n_continuous"],
            hidden_dims=config["hidden_dims"],
            dropout=config["dropout"],
            emb_dropout=config["emb_dropout"],
            use_layernorm=config["use_layernorm"],
            use_input_batchnorm=config["use_input_batchnorm"],
        )
        state_dict = torch.load(weights_path, map_location="cpu", weights_only=True)
        model.load_state_dict(state_dict)
        model.eval()

        logger.info(
            "MLP loaded successfully — %d params",
            sum(p.numel() for p in model.parameters()),
        )
        return model, scaler, config

    except Exception:
        logger.exception("Failed to load MLP model — MLP predictions will be unavailable")
        return None


def _build_shap_explainer(xgb_model: Any) -> Any | None:
    """
    Try to build a SHAP TreeExplainer around the XGBoost model.

    Returns ``None`` if SHAP is not installed or creation fails.

    Known issue
    -----------
    SHAP 0.46–0.49 is incompatible with XGBoost ≥ 2.x because XGBoost
    serialises ``base_score`` as ``"[5E-1]"`` (bracketed scientific
    notation) while SHAP does ``float(base_score)`` which chokes on the
    brackets.  This is tracked upstream as shap#3561.

    Workaround: we temporarily replace ``builtins.float`` with a
    bracket-tolerant wrapper for the duration of the ``TreeExplainer()``
    call only, then restore it immediately.  This is scoped tightly and
    has no lasting side-effects.
    """
    try:
        import builtins

        import shap  # type: ignore[import-untyped]

        _real_float = builtins.float

        class _BracketTolerantFloat(_real_float):  # type: ignore[misc]
            """``float`` subclass that strips ``[…]`` brackets before converting."""

            def __new__(cls, x: Any = 0) -> _BracketTolerantFloat:  # noqa: ANN401
                if isinstance(x, str):
                    s = x.strip()
                    if s.startswith("[") and s.endswith("]"):
                        s = s[1:-1]
                    return _real_float.__new__(cls, s)
                return _real_float.__new__(cls, x)

        # Temporarily override builtins.float so SHAP's
        # ``float(learner_model_param["base_score"])`` can parse ``"[5E-1]"``
        builtins.float = _BracketTolerantFloat  # type: ignore[assignment]
        try:
            explainer = shap.TreeExplainer(xgb_model)
        finally:
            builtins.float = _real_float  # always restore

        logger.info("SHAP TreeExplainer created for XGBoost")
        return explainer
    except Exception:
        # Ensure builtins.float is restored even on unexpected import errors
        try:
            builtins.float = _real_float  # type: ignore[possibly-undefined]
        except NameError:
            pass
        logger.warning(
            "Could not build SHAP explainer — SHAP explanations will be unavailable. "
            "This is a known SHAP/XGBoost ≥2 compatibility issue (shap#3561). "
            "Precomputed SHAP values from /api/data/shap are still available.",
            exc_info=True,
        )
        return None


def initialise(
    *,
    pipeline_maps_path: Path | None = None,
    xgb_model_path: Path | None = None,
    mlp_weights_path: Path | None = None,
    mlp_scaler_path: Path | None = None,
    mlp_config_path: Path | None = None,
    build_shap: bool = True,
) -> dict[str, bool]:
    """
    Load all ML artifacts into module-level state.

    Parameters can be overridden for testing; by default they are read
    from ``backend.app.config``.

    Returns a status dict (artifact name → loaded successfully).
    """
    global _pipeline_maps, _xgb_model, _mlp_model, _mlp_scaler
    global _mlp_config, _shap_explainer, _is_initialised

    # Import paths from config (this also ensures sys.path is set up)
    from backend.app.config import (
        MLP_CONFIG_PATH,
        MLP_SCALER_PATH,
        MLP_WEIGHTS_PATH,
        PIPELINE_MAPS_PATH,
        XGB_MODEL_PATH,
    )

    pipeline_maps_path = pipeline_maps_path or PIPELINE_MAPS_PATH
    xgb_model_path = xgb_model_path or XGB_MODEL_PATH
    mlp_weights_path = mlp_weights_path or MLP_WEIGHTS_PATH
    mlp_scaler_path = mlp_scaler_path or MLP_SCALER_PATH
    mlp_config_path = mlp_config_path or MLP_CONFIG_PATH

    status: dict[str, bool] = {}

    # --- Pipeline maps (required) ---
    try:
        _pipeline_maps = _load_pickle(pipeline_maps_path, "pipeline_maps")
        status["pipeline_maps"] = True
    except FileNotFoundError:
        logger.error(
            "pipeline_maps.pkl not found at %s — "
            "run `python app/prepare_pipeline.py` in the parent project first.",
            pipeline_maps_path,
        )
        status["pipeline_maps"] = False
        # We still continue; some endpoints (analysis) may work without it.

    # --- XGBoost model (required) ---
    try:
        _xgb_model = _load_pickle(xgb_model_path, "XGBoost model")
        status["xgb_model"] = True
    except FileNotFoundError:
        logger.error(
            "XGBoost model not found at %s — prediction endpoints will be unavailable.",
            xgb_model_path,
        )
        status["xgb_model"] = False

    # --- MLP (optional) ---
    mlp_result = _load_mlp(mlp_weights_path, mlp_scaler_path, mlp_config_path)
    if mlp_result is not None:
        _mlp_model, _mlp_scaler, _mlp_config = mlp_result
        status["mlp_model"] = True
    else:
        status["mlp_model"] = False

    # --- SHAP explainer (optional, depends on XGB) ---
    if build_shap and _xgb_model is not None:
        _shap_explainer = _build_shap_explainer(_xgb_model)
        status["shap_explainer"] = _shap_explainer is not None
    else:
        status["shap_explainer"] = False

    _is_initialised = True
    logger.info("Model registry initialised: %s", status)
    return status


def teardown() -> None:
    """Release all loaded artifacts (called on shutdown)."""
    global _pipeline_maps, _xgb_model, _mlp_model, _mlp_scaler
    global _mlp_config, _shap_explainer, _is_initialised

    _pipeline_maps = None
    _xgb_model = None
    _mlp_model = None
    _mlp_scaler = None
    _mlp_config = None
    _shap_explainer = None
    _is_initialised = False
    logger.info("Model registry torn down.")
