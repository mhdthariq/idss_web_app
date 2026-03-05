/**
 * Prediction routes — single + batch.
 */

import { Elysia, t } from "elysia";
import { randomUUID } from "crypto";
import {
  engineerSingleTransaction,
  type RawInput,
} from "../feature-engineering";
import { predictXGBoost } from "../xgboost-predict";
import { predictMLP } from "../mlp-predict";
import { getPipelineMaps, getMLPConfig } from "../data-loader";

// CSV column name mapping: snake_case → PascalCase
const CSV_COLUMN_MAP: Record<string, string> = {
  jumlah: "Jumlah",
  kode_customer: "KodeCustomer",
  nama_salesman: "NamaSalesman",
  nama_divisi: "NamaDivisi",
  nama_kategori: "NamaKategori",
  nama_sub_kategori: "NamaSubKategori",
  kode_cabang: "KodeCabang",
  provinsi: "Provinsi",
  kota: "Kota",
  kecamatan: "Kecamatan",
  nama_group_customer: "NamaGroupCustomer",
  keterangan: "Keterangan",
};

interface PredictionResponse {
  prediction_id: string;
  timestamp: string;
  input_summary: {
    jumlah: number;
    customer: string;
    divisi: string;
    salesman: string;
    cabang: string;
    kota: string;
  };
  xgboost: { probability: number };
  mlp: { probability: number } | null;
  shap_explanation: null;
  feature_vector?: Record<string, number>;
}

interface BatchResultRow {
  row_index: number;
  xgb_probability: number;
  mlp_probability: number | null;
  error: string | null;
}

interface FileUpload {
  text(): Promise<string>;
}

export const predictRoutes = new Elysia()
  .post(
    "/api/predict",
    async ({ body, query }) => {
      const includeFeatures = query.include_features === "true";

      // Convert to raw input
      const raw: RawInput = {
        Jumlah: body.jumlah,
        KodeCustomer: body.kode_customer,
        NamaSalesman: body.nama_salesman,
        NamaDivisi: body.nama_divisi,
        NamaKategori: body.nama_kategori,
        NamaSubKategori: body.nama_sub_kategori,
        KodeCabang: body.kode_cabang,
        Provinsi: body.provinsi,
        Kota: body.kota,
        Kecamatan: body.kecamatan,
        NamaGroupCustomer: body.nama_group_customer ?? "NON-GROUP CUSTOMER",
        Keterangan: body.keterangan ?? "No Remark",
      };

      // Engineer features
      const pm = getPipelineMaps();
      const featureRow = engineerSingleTransaction(raw, pm);

      // XGBoost prediction
      const xgbProb = predictXGBoost(featureRow);

      // MLP prediction
      const mlpConfig = getMLPConfig();
      const mlpProb = await predictMLP(featureRow, mlpConfig);

      // Build response
      const response: PredictionResponse = {
        prediction_id: randomUUID(),
        timestamp: new Date().toISOString(),
        input_summary: {
          jumlah: raw.Jumlah,
          customer: raw.KodeCustomer,
          divisi: raw.NamaDivisi,
          salesman: raw.NamaSalesman,
          cabang: raw.KodeCabang,
          kota: raw.Kota,
        },
        xgboost: { probability: xgbProb },
        mlp: mlpProb !== null ? { probability: mlpProb } : null,
        shap_explanation: null,
      };

      if (includeFeatures) {
        response.feature_vector = featureRow;
      }

      return response;
    },
    {
      body: t.Object({
        jumlah: t.Number({ minimum: 0 }),
        kode_customer: t.String({ minLength: 1 }),
        nama_salesman: t.String({ minLength: 1 }),
        nama_divisi: t.String({ minLength: 1 }),
        nama_kategori: t.String({ minLength: 1 }),
        nama_sub_kategori: t.String({ minLength: 1 }),
        kode_cabang: t.String({ minLength: 1 }),
        provinsi: t.String({ minLength: 1 }),
        kota: t.String({ minLength: 1 }),
        kecamatan: t.String({ minLength: 1 }),
        nama_group_customer: t.Optional(t.String()),
        keterangan: t.Optional(t.String()),
      }),
      query: t.Object({
        include_shap: t.Optional(t.String()),
        include_features: t.Optional(t.String()),
        shap_top_n: t.Optional(t.String()),
      }),
    },
  )
  .post("/api/predict/batch", async ({ body: reqBody }) => {
    // Parse CSV from the uploaded file
    const formData = reqBody as Record<string, unknown>;
    const file = formData.file as FileUpload | undefined;

    if (!file) {
      return { error: "No file uploaded" };
    }

    const csvText = await file.text();
    const lines = csvText.trim().split("\n");

    if (lines.length < 2) {
      return { error: "CSV must have a header row and at least one data row" };
    }

    // Parse header
    const rawHeaders = (lines[0] ?? "")
      .split(",")
      .map((h: string) => h.trim().replace(/"/g, ""));
    // Map snake_case headers to PascalCase
    const headers = rawHeaders.map(
      (h: string) => CSV_COLUMN_MAP[h.toLowerCase()] ?? h,
    );

    const pm = getPipelineMaps();
    const mlpConfig = getMLPConfig();
    const results: BatchResultRow[] = [];
    let processedRows = 0;
    let failedRows = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = (lines[i] ?? "")
        .split(",")
        .map((c: string) => c.trim().replace(/"/g, ""));
      if (cols.length < headers.length) continue;

      const rowDict: Record<string, string> = {};
      headers.forEach((h: string, j: number) => {
        rowDict[h] = cols[j] ?? "";
      });

      try {
        const raw: RawInput = {
          Jumlah: parseFloat(rowDict["Jumlah"] ?? "0"),
          KodeCustomer: rowDict["KodeCustomer"] ?? "",
          NamaSalesman: rowDict["NamaSalesman"] ?? "",
          NamaDivisi: rowDict["NamaDivisi"] ?? "",
          NamaKategori: rowDict["NamaKategori"] ?? "",
          NamaSubKategori: rowDict["NamaSubKategori"] ?? "",
          KodeCabang: rowDict["KodeCabang"] ?? "",
          Provinsi: rowDict["Provinsi"] ?? "",
          Kota: rowDict["Kota"] ?? "",
          Kecamatan: rowDict["Kecamatan"] ?? "",
          NamaGroupCustomer:
            rowDict["NamaGroupCustomer"] ?? "NON-GROUP CUSTOMER",
          Keterangan: rowDict["Keterangan"] ?? "No Remark",
        };

        const featureRow = engineerSingleTransaction(raw, pm);
        const xgbProb = predictXGBoost(featureRow);
        const mlpProb = await predictMLP(featureRow, mlpConfig);

        results.push({
          row_index: i - 1,
          xgb_probability: xgbProb,
          mlp_probability: mlpProb,
          error: null,
        });
        processedRows++;
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Unknown error";
        results.push({
          row_index: i - 1,
          xgb_probability: 0,
          mlp_probability: null,
          error: message,
        });
        failedRows++;
      }
    }

    return {
      total_rows: lines.length - 1,
      processed_rows: processedRows,
      failed_rows: failedRows,
      results,
    };
  });
