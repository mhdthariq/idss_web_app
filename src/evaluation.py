"""
Model evaluation utilities.

Extracted from notebooks/03_modeling_ml.py to eliminate duplication.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)


def evaluate_model(
    model,
    X: pd.DataFrame,
    y: pd.Series,
    model_name: str,
    dataset_name: str = "Test",
    verbose: bool = True,
) -> dict:
    """Evaluate a trained classifier and return a dict of metrics."""
    y_pred = model.predict(X)
    y_proba = model.predict_proba(X)[:, 1]

    metrics = {
        "model": model_name,
        "dataset": dataset_name,
        "accuracy": accuracy_score(y, y_pred),
        "precision": precision_score(y, y_pred, zero_division=0),
        "recall": recall_score(y, y_pred, zero_division=0),
        "f1": f1_score(y, y_pred, zero_division=0),
        "auc_roc": roc_auc_score(y, y_proba),
        "avg_precision": average_precision_score(y, y_proba),
    }

    if verbose:
        print(f"\n{'=' * 60}")
        print(f"  {model_name} — {dataset_name} Set")
        print(f"{'=' * 60}")
        print(f"  Accuracy:          {metrics['accuracy']:.4f}")
        print(f"  Precision:         {metrics['precision']:.4f}")
        print(f"  Recall:            {metrics['recall']:.4f}")
        print(f"  F1 Score:          {metrics['f1']:.4f}")
        print(f"  AUC-ROC:           {metrics['auc_roc']:.4f}")
        print(f"  Avg Precision (PR):{metrics['avg_precision']:.4f}")
        print(f"\nClassification Report:")
        print(
            classification_report(
                y,
                y_pred,
                target_names=["On-time (0)", "Late (1)"],
                zero_division=0,
            )
        )
        cm = confusion_matrix(y, y_pred)
        print(f"  Confusion Matrix:")
        print(f"    TN={cm[0, 0]:5d}  FP={cm[0, 1]:5d}")
        print(f"    FN={cm[1, 0]:5d}  TP={cm[1, 1]:5d}")

    return metrics


def bootstrap_metrics(
    model,
    X: pd.DataFrame,
    y: pd.Series,
    n_bootstrap: int = 1000,
    random_state: int = 42,
) -> dict:
    """Compute bootstrap confidence intervals for AUC-ROC and F1."""
    rng = np.random.RandomState(random_state)
    n = len(y)

    y_proba = model.predict_proba(X)[:, 1]
    y_pred = model.predict(X)

    auc_scores = []
    f1_scores = []
    precision_scores = []
    recall_scores = []

    for _ in range(n_bootstrap):
        idx = rng.choice(n, size=n, replace=True)
        y_boot = y.values[idx]
        if len(np.unique(y_boot)) < 2:
            continue
        proba_boot = y_proba[idx]
        pred_boot = y_pred[idx]

        auc_scores.append(roc_auc_score(y_boot, proba_boot))
        f1_scores.append(f1_score(y_boot, pred_boot, zero_division=0))
        precision_scores.append(
            precision_score(y_boot, pred_boot, zero_division=0)
        )
        recall_scores.append(recall_score(y_boot, pred_boot, zero_division=0))

    return {
        "auc_mean": np.mean(auc_scores),
        "auc_std": np.std(auc_scores),
        "auc_ci_lower": np.percentile(auc_scores, 2.5),
        "auc_ci_upper": np.percentile(auc_scores, 97.5),
        "f1_mean": np.mean(f1_scores),
        "f1_std": np.std(f1_scores),
        "f1_ci_lower": np.percentile(f1_scores, 2.5),
        "f1_ci_upper": np.percentile(f1_scores, 97.5),
        "precision_mean": np.mean(precision_scores),
        "precision_ci_lower": np.percentile(precision_scores, 2.5),
        "precision_ci_upper": np.percentile(precision_scores, 97.5),
        "recall_mean": np.mean(recall_scores),
        "recall_ci_lower": np.percentile(recall_scores, 2.5),
        "recall_ci_upper": np.percentile(recall_scores, 97.5),
    }


def optimize_threshold(
    model,
    X_val: pd.DataFrame,
    y_val: pd.Series,
    model_name: str,
    metric: str = "f1",
) -> float:
    """Find the threshold that maximizes the chosen metric on validation."""
    y_proba = model.predict_proba(X_val)[:, 1]

    thresholds = np.arange(0.05, 0.95, 0.01)
    best_score = 0
    best_threshold = 0.5

    for t in thresholds:
        y_pred_t = (y_proba >= t).astype(int)
        if metric == "f1":
            score = f1_score(y_val, y_pred_t, zero_division=0)
        elif metric == "recall_at_precision":
            prec = precision_score(y_val, y_pred_t, zero_division=0)
            rec = recall_score(y_val, y_pred_t, zero_division=0)
            score = rec if prec >= 0.4 else 0
        else:
            score = f1_score(y_val, y_pred_t, zero_division=0)

        if score > best_score:
            best_score = score
            best_threshold = t

    default_f1 = f1_score(
        y_val, (y_proba >= 0.5).astype(int), zero_division=0
    )
    print(f"\n  {model_name} — Threshold Optimization ({metric}):")
    print(f"    Default (0.50): F1 = {default_f1:.4f}")
    print(f"    Optimal ({best_threshold:.2f}): F1 = {best_score:.4f}")

    return best_threshold


def evaluate_with_threshold(
    model,
    X: pd.DataFrame,
    y: pd.Series,
    threshold: float,
    model_name: str,
    dataset_name: str = "Test",
    verbose: bool = True,
) -> dict:
    """Evaluate model with a custom decision threshold."""
    y_proba = model.predict_proba(X)[:, 1]
    y_pred = (y_proba >= threshold).astype(int)

    metrics = {
        "model": f"{model_name} (t={threshold:.2f})",
        "dataset": dataset_name,
        "threshold": threshold,
        "accuracy": accuracy_score(y, y_pred),
        "precision": precision_score(y, y_pred, zero_division=0),
        "recall": recall_score(y, y_pred, zero_division=0),
        "f1": f1_score(y, y_pred, zero_division=0),
        "auc_roc": roc_auc_score(y, y_proba),
        "avg_precision": average_precision_score(y, y_proba),
    }

    if verbose:
        print(f"\n  {model_name} (threshold={threshold:.2f}) — {dataset_name}:")
        print(f"    Accuracy:  {metrics['accuracy']:.4f}")
        print(f"    Precision: {metrics['precision']:.4f}")
        print(f"    Recall:    {metrics['recall']:.4f}")
        print(f"    F1:        {metrics['f1']:.4f}")
        print(f"    AUC-ROC:   {metrics['auc_roc']:.4f}")
        print(f"    AP:        {metrics['avg_precision']:.4f}")

        cm = confusion_matrix(y, y_pred)
        print(
            f"    CM: TN={cm[0, 0]} FP={cm[0, 1]} FN={cm[1, 0]} TP={cm[1, 1]}"
        )

    return metrics
