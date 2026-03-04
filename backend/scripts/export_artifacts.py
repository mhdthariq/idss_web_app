"""
Export all Python pickle artifacts to JSON for the Bun/Elysia backend.

Usage:
    cd idss_web_app
    uv run python backend/scripts/export_artifacts.py
"""

from __future__ import annotations

import json
import pickle
import sys
from pathlib import Path

import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

MODELS_DIR = PROJECT_ROOT / "models"
OUTPUT_DIR = PROJECT_ROOT / "backend-bun" / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def _to_serializable(obj):
    """Recursively convert numpy types to Python natives for JSON."""
    if isinstance(obj, dict):
        return {str(k): _to_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [_to_serializable(v) for v in obj]
    elif isinstance(obj, np.ndarray):
        return [_to_serializable(v) for v in obj.tolist()]
    elif isinstance(obj, (np.integer,)):
        return int(obj)
    elif isinstance(obj, (np.floating, float)):
        v = float(obj)
        if v == float("inf"):
            return 1e18
        elif v == float("-inf"):
            return -1e18
        elif v != v:  # NaN check
            return 0.0
        return v
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, (np.str_,)):
        return str(obj)
    elif isinstance(obj, bytes):
        return obj.decode("utf-8", errors="replace")
    else:
        return obj


def export_pipeline_maps():
    """Export pipeline_maps.pkl to pipeline_maps.json."""
    print("Exporting pipeline_maps.pkl ...")
    with open(MODELS_DIR / "pipeline_maps.pkl", "rb") as f:
        pm = pickle.load(f)  # noqa: S301

    out = {}

    # Simple scalar / dict values
    for key in [
        "winsor_bounds", "jumlah_bin_edges", "jumlah_bin_labels",
        "global_jumlah_mean", "global_total_mean", "global_late_rate",
        "global_median", "global_diversity", "global_sales_cust",
        "cust_total_map", "cust_late_rate_map",
        "branch_medians", "div_medians",
        "sales_div_diversity", "sales_cust_count",
        "target_encoding", "frequency_encoding",
        "interaction_te", "interaction_freq",
        "unique_values",
    ]:
        if key in pm:
            out[key] = _to_serializable(pm[key])

    # Group aggregations
    if "group_agg" in pm:
        ga = {}
        for prefix, info in pm["group_agg"].items():
            ga[prefix] = {
                "avg_map": _to_serializable(info.get("avg_map", {})),
                "count_map": _to_serializable(info.get("count_map", {})),
                "std_map": _to_serializable(info.get("std_map", {})),
            }
        out["group_agg"] = ga

    # Label encoders — convert sklearn LabelEncoder to {value: index}
    if "label_encoders" in pm:
        le_out = {}
        for col, le in pm["label_encoders"].items():
            classes = le.classes_.tolist() if hasattr(le, "classes_") else []
            le_out[col] = {str(cls): idx for idx, cls in enumerate(classes)}
        out["label_encoders"] = le_out

    path = OUTPUT_DIR / "pipeline_maps.json"
    with open(path, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"  → {path} ({path.stat().st_size / 1024:.1f} KB)")


def export_mlp_scaler():
    """Export mlp_v4_scaler.pkl to mlp_scaler.json (mean + scale arrays)."""
    print("Exporting mlp_v4_scaler.pkl ...")
    with open(MODELS_DIR / "mlp_v4_scaler.pkl", "rb") as f:
        scaler = pickle.load(f)  # noqa: S301

    out = {
        "mean": scaler.mean_.tolist(),
        "scale": scaler.scale_.tolist(),
        "n_features": int(scaler.n_features_in_),
    }

    path = OUTPUT_DIR / "mlp_scaler.json"
    with open(path, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"  → {path} ({path.stat().st_size / 1024:.1f} KB)")


def export_shap_values():
    """Export shap_values_v4.pkl to shap_values.json."""
    print("Exporting shap_values_v4.pkl ...")
    with open(MODELS_DIR / "shap_values_v4.pkl", "rb") as f:
        sv = pickle.load(f)  # noqa: S301

    out = _to_serializable(sv)

    path = OUTPUT_DIR / "shap_values.json"
    with open(path, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"  → {path} ({path.stat().st_size / 1024:.1f} KB)")


def copy_json_files():
    """Copy existing JSON files to the output directory."""
    print("Copying existing JSON files ...")
    json_files = [
        "xgb_orig_v4.json",
        "mlp_v4_config.json",
        "feature_importance_v4.json",
        "ml_metrics_v4.json",
        "calibration_metrics_v4.json",
        "cost_analysis_v4.json",
        "statistical_tests_v4.json",
        "split_instability_results.json",
        "shap_comparison_v4.json",
    ]
    for fname in json_files:
        src = MODELS_DIR / fname
        if src.exists():
            dst = OUTPUT_DIR / fname
            dst.write_bytes(src.read_bytes())
            print(f"  → {dst.name} ({dst.stat().st_size / 1024:.1f} KB)")
        else:
            print(f"  ✗ {fname} not found, skipping")


def main():
    print("=" * 60)
    print("  Exporting Python artifacts to JSON")
    print("=" * 60)

    export_pipeline_maps()
    export_mlp_scaler()
    export_shap_values()
    copy_json_files()

    print("=" * 60)
    print("  Done! All artifacts exported to:", OUTPUT_DIR)
    print("=" * 60)


if __name__ == "__main__":
    main()
