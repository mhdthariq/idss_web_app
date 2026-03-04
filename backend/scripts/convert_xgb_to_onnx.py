"""
Convert the XGBoost model to ONNX format for Vercel deployment.

XGBoost's booster has a native save_model() that supports .json and .ubj formats.
We export as JSON + convert to ONNX using the XGBoost booster's built-in method.

Usage (from idss_web_app/):
    cd idss_web_app
    uv run python backend/scripts/convert_xgb_to_onnx.py
"""

from __future__ import annotations

import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import pickle

import numpy as np

MODELS_DIR = PROJECT_ROOT / "models"
XGB_PICKLE_PATH = MODELS_DIR / "xgb_orig_v4.pkl"
XGB_JSON_PATH = MODELS_DIR / "xgb_orig_v4.json"


def main() -> None:
    print("=" * 60)
    print("  XGBoost → JSON Conversion")
    print("=" * 60)

    # ── Load model ───────────────────────────────────────────────────
    print(f"  Loading model from {XGB_PICKLE_PATH}")
    with open(XGB_PICKLE_PATH, "rb") as f:
        xgb_model = pickle.load(f)  # noqa: S301
    print(f"  Model type: {type(xgb_model).__name__}")

    # ── Export booster to JSON ───────────────────────────────────────
    # XGBoost's JSON format can be loaded without the full sklearn wrapper
    booster = xgb_model.get_booster()
    booster.save_model(str(XGB_JSON_PATH))

    print(f"  JSON file: {XGB_JSON_PATH}")
    print(f"  JSON size: {XGB_JSON_PATH.stat().st_size / 1024:.1f} KB")

    # ── Verify JSON roundtrip ────────────────────────────────────────
    import xgboost as xgb

    booster2 = xgb.Booster()
    booster2.load_model(str(XGB_JSON_PATH))

    from src.features import CONSERVATIVE_FEATURES  # type: ignore[import-untyped]
    n_features = len(CONSERVATIVE_FEATURES)

    # Compare predictions
    dummy = np.random.randn(5, n_features).astype(np.float32)

    # Original sklearn predict_proba
    sk_probas = xgb_model.predict_proba(dummy)[:, 1]

    # Booster predict (returns raw scores, need sigmoid for binary classification)
    dmatrix = xgb.DMatrix(dummy, feature_names=list(CONSERVATIVE_FEATURES))
    raw_preds = booster2.predict(dmatrix)

    max_diff = np.max(np.abs(sk_probas - raw_preds))
    print(f"\n  Max diff (sklearn vs JSON booster): {max_diff:.8f}")
    for i in range(min(3, len(sk_probas))):
        print(f"    Row {i}: sklearn={sk_probas[i]:.6f}  json={raw_preds[i]:.6f}")

    assert max_diff < 1e-5, f"Outputs differ too much: {max_diff}"
    print("  ✓ Verification passed!")
    print("=" * 60)


if __name__ == "__main__":
    main()
