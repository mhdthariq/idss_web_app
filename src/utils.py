"""
Utility functions and path constants.
"""

from __future__ import annotations

import random
from pathlib import Path

import numpy as np
import torch

# ---------------------------------------------------------------------------
# Path constants (resolved relative to the repo root)
# ---------------------------------------------------------------------------
# Resolve to idss_web_app/ (this file is at idss_web_app/src/utils.py)
ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
MODELS_DIR = ROOT / "models"


def set_seed(seed: int = 42) -> None:
    """Pin all sources of randomness for reproducibility."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False
