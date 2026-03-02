"""
Configuration constants for the debt prediction project.

Single source of truth for all magic numbers and hyperparameters
that were previously scattered across multiple files.
"""

# ---------------------------------------------------------------------------
# Random seed & reproducibility
# ---------------------------------------------------------------------------
RANDOM_STATE = 42

# ---------------------------------------------------------------------------
# Target definition
# ---------------------------------------------------------------------------
TARGET_COLUMN = "Is_Late"
LATE_THRESHOLD = 30  # days; Umur > 30 → Late

# ---------------------------------------------------------------------------
# Data split ratios (customer-wise GroupShuffleSplit)
# ---------------------------------------------------------------------------
TRAIN_SIZE = 0.70
VAL_SIZE = 0.15
TEST_SIZE = 0.15

# ---------------------------------------------------------------------------
# Feature engineering
# ---------------------------------------------------------------------------
WINSOR_LOWER = 0.01
WINSOR_UPPER = 0.99
TARGET_ENCODING_SMOOTHING = 20

# ---------------------------------------------------------------------------
# SMOTE augmentation
# ---------------------------------------------------------------------------
SMOTE_K_NEIGHBORS = 5
SMOTE_SAMPLING_STRATEGY = 1.0
