"""
Convert the PyTorch MLP model to ONNX format for Vercel deployment.

This eliminates the ~2GB PyTorch dependency; the ~25MB onnxruntime
package can run the exported model instead.

Usage (from idss_web_app/):
    python -m backend.scripts.convert_mlp_to_onnx

Or directly:
    cd idss_web_app
    python backend/scripts/convert_mlp_to_onnx.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# ── Resolve project root ────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent          # backend/scripts/
BACKEND_DIR = SCRIPT_DIR.parent                        # backend/
PROJECT_ROOT = BACKEND_DIR.parent                      # idss_web_app/

# Ensure src/ is importable
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import numpy as np
import torch

from src.models import ResidualEmbeddingMLP  # type: ignore[import-untyped]

# ── Paths ────────────────────────────────────────────────────────────
MODELS_DIR = PROJECT_ROOT / "models"
WEIGHTS_PATH = MODELS_DIR / "mlp_v4.pt"
CONFIG_PATH = MODELS_DIR / "mlp_v4_config.json"
ONNX_OUTPUT_PATH = MODELS_DIR / "mlp_v4.onnx"


def main() -> None:
    print("=" * 60)
    print("  MLP → ONNX Conversion")
    print("=" * 60)

    # ── Load config ──────────────────────────────────────────────────
    with open(CONFIG_PATH) as f:
        config = json.load(f)

    cat_cardinalities = {k: int(v) for k, v in config["cat_cardinalities"].items()}
    n_continuous = config["n_continuous"]
    hidden_dims = config["hidden_dims"]

    print(f"  n_continuous : {n_continuous}")
    print(f"  n_categorical: {len(cat_cardinalities)}")
    print(f"  hidden_dims  : {hidden_dims}")

    # ── Reconstruct model ────────────────────────────────────────────
    model = ResidualEmbeddingMLP(
        cat_cardinalities=cat_cardinalities,
        n_continuous=n_continuous,
        hidden_dims=hidden_dims,
        dropout=config["dropout"],
        emb_dropout=config["emb_dropout"],
        use_layernorm=config["use_layernorm"],
        use_input_batchnorm=config["use_input_batchnorm"],
    )

    state_dict = torch.load(WEIGHTS_PATH, map_location="cpu", weights_only=True)
    model.load_state_dict(state_dict)
    model.eval()
    print(f"  Model loaded from {WEIGHTS_PATH}")

    # ── Create dummy inputs ──────────────────────────────────────────
    batch_size = 1
    dummy_cont = torch.randn(batch_size, n_continuous)
    dummy_cat = torch.zeros(batch_size, len(cat_cardinalities), dtype=torch.long)

    # ── Export to ONNX ───────────────────────────────────────────────
    torch.onnx.export(
        model,
        (dummy_cont, dummy_cat),
        str(ONNX_OUTPUT_PATH),
        input_names=["x_cont", "x_cat"],
        output_names=["logits"],
        dynamic_axes={
            "x_cont": {0: "batch_size"},
            "x_cat": {0: "batch_size"},
            "logits": {0: "batch_size"},
        },
        opset_version=17,
        do_constant_folding=True,
    )

    # ── Verify ───────────────────────────────────────────────────────
    import onnxruntime as ort

    session = ort.InferenceSession(str(ONNX_OUTPUT_PATH))
    ort_logits = session.run(
        None,
        {
            "x_cont": dummy_cont.numpy().astype(np.float32),
            "x_cat": dummy_cat.numpy().astype(np.int64),
        },
    )[0]

    # Compare with PyTorch output
    with torch.no_grad():
        pt_logits = model(dummy_cont, dummy_cat).numpy()

    max_diff = np.max(np.abs(pt_logits - ort_logits))
    print(f"\n  ONNX file     : {ONNX_OUTPUT_PATH}")
    print(f"  ONNX file size: {ONNX_OUTPUT_PATH.stat().st_size / 1024:.1f} KB")
    print(f"  Max diff (PT vs ONNX): {max_diff:.8f}")
    assert max_diff < 1e-5, f"ONNX output differs too much from PyTorch: {max_diff}"
    print("  ✓ Verification passed — outputs match!")
    print("=" * 60)


if __name__ == "__main__":
    main()
