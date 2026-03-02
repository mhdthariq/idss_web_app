"""
Pydantic schemas for prediction endpoints.

These models define the request/response contracts for:
- POST /api/predict       (single prediction)
- POST /api/predict/batch (batch CSV prediction)
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Single Prediction
# ---------------------------------------------------------------------------


class PredictRequest(BaseModel):
    """Raw transaction input from the user form."""

    jumlah: float = Field(..., gt=0, description="Transaction amount (Rupiah)")
    kode_customer: str = Field(..., min_length=1, description="Customer code")
    nama_salesman: str = Field(..., min_length=1, description="Salesman name")
    nama_divisi: str = Field(..., min_length=1, description="Division name")
    nama_kategori: str = Field(..., min_length=1, description="Category name")
    nama_sub_kategori: str = Field(..., min_length=1, description="Sub-category name")
    kode_cabang: str = Field(..., min_length=1, description="Branch code")
    provinsi: str = Field(..., min_length=1, description="Province")
    kota: str = Field(..., min_length=1, description="City")
    kecamatan: str = Field(..., min_length=1, description="District")
    nama_group_customer: str = Field(
        default="NON-GROUP CUSTOMER",
        description="Customer group name",
    )
    keterangan: str = Field(
        default="No Remark",
        description="Remark / note",
    )

    def to_raw_input(self) -> dict[str, Any]:
        """
        Convert the Pydantic model to the raw_input dict expected by
        ``engineer_single_transaction()``.
        """
        return {
            "Jumlah": self.jumlah,
            "KodeCustomer": self.kode_customer,
            "NamaSalesman": self.nama_salesman,
            "NamaDivisi": self.nama_divisi,
            "NamaKategori": self.nama_kategori,
            "NamaSubKategori": self.nama_sub_kategori,
            "KodeCabang": self.kode_cabang,
            "Provinsi": self.provinsi,
            "Kota": self.kota,
            "Kecamatan": self.kecamatan,
            "NamaGroupCustomer": self.nama_group_customer,
            "Keterangan": self.keterangan,
        }

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "jumlah": 15_000_000,
                    "kode_customer": "C001",
                    "nama_salesman": "Ahmad",
                    "nama_divisi": "Food & Beverage",
                    "nama_kategori": "Snack",
                    "nama_sub_kategori": "Biskuit",
                    "kode_cabang": "JKT01",
                    "provinsi": "DKI Jakarta",
                    "kota": "Jakarta Selatan",
                    "kecamatan": "Kebayoran Baru",
                    "nama_group_customer": "NON-GROUP CUSTOMER",
                    "keterangan": "No Remark",
                }
            ]
        }
    }


# ---------------------------------------------------------------------------
# SHAP explanation sub-models
# ---------------------------------------------------------------------------


class ShapFeatureContribution(BaseModel):
    """A single SHAP feature contribution."""

    feature: str
    shap_value: float
    feature_value: float | str | None = None


class ShapExplanation(BaseModel):
    """SHAP explanation for a single model."""

    base_value: float
    top_features: list[ShapFeatureContribution]


# ---------------------------------------------------------------------------
# Model result sub-models
# ---------------------------------------------------------------------------


class ModelResult(BaseModel):
    """Probability output from a single model."""

    probability: float = Field(..., ge=0.0, le=1.0)


class InputSummary(BaseModel):
    """Compact summary of the input for display purposes."""

    jumlah: float
    customer: str
    divisi: str
    salesman: str
    cabang: str
    kota: str


# ---------------------------------------------------------------------------
# Single Prediction Response
# ---------------------------------------------------------------------------


class PredictResponse(BaseModel):
    """
    Full response for a single prediction.

    NOTE: The response contains raw probabilities only — no labels like
    "BERISIKO" or "LAYAK". The **frontend** applies the threshold and
    determines the label client-side so threshold changes are instant.
    """

    prediction_id: str = Field(..., description="Unique prediction identifier")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="UTC timestamp of the prediction",
    )
    input_summary: InputSummary

    xgboost: ModelResult
    mlp: ModelResult | None = Field(
        None,
        description="MLP result (null if MLP artifacts are not available)",
    )

    shap_explanation: dict[str, ShapExplanation] | None = Field(
        None,
        description="SHAP explanation keyed by model name (e.g. 'xgboost')",
    )

    feature_vector: dict[str, float] | None = Field(
        None,
        description=(
            "The engineered 69-feature vector passed to the models "
            "(useful for debugging / transparency)"
        ),
    )


# ---------------------------------------------------------------------------
# Batch Prediction
# ---------------------------------------------------------------------------


class BatchRowResult(BaseModel):
    """Result for a single row in a batch prediction."""

    row_index: int
    xgb_probability: float = Field(..., ge=0.0, le=1.0)
    mlp_probability: float | None = Field(
        None,
        ge=0.0,
        le=1.0,
        description="null if MLP is unavailable",
    )
    error: str | None = Field(
        None,
        description="Error message if this row failed to process",
    )


class BatchPredictResponse(BaseModel):
    """Response for batch CSV prediction."""

    total_rows: int
    processed_rows: int
    failed_rows: int = 0
    results: list[BatchRowResult]
