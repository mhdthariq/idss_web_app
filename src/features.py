"""
Feature definitions — single source of truth.

The CONSERVATIVE_FEATURES list (69 items) was previously copy-pasted
in prepare_pipeline.py, streamlit_app.py, and split_instability_analysis.py.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Conservative feature set (v4) — 69 features
# ---------------------------------------------------------------------------
CONSERVATIVE_FEATURES: list[str] = [
    "Jumlah",
    "Jumlah_Winsor",
    "Log_Jumlah",
    "Log_Jumlah_Winsor",
    "Jumlah_Percentile",
    "Is_Group_Customer",
    "Has_Remark",
    "Cust_Avg_Jumlah",
    "Cust_Tx_Count",
    "Cust_Std_Jumlah",
    "Cust_Total_Jumlah",
    "Cust_Historical_Late_Rate",
    "SubCat_Avg_Jumlah",
    "SubCat_Tx_Count",
    "SubCat_Std_Jumlah",
    "Div_Avg_Jumlah",
    "Div_Tx_Count",
    "Div_Std_Jumlah",
    "Branch_Avg_Jumlah",
    "Branch_Tx_Count",
    "Branch_Std_Jumlah",
    "Sales_Avg_Jumlah",
    "Sales_Tx_Count",
    "Sales_Std_Jumlah",
    "Kota_Avg_Jumlah",
    "Kota_Tx_Count",
    "Kota_Std_Jumlah",
    "Branch_Jumlah_Ratio",
    "Div_Jumlah_Ratio",
    "Jumlah_Cust_Zscore",
    "Log_Jumlah_vs_Branch",
    "Log_Jumlah_vs_Div",
    "NamaSalesman_TE",
    "NamaSubKategori_TE",
    "NamaDivisi_TE",
    "Kota_TE",
    "KodeCabang_TE",
    "Kecamatan_TE",
    "NamaGroupCustomer_TE",
    "NamaKategori_TE",
    "Jumlah_Bin_TE",
    "NamaSalesman_Freq",
    "NamaSubKategori_Freq",
    "NamaDivisi_Freq",
    "Kota_Freq",
    "KodeCabang_Freq",
    "Kecamatan_Freq",
    "NamaGroupCustomer_Freq",
    "NamaKategori_Freq",
    "DivBranch__interaction_DivBranch_TE",
    "SalesDiv__interaction_SalesDiv_TE",
    "SubCatBranch__interaction_SubCatBranch_TE",
    "KotaDiv__interaction_KotaDiv_TE",
    "DivBranch__interaction_DivBranch_Freq",
    "SalesDiv__interaction_SalesDiv_Freq",
    "SubCatBranch__interaction_SubCatBranch_Freq",
    "KotaDiv__interaction_KotaDiv_Freq",
    "Sales_Div_Diversity",
    "Sales_Cust_Count",
    "NamaKategori_Encoded",
    "NamaSubKategori_Encoded",
    "NamaDivisi_Encoded",
    "KodeCabang_Encoded",
    "Provinsi_Encoded",
    "Kota_Encoded",
    "Jumlah_Bin_Encoded",
    "NamaSalesman_Encoded",
    "Kecamatan_Encoded",
    "NamaGroupCustomer_Encoded",
]

# ---------------------------------------------------------------------------
# Derived feature subsets
# ---------------------------------------------------------------------------
CAT_FEATURES: list[str] = [
    f for f in CONSERVATIVE_FEATURES if f.endswith("_Encoded")
]

CONT_FEATURES: list[str] = [
    f for f in CONSERVATIVE_FEATURES if f not in CAT_FEATURES
]

BINARY_FEATURES: list[str] = ["Is_Group_Customer", "Has_Remark"]

INTEGER_FEATURES: list[str] = [
    "Cust_Tx_Count",
    "SubCat_Tx_Count",
    "Div_Tx_Count",
    "Branch_Tx_Count",
    "Sales_Tx_Count",
    "Kota_Tx_Count",
    "Sales_Div_Diversity",
    "Sales_Cust_Count",
] + CAT_FEATURES
