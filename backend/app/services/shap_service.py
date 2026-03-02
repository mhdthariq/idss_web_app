"""
SHAP service — loads and serves precomputed SHAP data.

This module handles two distinct SHAP use-cases:

1. **Precomputed global SHAP values** — loaded from the parent project's
   ``models/shap_values_v4.pkl`` and ``models/feature_importance_v4.json``
   artifacts.  These are used by the analysis pages (feature importance,
   SHAP summary plots, etc.).

2. **On-the-fly per-prediction SHAP** — computed by
   ``prediction_service._compute_shap_explanation()`` using the
   ``TreeExplainer`` held in ``model_registry``.  This module does NOT
   duplicate that logic; it only provides helpers for the *precomputed*
   data.

All heavy I/O (pickle / JSON loading) happens once at startup via
``load_precomputed_shap()`` and is cached in module-level state.
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
# Module-level cache
# ---------------------------------------------------------------------------
_shap_values: dict[str, Any] | None = None
_feature_importance: dict[str, Any] | None = None
_is_loaded: bool = False


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _numpy_to_python(obj: Any) -> Any:
    """
    Recursively convert numpy types to native Python types so the
    result is JSON-serialisable.

    Handles:
    - ``np.ndarray`` → ``list``
    - ``np.integer`` → ``int``
    - ``np.floating`` → ``float``
    - ``np.bool_`` → ``bool``
    - ``dict`` / ``list`` → recurse
    """
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        return float(obj)
    if isinstance(obj, np.bool_):
        return bool(obj)
    if isinstance(obj, dict):
        return {k: _numpy_to_python(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_numpy_to_python(item) for item in obj]
    return obj


def _safe_load_pickle(path: Path, label: str) -> Any | None:
    """Load a pickle file, returning ``None`` on failure."""
    if not path.exists():
        logger.info("%s not found at %s — skipping", label, path)
        return None
    try:
        logger.info("Loading %s from %s …", label, path)
        with open(path, "rb") as f:
            data = pickle.load(f)  # noqa: S301
        return data
    except Exception:
        logger.warning("Failed to load %s from %s", label, path, exc_info=True)
        return None


def _safe_load_json(path: Path, label: str) -> dict[str, Any] | None:
    """Load a JSON file, returning ``None`` on failure."""
    if not path.exists():
        logger.info("%s not found at %s — skipping", label, path)
        return None
    try:
        logger.info("Loading %s from %s …", label, path)
        with open(path) as f:
            return json.load(f)
    except Exception:
        logger.warning("Failed to load %s from %s", label, path, exc_info=True)
        return None


# ---------------------------------------------------------------------------
# Initialisation (called during app startup)
# ---------------------------------------------------------------------------


def load_precomputed_shap(
    *,
    shap_values_path: Path | None = None,
    feature_importance_path: Path | None = None,
) -> dict[str, bool]:
    """
    Load precomputed SHAP values and feature importance data from disk.

    Parameters can be overridden for testing; by default they come from
    ``backend.app.config``.

    Returns
    -------
    dict[str, bool]
        Status dict indicating which artefacts were loaded successfully.
    """
    global _shap_values, _feature_importance, _is_loaded

    from backend.app.config import (
        FEATURE_IMPORTANCE_PATH,
        SHAP_VALUES_PATH,
    )

    shap_values_path = shap_values_path or SHAP_VALUES_PATH
    feature_importance_path = feature_importance_path or FEATURE_IMPORTANCE_PATH

    status: dict[str, bool] = {}

    # --- SHAP values (pickle — may contain numpy arrays) ---
    raw_shap = _safe_load_pickle(shap_values_path, "precomputed SHAP values")
    if raw_shap is not None:
        # Convert numpy arrays to lists so they are JSON-serialisable
        _shap_values = _numpy_to_python(raw_shap)
        status["shap_values"] = True
        logger.info(
            "SHAP values loaded — top-level keys: %s",
            list(_shap_values.keys()) if isinstance(_shap_values, dict) else type(_shap_values),
        )
    else:
        _shap_values = None
        status["shap_values"] = False

    # --- Feature importance (JSON) ---
    _feature_importance = _safe_load_json(feature_importance_path, "feature importance")
    status["feature_importance"] = _feature_importance is not None

    _is_loaded = True
    logger.info("SHAP service initialised: %s", status)
    return status


# ---------------------------------------------------------------------------
# Public getters (used by route handlers)
# ---------------------------------------------------------------------------


def is_loaded() -> bool:
    """Whether ``load_precomputed_shap()`` has been called."""
    return _is_loaded


def get_shap_values() -> dict[str, Any] | None:
    """
    Return the precomputed global SHAP values dict (JSON-safe).

    The exact structure depends on how the training pipeline saved the
    pickle (typically keys like ``"shap_values"``, ``"feature_names"``,
    ``"expected_value"``, etc.).

    Returns ``None`` if the artefact was not available.
    """
    return _shap_values


def get_feature_importance() -> dict[str, Any] | None:
    """
    Return the feature importance JSON data.

    Typically contains model-level feature importance scores
    (e.g. from XGBoost ``feature_importances_``).

    Returns ``None`` if the artefact was not available.
    """
    return _feature_importance


def get_combined_shap_data() -> dict[str, Any]:
    """
    Return both SHAP values and feature importance in a single dict,
    suitable for the ``GET /api/data/shap`` response.

    Returns
    -------
    dict with keys ``"shap_values"`` and ``"feature_importance"``,
    each of which may be ``None``.
    """
    return {
        "shap_values": _shap_values,
        "feature_importance": _feature_importance,
    }


# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------


def teardown() -> None:
    """Release cached data (called on shutdown)."""
    global _shap_values, _feature_importance, _is_loaded
    _shap_values = None
    _feature_importance = None
    _is_loaded = False
    logger.info("SHAP service torn down.")
