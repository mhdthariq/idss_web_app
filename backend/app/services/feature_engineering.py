"""
Feature engineering service.

Wraps the ``engineer_single_transaction`` logic from the parent project's
Streamlit app so the FastAPI backend can transform raw user input into the
69-feature CONSERVATIVE_FEATURES vector required by both models.

This module **does not** import from the Streamlit app directly (to avoid
pulling in ``streamlit`` as a dependency).  Instead it re-implements the
same logic by reading from ``pipeline_maps`` — the dict produced by
``src.preprocessing.engineer_features()`` and persisted as
``models/pipeline_maps.pkl``.

The implementation mirrors ``app/streamlit_app.py::engineer_single_transaction``
line-for-line so results are identical.
"""

from __future__ import annotations

import logging
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# The parent project's ``src`` package must be on ``sys.path`` before this
# module is imported.  ``backend.app.config`` handles that on first import.
from src.features import CONSERVATIVE_FEATURES  # type: ignore[import-untyped]

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def engineer_single_transaction(
    raw_input: dict[str, Any],
    pipeline_maps: dict[str, Any],
) -> pd.DataFrame:
    """
    Transform a single raw transaction dict into a model-ready feature row.

    Parameters
    ----------
    raw_input : dict
        Keys expected (matching the Streamlit form):
            Jumlah, KodeCustomer, NamaSalesman, NamaDivisi, NamaKategori,
            NamaSubKategori, KodeCabang, Provinsi, Kota, Kecamatan,
            NamaGroupCustomer, Keterangan
    pipeline_maps : dict
        The dict loaded from ``models/pipeline_maps.pkl``.

    Returns
    -------
    pd.DataFrame
        Single-row DataFrame with exactly the 69 CONSERVATIVE_FEATURES
        columns, ready to be fed to XGBoost / MLP.
    """
    row: dict[str, Any] = {}
    jumlah = float(raw_input["Jumlah"])
    row["Jumlah"] = jumlah

    # ------------------------------------------------------------------
    # Winsorised amount features
    # ------------------------------------------------------------------
    wb = pipeline_maps.get("winsor_bounds", {})
    jl = wb.get("jumlah_lower", 0)
    ju = wb.get("jumlah_upper", 1e12)
    row["Jumlah_Winsor"] = float(np.clip(jumlah, jl, ju))
    row["Log_Jumlah"] = float(np.log1p(jumlah))
    row["Log_Jumlah_Winsor"] = float(np.log1p(row["Jumlah_Winsor"]))

    # ------------------------------------------------------------------
    # Jumlah bin + approximate percentile
    # ------------------------------------------------------------------
    bin_edges = pipeline_maps.get("jumlah_bin_edges", [-np.inf, 0, 0, 0, np.inf])
    bin_labels = pipeline_maps.get(
        "jumlah_bin_labels", ["Q1_Low", "Q2_Mid_Low", "Q3_Mid_High", "Q4_High"]
    )

    jumlah_bin = bin_labels[-1]  # default to highest
    for i in range(len(bin_edges) - 1):
        if bin_edges[i] <= jumlah < bin_edges[i + 1]:
            jumlah_bin = bin_labels[i]
            break

    # Approximate percentile from bin index
    bin_idx = bin_labels.index(jumlah_bin) if jumlah_bin in bin_labels else 2
    row["Jumlah_Percentile"] = (bin_idx + 0.5) / len(bin_labels)

    # ------------------------------------------------------------------
    # Binary flags
    # ------------------------------------------------------------------
    row["Is_Group_Customer"] = (
        0 if raw_input.get("NamaGroupCustomer", "NON-GROUP CUSTOMER") == "NON-GROUP CUSTOMER" else 1
    )
    row["Has_Remark"] = 0 if raw_input.get("Keterangan", "No Remark") == "No Remark" else 1

    # ------------------------------------------------------------------
    # Group aggregation features
    # ------------------------------------------------------------------
    global_mean = pipeline_maps.get("global_jumlah_mean", jumlah)
    agg_maps = pipeline_maps.get("group_agg", {})

    # prefix → raw_input key
    agg_key_map = {
        "Cust": "KodeCustomer",
        "SubCat": "NamaSubKategori",
        "Div": "NamaDivisi",
        "Branch": "KodeCabang",
        "Sales": "NamaSalesman",
        "Kota": "Kota",
    }

    for prefix, raw_key in agg_key_map.items():
        agg_info = agg_maps.get(prefix, {})
        lookup_val = raw_input.get(raw_key, "")
        row[f"{prefix}_Avg_Jumlah"] = agg_info.get("avg_map", {}).get(lookup_val, global_mean)
        row[f"{prefix}_Tx_Count"] = int(agg_info.get("count_map", {}).get(lookup_val, 1))
        row[f"{prefix}_Std_Jumlah"] = agg_info.get("std_map", {}).get(lookup_val, 0.0)

    # Customer total Jumlah
    cust_code = raw_input.get("KodeCustomer", "")
    cust_total_map = pipeline_maps.get("cust_total_map", {})
    global_total_mean = pipeline_maps.get("global_total_mean", jumlah)
    row["Cust_Total_Jumlah"] = cust_total_map.get(cust_code, global_total_mean)

    # Customer historical late rate
    global_late = pipeline_maps.get("global_late_rate", 0.289)
    cust_late_map = pipeline_maps.get("cust_late_rate_map", {})
    row["Cust_Historical_Late_Rate"] = cust_late_map.get(cust_code, global_late)

    # ------------------------------------------------------------------
    # Rank / ratio features
    # ------------------------------------------------------------------
    branch_medians = pipeline_maps.get("branch_medians", {})
    div_medians = pipeline_maps.get("div_medians", {})
    global_median = pipeline_maps.get("global_median", global_mean)

    branch_code = raw_input.get("KodeCabang", "")
    div_name = raw_input.get("NamaDivisi", "")
    branch_med = branch_medians.get(branch_code, global_median)
    div_med = div_medians.get(div_name, global_median)

    row["Branch_Jumlah_Ratio"] = jumlah / (branch_med + 1)
    row["Div_Jumlah_Ratio"] = jumlah / (div_med + 1)

    cust_avg = row["Cust_Avg_Jumlah"]
    cust_std = row["Cust_Std_Jumlah"]
    row["Jumlah_Cust_Zscore"] = (jumlah - cust_avg) / cust_std if cust_std > 0 else 0.0
    row["Log_Jumlah_vs_Branch"] = np.log1p(jumlah) - np.log1p(row["Branch_Avg_Jumlah"])
    row["Log_Jumlah_vs_Div"] = np.log1p(jumlah) - np.log1p(row["Div_Avg_Jumlah"])

    # ------------------------------------------------------------------
    # Target encodings
    # ------------------------------------------------------------------
    te_maps = pipeline_maps.get("target_encoding", {})
    te_col_raw_map: dict[str, str | None] = {
        "NamaSalesman": "NamaSalesman",
        "NamaSubKategori": "NamaSubKategori",
        "NamaDivisi": "NamaDivisi",
        "Kota": "Kota",
        "KodeCabang": "KodeCabang",
        "Kecamatan": "Kecamatan",
        "NamaGroupCustomer": "NamaGroupCustomer",
        "NamaKategori": "NamaKategori",
        "Jumlah_Bin": None,  # handled via jumlah_bin local variable
    }
    for te_col, raw_key in te_col_raw_map.items():
        enc_map = te_maps.get(te_col, {})
        if raw_key is not None:
            val = raw_input.get(raw_key, "")
        else:
            val = jumlah_bin
        row[f"{te_col}_TE"] = enc_map.get(val, global_late)

    # ------------------------------------------------------------------
    # Frequency encodings
    # ------------------------------------------------------------------
    freq_maps = pipeline_maps.get("frequency_encoding", {})
    freq_cols = [
        "NamaSalesman",
        "NamaSubKategori",
        "NamaDivisi",
        "Kota",
        "KodeCabang",
        "Kecamatan",
        "NamaGroupCustomer",
        "NamaKategori",
    ]
    for col in freq_cols:
        enc_map = freq_maps.get(col, {})
        val = raw_input.get(col, "")
        row[f"{col}_Freq"] = enc_map.get(val, 0.0)

    # ------------------------------------------------------------------
    # Interaction features (target-encoded + frequency-encoded)
    # ------------------------------------------------------------------
    interaction_te = pipeline_maps.get("interaction_te", {})
    interaction_freq = pipeline_maps.get("interaction_freq", {})

    for prefix, info in interaction_te.items():
        col_a = info["col_a"]
        col_b = info["col_b"]
        combined = str(raw_input.get(col_a, "")) + "__" + str(raw_input.get(col_b, ""))
        row[f"{prefix}__interaction_{prefix}_TE"] = info["map"].get(combined, global_late)

    for prefix, info in interaction_freq.items():
        col_a = info["col_a"]
        col_b = info["col_b"]
        combined = str(raw_input.get(col_a, "")) + "__" + str(raw_input.get(col_b, ""))
        row[f"{prefix}__interaction_{prefix}_Freq"] = info["map"].get(combined, 0.0)

    # ------------------------------------------------------------------
    # Additional derived features
    # ------------------------------------------------------------------
    salesman = raw_input.get("NamaSalesman", "")

    sales_div_diversity = pipeline_maps.get("sales_div_diversity", {})
    global_diversity = pipeline_maps.get("global_diversity", 1.0)
    row["Sales_Div_Diversity"] = sales_div_diversity.get(salesman, global_diversity)

    sales_cust_count = pipeline_maps.get("sales_cust_count", {})
    global_sales_cust = pipeline_maps.get("global_sales_cust", 1.0)
    row["Sales_Cust_Count"] = sales_cust_count.get(salesman, global_sales_cust)

    # ------------------------------------------------------------------
    # Label encodings
    # ------------------------------------------------------------------
    le_map = pipeline_maps.get("label_encoders", {})
    le_col_raw_map: dict[str, str | None] = {
        "NamaKategori": "NamaKategori",
        "NamaSubKategori": "NamaSubKategori",
        "NamaDivisi": "NamaDivisi",
        "KodeCabang": "KodeCabang",
        "Provinsi": "Provinsi",
        "Kota": "Kota",
        "Jumlah_Bin": None,  # use local jumlah_bin
        "NamaSalesman": "NamaSalesman",
        "Kecamatan": "Kecamatan",
        "NamaGroupCustomer": "NamaGroupCustomer",
    }
    for le_col, raw_key in le_col_raw_map.items():
        le = le_map.get(le_col)
        if raw_key is not None:
            val = str(raw_input.get(raw_key, ""))
        else:
            val = str(jumlah_bin)
        if le is not None and val in le.classes_:
            row[f"{le_col}_Encoded"] = int(le.transform([val])[0])
        else:
            # Unknown category → assign code = len(classes) (out-of-vocabulary)
            row[f"{le_col}_Encoded"] = len(le.classes_) if le is not None else 0

    # ------------------------------------------------------------------
    # Build DataFrame and ensure all 69 features exist
    # ------------------------------------------------------------------
    df = pd.DataFrame([row])
    for feat in CONSERVATIVE_FEATURES:
        if feat not in df.columns:
            df[feat] = 0.0

    return df[CONSERVATIVE_FEATURES]


def engineer_batch_transactions(
    raw_inputs: list[dict[str, Any]],
    pipeline_maps: dict[str, Any],
) -> tuple[pd.DataFrame, list[int]]:
    """
    Engineer features for a batch of raw inputs.

    Parameters
    ----------
    raw_inputs : list[dict]
        Each element is a raw_input dict (same keys as single transaction).
    pipeline_maps : dict
        The pipeline maps loaded at startup.

    Returns
    -------
    tuple[pd.DataFrame, list[int]]
        (feature_df, failed_indices) where ``feature_df`` contains rows
        for all *successful* transformations and ``failed_indices`` lists
        the indices that could not be processed.
    """
    frames: list[pd.DataFrame] = []
    failed_indices: list[int] = []

    for idx, raw_input in enumerate(raw_inputs):
        try:
            df_row = engineer_single_transaction(raw_input, pipeline_maps)
            df_row.index = [idx]
            frames.append(df_row)
        except Exception:
            logger.warning("Failed to engineer features for row %d", idx, exc_info=True)
            failed_indices.append(idx)

    if frames:
        feature_df = pd.concat(frames, axis=0)
    else:
        feature_df = pd.DataFrame(columns=CONSERVATIVE_FEATURES)

    return feature_df, failed_indices
