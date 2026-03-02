"""
Prediction API routes.

Endpoints
---------
- POST /api/predict        — Single transaction prediction
- POST /api/predict/batch  — Batch CSV prediction
"""

from __future__ import annotations

import csv
import io
import logging
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from backend.app.ml import model_registry
from backend.app.schemas.prediction import (
    BatchPredictResponse,
    PredictRequest,
    PredictResponse,
)
from backend.app.services.prediction_service import predict_batch, predict_single

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/predict", tags=["prediction"])

# ---------------------------------------------------------------------------
# Column name mapping: CSV header (snake_case) → raw_input key (PascalCase)
# ---------------------------------------------------------------------------
_CSV_COLUMN_MAP: dict[str, str] = {
    "jumlah": "Jumlah",
    "kode_customer": "KodeCustomer",
    "nama_salesman": "NamaSalesman",
    "nama_divisi": "NamaDivisi",
    "nama_kategori": "NamaKategori",
    "nama_sub_kategori": "NamaSubKategori",
    "kode_cabang": "KodeCabang",
    "provinsi": "Provinsi",
    "kota": "Kota",
    "kecamatan": "Kecamatan",
    "nama_group_customer": "NamaGroupCustomer",
    "keterangan": "Keterangan",
    # Also accept PascalCase directly (the raw CSV from the dataset)
    "Jumlah": "Jumlah",
    "KodeCustomer": "KodeCustomer",
    "NamaSalesman": "NamaSalesman",
    "NamaDivisi": "NamaDivisi",
    "NamaKategori": "NamaKategori",
    "NamaSubKategori": "NamaSubKategori",
    "KodeCabang": "KodeCabang",
    "Provinsi": "Provinsi",
    "Kota": "Kota",
    "Kecamatan": "Kecamatan",
    "NamaGroupCustomer": "NamaGroupCustomer",
    "Keterangan": "Keterangan",
}

# Required columns in the CSV (using PascalCase target names)
_REQUIRED_CSV_COLUMNS: set[str] = {
    "Jumlah",
    "KodeCustomer",
    "NamaSalesman",
    "NamaDivisi",
    "NamaKategori",
    "NamaSubKategori",
    "KodeCabang",
    "Provinsi",
    "Kota",
    "Kecamatan",
}


def _check_models_loaded() -> None:
    """Raise 503 if required models are not loaded."""
    if not model_registry.is_initialised():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Model registry is not initialised. "
                "Ensure model artifacts exist and restart the server."
            ),
        )
    try:
        model_registry.get_xgb_model()
    except RuntimeError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="XGBoost model is not loaded. Prediction is unavailable.",
        )
    try:
        model_registry.get_pipeline_maps()
    except RuntimeError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Pipeline maps are not loaded. Prediction is unavailable.",
        )


# ===================================================================
# POST /api/predict — Single prediction
# ===================================================================


@router.post(
    "",
    response_model=PredictResponse,
    summary="Single transaction prediction",
    description=(
        "Accepts a single transaction's raw fields and returns dual-model "
        "probabilities (XGBoost + MLP) with optional SHAP explanation.\n\n"
        "**Important:** The response contains raw probabilities only — no "
        'labels like "BERISIKO" or "LAYAK". The frontend applies the '
        "threshold client-side so slider changes are instant."
    ),
    responses={
        503: {"description": "Models not loaded"},
        422: {"description": "Validation error in request body"},
    },
)
async def predict(
    body: PredictRequest,
    include_shap: Annotated[
        bool,
        Query(description="Whether to include SHAP explanation in the response"),
    ] = True,
    include_feature_vector: Annotated[
        bool,
        Query(description="Whether to include the 69-feature vector (for debugging)"),
    ] = False,
    shap_top_n: Annotated[
        int,
        Query(ge=1, le=69, description="Number of top SHAP features to return"),
    ] = 10,
) -> PredictResponse:
    """Run a single-transaction prediction through both models."""
    _check_models_loaded()

    raw_input = body.to_raw_input()

    try:
        result = predict_single(
            raw_input,
            include_shap=include_shap,
            include_feature_vector=include_feature_vector,
            shap_top_n=shap_top_n,
        )
    except Exception as exc:
        logger.exception("Prediction failed for input: %s", raw_input)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {exc}",
        ) from exc

    return result


# ===================================================================
# POST /api/predict/batch — Batch CSV prediction
# ===================================================================


def _parse_csv(content: bytes) -> list[dict[str, str]]:
    """
    Parse CSV bytes into a list of row dicts with PascalCase keys.

    Raises
    ------
    HTTPException (422) if the CSV is malformed or missing required columns.
    """
    try:
        text = content.decode("utf-8-sig")  # handle BOM
    except UnicodeDecodeError:
        try:
            text = content.decode("latin-1")
        except UnicodeDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Could not decode CSV file: {exc}",
            ) from exc

    reader = csv.DictReader(io.StringIO(text))

    if reader.fieldnames is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="CSV file appears to be empty or has no header row.",
        )

    # Map CSV headers to PascalCase
    mapped_headers: dict[str, str] = {}
    for header in reader.fieldnames:
        header_stripped = header.strip()
        if header_stripped in _CSV_COLUMN_MAP:
            mapped_headers[header] = _CSV_COLUMN_MAP[header_stripped]
        else:
            # Keep the original header (will be ignored downstream)
            mapped_headers[header] = header_stripped

    # Check that all required columns are present
    available_target_cols = set(mapped_headers.values())
    missing = _REQUIRED_CSV_COLUMNS - available_target_cols
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"CSV is missing required columns: {sorted(missing)}. "
                f"Available columns (after mapping): {sorted(available_target_cols)}"
            ),
        )

    rows: list[dict[str, str]] = []
    for row in reader:
        mapped_row: dict[str, str] = {}
        for original_key, value in row.items():
            target_key = mapped_headers.get(original_key, original_key)
            mapped_row[target_key] = (value or "").strip()
        rows.append(mapped_row)

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="CSV file contains no data rows.",
        )

    return rows


def _csv_row_to_raw_input(row: dict[str, str]) -> dict[str, object]:
    """
    Convert a parsed CSV row dict (all string values) into the raw_input
    dict expected by the prediction service.

    The main conversion is ``Jumlah`` from string → float.
    """
    raw_input: dict[str, object] = dict(row)

    # Convert Jumlah to float
    jumlah_str = str(row.get("Jumlah", "0")).replace(",", "")
    try:
        raw_input["Jumlah"] = float(jumlah_str)
    except ValueError:
        raw_input["Jumlah"] = 0.0

    # Fill optional fields with defaults if missing
    raw_input.setdefault("NamaGroupCustomer", "NON-GROUP CUSTOMER")
    raw_input.setdefault("Keterangan", "No Remark")

    return raw_input


@router.post(
    "/batch",
    response_model=BatchPredictResponse,
    summary="Batch CSV prediction",
    description=(
        "Upload a CSV file with transaction data and receive dual-model "
        "probabilities for every row.\n\n"
        "**CSV format:** The file must have a header row. Column names can "
        "be either snake_case (e.g. `kode_customer`) or PascalCase "
        "(e.g. `KodeCustomer`).\n\n"
        "**Required columns:** jumlah, kode_customer, nama_salesman, "
        "nama_divisi, nama_kategori, nama_sub_kategori, kode_cabang, "
        "provinsi, kota, kecamatan.\n\n"
        "**Optional columns:** nama_group_customer (defaults to "
        '"NON-GROUP CUSTOMER"), keterangan (defaults to "No Remark").\n\n'
        "**Important:** The response contains raw probabilities only — "
        "no labels. The frontend applies the threshold to all rows "
        "client-side."
    ),
    responses={
        422: {"description": "Invalid CSV file"},
        503: {"description": "Models not loaded"},
    },
)
async def predict_batch_endpoint(
    file: Annotated[
        UploadFile,
        File(description="CSV file with transaction data"),
    ],
) -> BatchPredictResponse:
    """Run batch predictions on an uploaded CSV file."""
    _check_models_loaded()

    # Validate file type
    if file.content_type and file.content_type not in (
        "text/csv",
        "application/csv",
        "text/plain",
        "application/vnd.ms-excel",
        "application/octet-stream",
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Expected a CSV file, got content-type: {file.content_type}",
        )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty.",
        )

    # Parse CSV
    rows = _parse_csv(content)

    # Convert to raw_input dicts
    raw_inputs = [_csv_row_to_raw_input(row) for row in rows]

    try:
        result = predict_batch(raw_inputs)
    except Exception as exc:
        logger.exception("Batch prediction failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch prediction failed: {exc}",
        ) from exc

    return result
