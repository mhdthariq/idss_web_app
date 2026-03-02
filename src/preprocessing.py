"""
Data preprocessing functions.

Extracted from prepare_pipeline.py and split_instability_analysis.py
to eliminate duplication.

Functions
---------
- load_and_clean_data : Load raw CSV, create target, clean categories.
- customer_wise_split : Customer-grouped 70/15/15 split.
- engineer_features   : Full v4 feature engineering pipeline.
- augment_train       : SMOTE augmentation with post-processing.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTE
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import LabelEncoder

from src.config import (
    LATE_THRESHOLD,
    SMOTE_K_NEIGHBORS,
    SMOTE_SAMPLING_STRATEGY,
    TARGET_COLUMN,
    TARGET_ENCODING_SMOOTHING,
    TEST_SIZE,
    TRAIN_SIZE,
    VAL_SIZE,
    WINSOR_LOWER,
    WINSOR_UPPER,
)
from src.features import BINARY_FEATURES, INTEGER_FEATURES


# ===================================================================
# Data Loading & Cleaning
# ===================================================================
def load_and_clean_data(path: Path) -> pd.DataFrame:
    """
    Load raw CSV, create target column, filter OTOMOTIVE, merge small
    categories, and fill missing values.
    """
    df = pd.read_csv(path)
    df["Tanggal"] = pd.to_datetime(df["Tanggal"], dayfirst=True)
    df[TARGET_COLUMN] = (df["Umur"] > LATE_THRESHOLD).astype(int)

    # Remove OTOMOTIVE
    df = df[df["NamaKategori"] != "OTOMOTIVE"].copy()

    # Merge small categories
    small_cats = ["INSTITUSI", "NON-KATEGORI"]
    df.loc[df["NamaKategori"].isin(small_cats), "NamaKategori"] = "OTHER"

    # Fill missing
    df["Keterangan"] = df["Keterangan"].fillna("No Remark")
    df["Kelurahan"] = df["Kelurahan"].fillna("Unknown")
    df["Kecamatan"] = df["Kecamatan"].fillna("Unknown")

    return df


# ===================================================================
# Customer-wise Split
# ===================================================================
def customer_wise_split(
    data: pd.DataFrame,
    random_state: int = 42,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Split by customer groups (70/15/15) with given seed."""
    groups = data["KodeCustomer"]

    # First split: train vs (val + test)
    gss1 = GroupShuffleSplit(
        n_splits=1,
        test_size=VAL_SIZE + TEST_SIZE,
        random_state=random_state,
    )
    train_idx, temp_idx = next(
        gss1.split(data, data[TARGET_COLUMN], groups=groups)
    )

    temp_data = data.iloc[temp_idx]
    temp_groups = temp_data["KodeCustomer"]

    # Second split: val vs test
    relative_test_size = TEST_SIZE / (VAL_SIZE + TEST_SIZE)
    gss2 = GroupShuffleSplit(
        n_splits=1,
        test_size=relative_test_size,
        random_state=random_state,
    )
    val_idx_rel, test_idx_rel = next(
        gss2.split(temp_data, temp_data[TARGET_COLUMN], groups=temp_groups)
    )

    val_idx = temp_idx[val_idx_rel]
    test_idx = temp_idx[test_idx_rel]

    return (
        data.iloc[train_idx].copy(),
        data.iloc[val_idx].copy(),
        data.iloc[test_idx].copy(),
    )


# ===================================================================
# Feature Engineering
# ===================================================================
def engineer_features(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, dict]:
    """
    Full v4 feature engineering pipeline.

    All statistics are computed on train only and mapped to val/test.
    Returns (train, val, test, pipeline_maps).
    """
    pipeline_maps: dict = {}

    # --- Binary flags ---
    for split_df in [train_df, val_df, test_df]:
        split_df["Is_Group_Customer"] = (
            split_df["NamaGroupCustomer"] != "NON-GROUP CUSTOMER"
        ).astype(int)
        split_df["Has_Remark"] = (
            split_df["Keterangan"] != "No Remark"
        ).astype(int)

    # --- Amount features ---
    jumlah_lower = train_df["Jumlah"].quantile(WINSOR_LOWER)
    jumlah_upper = train_df["Jumlah"].quantile(WINSOR_UPPER)
    pipeline_maps["winsor_bounds"] = {
        "jumlah_lower": jumlah_lower,
        "jumlah_upper": jumlah_upper,
    }
    for split_df in [train_df, val_df, test_df]:
        split_df["Jumlah_Winsor"] = split_df["Jumlah"].clip(
            jumlah_lower, jumlah_upper
        )
        split_df["Log_Jumlah"] = np.log1p(split_df["Jumlah"])
        split_df["Log_Jumlah_Winsor"] = np.log1p(split_df["Jumlah_Winsor"])

    # --- Jumlah bins ---
    jumlah_bin_edges = (
        train_df["Jumlah"].quantile([0.0, 0.25, 0.5, 0.75, 1.0]).values
    )
    jumlah_bin_edges[0] = -np.inf
    jumlah_bin_edges[-1] = np.inf
    jumlah_bin_labels = ["Q1_Low", "Q2_Mid_Low", "Q3_Mid_High", "Q4_High"]
    pipeline_maps["jumlah_bin_edges"] = jumlah_bin_edges.tolist()
    pipeline_maps["jumlah_bin_labels"] = jumlah_bin_labels
    for split_df in [train_df, val_df, test_df]:
        split_df["Jumlah_Bin"] = pd.cut(
            split_df["Jumlah"],
            bins=jumlah_bin_edges,
            labels=jumlah_bin_labels,
            include_lowest=True,
        ).astype(str)

    # --- Group aggregation features ---
    agg_configs = [
        ("KodeCustomer", "Jumlah", "Cust"),
        ("NamaSubKategori", "Jumlah", "SubCat"),
        ("NamaDivisi", "Jumlah", "Div"),
        ("KodeCabang", "Jumlah", "Branch"),
        ("NamaSalesman", "Jumlah", "Sales"),
        ("Kota", "Jumlah", "Kota"),
    ]
    pipeline_maps["group_agg"] = {}
    global_jumlah_mean = float(train_df["Jumlah"].mean())
    pipeline_maps["global_jumlah_mean"] = global_jumlah_mean

    for group_col, value_col, prefix in agg_configs:
        group_stats = train_df.groupby(group_col)[value_col].agg(
            ["mean", "count", "std"]
        )
        group_stats.columns = [
            f"{prefix}_Avg_{value_col}",
            f"{prefix}_Tx_Count",
            f"{prefix}_Std_{value_col}",
        ]
        group_stats[f"{prefix}_Std_{value_col}"] = group_stats[
            f"{prefix}_Std_{value_col}"
        ].fillna(0)

        # Save the map
        pipeline_maps["group_agg"][prefix] = {
            "group_col": group_col,
            "avg_map": group_stats[f"{prefix}_Avg_{value_col}"].to_dict(),
            "count_map": group_stats[f"{prefix}_Tx_Count"].to_dict(),
            "std_map": group_stats[f"{prefix}_Std_{value_col}"].to_dict(),
        }

        for split_df in [train_df, val_df, test_df]:
            merged = split_df[[group_col]].merge(
                group_stats, left_on=group_col, right_index=True, how="left"
            )
            split_df[f"{prefix}_Avg_{value_col}"] = (
                merged[f"{prefix}_Avg_{value_col}"]
                .fillna(global_jumlah_mean)
                .values
            )
            split_df[f"{prefix}_Tx_Count"] = (
                merged[f"{prefix}_Tx_Count"].fillna(1).astype(int).values
            )
            split_df[f"{prefix}_Std_{value_col}"] = (
                merged[f"{prefix}_Std_{value_col}"].fillna(0).values
            )

    # Customer total Jumlah
    cust_total = train_df.groupby("KodeCustomer")["Jumlah"].sum()
    cust_total_map = cust_total.to_dict()
    global_total_mean = float(cust_total.mean())
    pipeline_maps["cust_total_map"] = cust_total_map
    pipeline_maps["global_total_mean"] = global_total_mean
    for split_df in [train_df, val_df, test_df]:
        split_df["Cust_Total_Jumlah"] = (
            split_df["KodeCustomer"].map(cust_total_map).fillna(global_total_mean)
        )

    # --- Rank features ---
    for split_df in [train_df, val_df, test_df]:
        split_df["Jumlah_Percentile"] = split_df["Jumlah"].rank(pct=True)

    branch_medians = train_df.groupby("KodeCabang")["Jumlah"].median().to_dict()
    div_medians = train_df.groupby("NamaDivisi")["Jumlah"].median().to_dict()
    global_median = float(train_df["Jumlah"].median())
    pipeline_maps["branch_medians"] = branch_medians
    pipeline_maps["div_medians"] = div_medians
    pipeline_maps["global_median"] = global_median

    for split_df in [train_df, val_df, test_df]:
        group_med = split_df["KodeCabang"].map(branch_medians).fillna(global_median)
        split_df["Branch_Jumlah_Ratio"] = split_df["Jumlah"] / (group_med + 1)
        group_med = split_df["NamaDivisi"].map(div_medians).fillna(global_median)
        split_df["Div_Jumlah_Ratio"] = split_df["Jumlah"] / (group_med + 1)

    # --- Target encoding (smoothed) ---
    te_columns = [
        "NamaSalesman",
        "NamaSubKategori",
        "NamaDivisi",
        "Kota",
        "KodeCabang",
        "Kecamatan",
        "NamaGroupCustomer",
        "NamaKategori",
        "Jumlah_Bin",
    ]
    global_late_mean = float(train_df[TARGET_COLUMN].mean())
    pipeline_maps["global_late_rate"] = global_late_mean
    pipeline_maps["target_encoding"] = {}

    for col in te_columns:
        group_stats = train_df.groupby(col)[TARGET_COLUMN].agg(["mean", "count"])
        group_stats.columns = ["group_mean", "group_count"]
        group_stats["encoded"] = (
            group_stats["group_count"] * group_stats["group_mean"]
            + TARGET_ENCODING_SMOOTHING * global_late_mean
        ) / (group_stats["group_count"] + TARGET_ENCODING_SMOOTHING)
        encoding_map = group_stats["encoded"].to_dict()
        pipeline_maps["target_encoding"][col] = encoding_map
        col_name = f"{col}_TE"
        for split_df in [train_df, val_df, test_df]:
            split_df[col_name] = (
                split_df[col].map(encoding_map).fillna(global_late_mean)
            )

    # --- Frequency encoding ---
    freq_columns = [
        "NamaSalesman",
        "NamaSubKategori",
        "NamaDivisi",
        "Kota",
        "KodeCabang",
        "Kecamatan",
        "NamaGroupCustomer",
        "NamaKategori",
    ]
    pipeline_maps["frequency_encoding"] = {}
    for col in freq_columns:
        freq_map = train_df[col].value_counts(normalize=True).to_dict()
        pipeline_maps["frequency_encoding"][col] = freq_map
        col_name = f"{col}_Freq"
        for split_df in [train_df, val_df, test_df]:
            split_df[col_name] = split_df[col].map(freq_map).fillna(0.0)

    # --- Label encoding ---
    le_columns = [
        "NamaKategori",
        "NamaSubKategori",
        "NamaDivisi",
        "KodeCabang",
        "Provinsi",
        "Kota",
        "Jumlah_Bin",
        "NamaSalesman",
        "Kecamatan",
        "NamaGroupCustomer",
    ]
    pipeline_maps["label_encoders"] = {}
    for col in le_columns:
        le = LabelEncoder()
        train_values = train_df[col].astype(str).unique()
        le.fit(train_values)
        pipeline_maps["label_encoders"][col] = le
        col_name = f"{col}_Encoded"
        train_df[col_name] = le.transform(train_df[col].astype(str))
        for split_df in [val_df, test_df]:
            values = split_df[col].astype(str)
            known_mask = values.isin(le.classes_)
            encoded = np.full(len(values), len(le.classes_), dtype=int)
            if known_mask.any():
                encoded[known_mask] = le.transform(values[known_mask])
            split_df[col_name] = encoded

    # --- Customer historical late rate (LOO on train) ---
    cust_sum = train_df.groupby("KodeCustomer")[TARGET_COLUMN].transform("sum")
    cust_count = train_df.groupby("KodeCustomer")[TARGET_COLUMN].transform("count")
    loo_num = cust_sum - train_df[TARGET_COLUMN]
    loo_den = cust_count - 1
    train_df["Cust_Historical_Late_Rate"] = np.where(
        loo_den > 0, loo_num / loo_den, global_late_mean
    )
    cust_late_rate_map = (
        train_df.groupby("KodeCustomer")[TARGET_COLUMN].mean().to_dict()
    )
    pipeline_maps["cust_late_rate_map"] = cust_late_rate_map
    for split_df in [val_df, test_df]:
        split_df["Cust_Historical_Late_Rate"] = (
            split_df["KodeCustomer"]
            .map(cust_late_rate_map)
            .fillna(global_late_mean)
        )

    # --- Interaction features ---
    interaction_pairs = [
        ("NamaDivisi", "KodeCabang", "DivBranch"),
        ("NamaSalesman", "NamaDivisi", "SalesDiv"),
        ("NamaSubKategori", "KodeCabang", "SubCatBranch"),
        ("Kota", "NamaDivisi", "KotaDiv"),
    ]
    pipeline_maps["interaction_te"] = {}
    pipeline_maps["interaction_freq"] = {}

    for col_a, col_b, prefix in interaction_pairs:
        interaction_col = f"_interaction_{prefix}"
        for split_df in [train_df, val_df, test_df]:
            split_df[interaction_col] = (
                split_df[col_a].astype(str) + "__" + split_df[col_b].astype(str)
            )

        # Target encode interaction
        int_group_stats = train_df.groupby(interaction_col)[TARGET_COLUMN].agg(
            ["mean", "count"]
        )
        int_group_stats.columns = ["group_mean", "group_count"]
        smoothing = TARGET_ENCODING_SMOOTHING * 2
        int_group_stats["encoded"] = (
            int_group_stats["group_count"] * int_group_stats["group_mean"]
            + smoothing * global_late_mean
        ) / (int_group_stats["group_count"] + smoothing)
        int_enc_map = int_group_stats["encoded"].to_dict()
        pipeline_maps["interaction_te"][prefix] = {
            "col_a": col_a,
            "col_b": col_b,
            "map": int_enc_map,
        }

        te_col_name = f"{prefix}_{interaction_col}_TE"
        for split_df in [train_df, val_df, test_df]:
            split_df[te_col_name] = (
                split_df[interaction_col].map(int_enc_map).fillna(global_late_mean)
            )

        # Frequency encode interaction
        int_freq_map = (
            train_df[interaction_col].value_counts(normalize=True).to_dict()
        )
        pipeline_maps["interaction_freq"][prefix] = {
            "col_a": col_a,
            "col_b": col_b,
            "map": int_freq_map,
        }
        freq_col_name = f"{prefix}_{interaction_col}_Freq"
        for split_df in [train_df, val_df, test_df]:
            split_df[freq_col_name] = (
                split_df[interaction_col].map(int_freq_map).fillna(0.0)
            )

        # Clean up temp column
        for split_df in [train_df, val_df, test_df]:
            split_df.drop(columns=[interaction_col], inplace=True)

    # --- Additional derived features ---
    sales_div_diversity = (
        train_df.groupby("NamaSalesman")["NamaDivisi"].nunique().to_dict()
    )
    global_diversity = float(np.median(list(sales_div_diversity.values())))
    pipeline_maps["sales_div_diversity"] = sales_div_diversity
    pipeline_maps["global_diversity"] = global_diversity
    for split_df in [train_df, val_df, test_df]:
        split_df["Sales_Div_Diversity"] = (
            split_df["NamaSalesman"]
            .map(sales_div_diversity)
            .fillna(global_diversity)
        )

    sales_cust_count = (
        train_df.groupby("NamaSalesman")["KodeCustomer"].nunique().to_dict()
    )
    global_sales_cust = float(np.median(list(sales_cust_count.values())))
    pipeline_maps["sales_cust_count"] = sales_cust_count
    pipeline_maps["global_sales_cust"] = global_sales_cust
    for split_df in [train_df, val_df, test_df]:
        split_df["Sales_Cust_Count"] = (
            split_df["NamaSalesman"]
            .map(sales_cust_count)
            .fillna(global_sales_cust)
        )

    for split_df in [train_df, val_df, test_df]:
        avg = split_df["Cust_Avg_Jumlah"]
        std_val = split_df["Cust_Std_Jumlah"]
        split_df["Jumlah_Cust_Zscore"] = np.where(
            std_val > 0, (split_df["Jumlah"] - avg) / std_val, 0.0
        )
        split_df["Log_Jumlah_vs_Branch"] = np.log1p(
            split_df["Jumlah"]
        ) - np.log1p(split_df["Branch_Avg_Jumlah"])
        split_df["Log_Jumlah_vs_Div"] = np.log1p(
            split_df["Jumlah"]
        ) - np.log1p(split_df["Div_Avg_Jumlah"])

    # --- Save unique raw values for dropdowns ---
    pipeline_maps["unique_values"] = {}
    raw_cat_cols = [
        "NamaSalesman",
        "NamaDivisi",
        "NamaKategori",
        "NamaSubKategori",
        "KodeCabang",
        "Provinsi",
        "Kota",
        "Kecamatan",
        "NamaGroupCustomer",
        "KodeCustomer",
    ]
    for col in raw_cat_cols:
        if col in train_df.columns:
            pipeline_maps["unique_values"][col] = sorted(
                train_df[col].unique().tolist()
            )

    return train_df, val_df, test_df, pipeline_maps


# ===================================================================
# SMOTE Augmentation
# ===================================================================
def augment_train(
    train_df: pd.DataFrame,
    features: list[str],
) -> pd.DataFrame:
    """Apply SMOTE to balance training set. Returns augmented DataFrame."""
    X_train = train_df[features].values
    y_train = train_df[TARGET_COLUMN].values

    smote = SMOTE(
        sampling_strategy=SMOTE_SAMPLING_STRATEGY,
        k_neighbors=SMOTE_K_NEIGHBORS,
        random_state=42,
    )
    X_res, y_res = smote.fit_resample(X_train, y_train)

    aug_df = pd.DataFrame(X_res, columns=features)
    aug_df[TARGET_COLUMN] = y_res

    # Mark synthetic rows
    n_original = len(train_df)
    is_synthetic = np.zeros(len(aug_df), dtype=int)
    is_synthetic[n_original:] = 1
    aug_df["Is_Synthetic"] = is_synthetic

    # Post-process: round binary features to {0, 1}
    for col in BINARY_FEATURES:
        if col in aug_df.columns:
            aug_df[col] = aug_df[col].round().clip(0, 1).astype(int)

    # Post-process: round integer features
    for col in INTEGER_FEATURES:
        if col in aug_df.columns:
            aug_df[col] = aug_df[col].round().astype(int)

    # Clip feature values to training data bounds (avoid extrapolation)
    for col in features:
        col_min = (
            train_df[col].min() if col in train_df.columns else aug_df[col].min()
        )
        col_max = (
            train_df[col].max() if col in train_df.columns else aug_df[col].max()
        )
        aug_df[col] = aug_df[col].clip(col_min, col_max)

    return aug_df
