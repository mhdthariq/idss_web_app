import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import type { TestSetData } from "@/types/analysis";

type RawRow = Record<string, string | number | null | undefined>;

interface LegacyTestSetResponse {
  total_rows?: number;
  columns?: string[];
  data?: RawRow[];
}

interface ModernTestSetResponse {
  n_samples?: number;
  y_true?: number[];
  xgb_probabilities?: number[];
  mlp_probabilities?: number[] | null;
  roc_curve?: {
    xgboost?: TestSetData["roc_curve"]["xgboost"];
    mlp?: TestSetData["roc_curve"]["mlp"];
  };
  pr_curve?: {
    xgboost?: TestSetData["pr_curve"]["xgboost"];
    mlp?: TestSetData["pr_curve"]["mlp"];
  };
  error?: string;
  detail?: string;
  message?: string;
}

interface ErrorEnvelope {
  error?: unknown;
  detail?: unknown;
  message?: unknown;
}

function toNumberArray(values: unknown): number[] {
  if (!Array.isArray(values)) return [];
  return values.map((v) => Number(v)).filter((v) => Number.isFinite(v));
}

function pickNumericColumn(
  rows: RawRow[],
  candidates: string[],
): number[] | null {
  for (const key of candidates) {
    const hasKey = rows.some((r) =>
      Object.prototype.hasOwnProperty.call(r, key),
    );
    if (!hasKey) continue;
    return rows.map((r) => {
      const raw = r[key];
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    });
  }
  return null;
}

function normalizeTestSetData(payload: unknown): TestSetData {
  const data = (payload ?? {}) as ModernTestSetResponse & LegacyTestSetResponse;

  // Some API variants return 200 + { error: "..." } for missing artifacts.
  // Surface this server-side message directly instead of a misleading parsing error.
  const errData = (payload ?? {}) as ErrorEnvelope;
  const rawError = errData.error ?? errData.detail ?? errData.message;
  if (typeof rawError === "string" && rawError.trim().length > 0) {
    throw new Error(`API /api/analysis/test-set: ${rawError.trim()}`);
  }

  const yTrueModern = toNumberArray(data.y_true);
  const xgbModern = toNumberArray(data.xgb_probabilities);

  // Preferred payload shape (FastAPI-style)
  if (yTrueModern.length > 0) {
    const n = yTrueModern.length;
    const xgb =
      xgbModern.length === n
        ? xgbModern
        : [
            ...xgbModern,
            ...Array(Math.max(0, n - xgbModern.length)).fill(0),
          ].slice(0, n);

    const mlpModern = toNumberArray(data.mlp_probabilities);
    const mlp =
      mlpModern.length === n
        ? mlpModern
        : [
            ...mlpModern,
            ...Array(Math.max(0, n - mlpModern.length)).fill(0),
          ].slice(0, n);

    return {
      n_samples: Number(data.n_samples) || n,
      y_true: yTrueModern,
      xgb_probabilities: xgb,
      mlp_probabilities: mlp,
      roc_curve: {
        xgboost: data.roc_curve?.xgboost ?? {},
        mlp: data.roc_curve?.mlp ?? {},
      },
      pr_curve: {
        xgboost: data.pr_curve?.xgboost ?? {},
        mlp: data.pr_curve?.mlp ?? {},
      },
    };
  }

  // Legacy payload shape (Bun route with tabular rows)
  const rows = Array.isArray(data.data) ? data.data : [];
  const yTrueLegacy = pickNumericColumn(rows, [
    "Is_Late",
    "is_late",
    "y_true",
    "label",
  ]);
  if (!yTrueLegacy || yTrueLegacy.length === 0) {
    const availableColumns = Array.isArray(data.columns)
      ? data.columns.join(", ")
      : rows[0]
        ? Object.keys(rows[0]).join(", ")
        : "(tidak ada data)";
    throw new Error(
      `API /api/analysis/test-set tidak menyediakan kolom label yang valid. Kolom tersedia: ${availableColumns}`,
    );
  }

  const n = yTrueLegacy.length;
  const xgbLegacy =
    pickNumericColumn(rows, [
      "xgb_probability",
      "xgb_probabilities",
      "xgb_prob",
      "xgb_proba",
      "XGB_Probability",
    ]) ?? Array(n).fill(0);

  const mlpLegacy =
    pickNumericColumn(rows, [
      "mlp_probability",
      "mlp_probabilities",
      "mlp_prob",
      "mlp_proba",
      "MLP_Probability",
    ]) ?? Array(n).fill(0);

  return {
    n_samples: Number(data.total_rows) || n,
    y_true: yTrueLegacy,
    xgb_probabilities: xgbLegacy,
    mlp_probabilities: mlpLegacy,
    roc_curve: {
      xgboost: {},
      mlp: {},
    },
    pr_curve: {
      xgboost: {},
      mlp: {},
    },
  };
}

export function useTestSetData() {
  return useQuery<TestSetData>({
    queryKey: ["test-set-data"],
    queryFn: async () => {
      const payload = await apiGet<unknown>("/api/analysis/test-set");
      return normalizeTestSetData(payload);
    },
    staleTime: 30 * 60 * 1000,
  });
}
