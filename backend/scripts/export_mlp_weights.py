"""
Export MLP weights from ONNX model to JSON for pure TypeScript inference.
"""

import json
import numpy as np
import onnx
from onnx import numpy_helper
from pathlib import Path

MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "models"
OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "backend-bun" / "data"


def export_mlp_weights():
    onnx_path = MODELS_DIR / "mlp_v4.onnx"
    model = onnx.load(str(onnx_path), load_external_data=True)

    print("=== ONNX Model Weights ===")
    weights = {}
    for init in model.graph.initializer:
        arr = numpy_helper.to_array(init)
        print(f"  {init.name}: shape={list(arr.shape)}")
        weights[init.name] = arr.tolist()

    print(f"\n=== ONNX Graph Nodes ===")
    for node in model.graph.node:
        print(f"  {node.op_type}: {list(node.input)} → {list(node.output)}")

    # Save weights
    out_path = OUTPUT_DIR / "mlp_weights.json"
    with open(out_path, "w") as f:
        json.dump(weights, f, separators=(",", ":"))
    print(f"\n→ Saved weights to {out_path} ({out_path.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    export_mlp_weights()
