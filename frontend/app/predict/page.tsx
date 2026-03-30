"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Brain, CheckCircle2, Sparkles, Trees, User, Package, MapPin } from "lucide-react";
import { usePrediction } from "@/hooks/use-prediction";
import { useStaticData } from "@/hooks/use-static-data";
import { useDecisionLogStore } from "@/stores/decision-log-store";
import { DEFAULT_THRESHOLD } from "@/lib/constants";
import { RiskGauge } from "@/components/prediction/risk-gauge";
import { ThresholdSlider } from "@/components/prediction/threshold-slider";
import { ThresholdExplainer } from "@/components/prediction/threshold-explainer";
import { ComparisonTable } from "@/components/prediction/comparison-table";
import { RecommendationCard } from "@/components/prediction/recommendation-card";
import { ShapWaterfall } from "@/components/prediction/shap-waterfall";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { riskLabel } from "@/lib/threshold-utils";
import type {
  PredictionInput,
  PredictionOptionsResponse,
  PredictionResult,
  UniqueValues,
} from "@/types/prediction";

type SelectField = Exclude<keyof PredictionInput, "jumlah" | "keterangan">;

const SELECT_FIELDS: SelectField[] = [
  "kode_customer",
  "nama_salesman",
  "nama_divisi",
  "nama_kategori",
  "nama_sub_kategori",
  "kode_cabang",
  "provinsi",
  "kota",
  "kecamatan",
  "nama_group_customer",
];

/* Logically group dropdown fields */
const FIELD_GROUPS: {
  label: string;
  icon: typeof User;
  fields: { key: SelectField; label: string }[];
}[] = [
  {
    label: "Informasi Pelanggan",
    icon: User,
    fields: [
      { key: "kode_customer", label: "Kode Customer" },
      { key: "nama_salesman", label: "Salesman" },
      { key: "nama_group_customer", label: "Group Customer" },
    ],
  },
  {
    label: "Informasi Produk",
    icon: Package,
    fields: [
      { key: "nama_divisi", label: "Divisi" },
      { key: "nama_kategori", label: "Kategori" },
      { key: "nama_sub_kategori", label: "Sub Kategori" },
    ],
  },
  {
    label: "Lokasi",
    icon: MapPin,
    fields: [
      { key: "kode_cabang", label: "Cabang" },
      { key: "provinsi", label: "Provinsi" },
      { key: "kota", label: "Kota" },
      { key: "kecamatan", label: "Kecamatan" },
    ],
  },
];

export default function PredictPage() {
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const predict = usePrediction();
  const addEntry = useDecisionLogStore((s) => s.addEntry);

  const { data: uniqueValues } = useStaticData<UniqueValues>(
    "unique-values",
    "/api/config/unique-values",
  );
  const { data: predictionOptionsPayload } =
    useStaticData<PredictionOptionsResponse>(
      "prediction-options",
      "/api/config/prediction-options",
    );

  const [form, setForm] = useState<PredictionInput>({
    jumlah: 0,
    kode_customer: "",
    nama_salesman: "",
    nama_divisi: "",
    nama_kategori: "",
    nama_sub_kategori: "",
    kode_cabang: "",
    provinsi: "",
    kota: "",
    kecamatan: "",
    nama_group_customer: "",
    keterangan: "No Remark",
  });

  const updateForm = (key: keyof PredictionInput, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const relationRows = useMemo(
    () => predictionOptionsPayload?.rows ?? [],
    [predictionOptionsPayload?.rows],
  );

  const sortedUniqueValues = useMemo(() => {
    if (!uniqueValues) return {} as Record<SelectField, string[]>;

    const entries = SELECT_FIELDS.map((field) => {
      const values = ((uniqueValues[field] as string[] | undefined) ?? [])
        .filter((v) => v.length > 0)
        .slice()
        .sort((a, b) => a.localeCompare(b, "id"));
      return [field, values] as const;
    });

    return Object.fromEntries(entries) as Record<SelectField, string[]>;
  }, [uniqueValues]);

  const getFieldOptions = (
    targetField: SelectField,
    state: PredictionInput,
  ) => {
    if (relationRows.length === 0) {
      return sortedUniqueValues[targetField] ?? [];
    }

    const validRows = relationRows.filter((row) => {
      return SELECT_FIELDS.every((field) => {
        if (field === targetField) return true;
        const selected = state[field] as string;
        return !selected || row[field] === selected;
      });
    });

    const dedup = new Set<string>();
    for (const row of validRows) {
      const value = row[targetField]?.trim();
      if (value) dedup.add(value);
    }

    return Array.from(dedup).sort((a, b) => a.localeCompare(b, "id"));
  };

  const optionsByField = {} as Record<SelectField, string[]>;
  for (const targetField of SELECT_FIELDS) {
    optionsByField[targetField] = getFieldOptions(targetField, form);
  }

  const updateSelectField = (key: SelectField, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (relationRows.length === 0) {
        return next;
      }

      let changed = true;
      while (changed) {
        changed = false;

        for (const field of SELECT_FIELDS) {
          const selected = next[field] as string;
          if (!selected) continue;

          const allowed = getFieldOptions(field, next);
          if (!allowed.includes(selected)) {
            next[field] = "";
            changed = true;
          }
        }
      }

      return next;
    });
  };

  const handlePredict = async () => {
    try {
      const res = await predict.mutateAsync(form);
      setResult(res);
      addEntry({
        id: res.prediction_id,
        timestamp: res.timestamp,
        jumlah: form.jumlah,
        kode_customer: form.kode_customer,
        xgb_probability: res.xgboost.probability,
        mlp_probability: res.mlp.probability,
        threshold,
        xgb_label: riskLabel(res.xgboost.probability, threshold),
        mlp_label: riskLabel(res.mlp.probability, threshold),
      });
    } catch {
      // error handled by TanStack Query
    }
  };

  const canSubmit =
    form.jumlah > 0 &&
    SELECT_FIELDS.every((field) => (form[field] as string).trim().length > 0);

  const filledRequiredCount =
    (form.jumlah > 0 ? 1 : 0) +
    SELECT_FIELDS.filter((field) => (form[field] as string).trim().length > 0).length;
  const totalRequiredCount = 1 + SELECT_FIELDS.length;
  const completionPercent = Math.round(
    (filledRequiredCount / totalRequiredCount) * 100,
  );

  return (
    <div className="page-shell space-y-6 pb-8">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1>Prediksi risiko kredit</h1>
            <p className="max-w-[68ch] text-muted-foreground mt-1">
              Input data transaksi baru untuk mendapatkan prediksi risiko
              keterlambatan pembayaran.
            </p>
          </div>
          {/* Progress indicator */}
          <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm backdrop-blur">
            <p className="font-medium text-xs uppercase tracking-wider text-muted-foreground">
              Kesiapan Form
            </p>
            <p className="text-foreground font-semibold mt-0.5">
              {filledRequiredCount}/{totalRequiredCount} field terisi
            </p>
            <div className="mt-2 h-2 w-44 rounded-full bg-muted overflow-hidden">
              <div
                className="h-2 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${completionPercent}%`,
                  background:
                    completionPercent === 100
                      ? "#22c55e"
                      : completionPercent > 50
                        ? "var(--primary)"
                        : "#f59e0b",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[450px_1fr]">
        {/* Left: Input form */}
        <div className="space-y-4">
          <Card className="surface-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Input transaksi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                {/* Jumlah */}
                <div>
                  <label htmlFor="jumlah" className="text-sm font-medium">
                    Jumlah (Rp)
                  </label>
                  <input
                    id="jumlah"
                    type="number"
                    value={form.jumlah || ""}
                    onChange={(e) =>
                      updateForm("jumlah", Number(e.target.value))
                    }
                    className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm transition-shadow focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="15000000"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Masukkan nominal transaksi aktual untuk evaluasi model.
                  </p>
                </div>

                {/* Grouped dropdown fields */}
                {FIELD_GROUPS.map((group) => {
                  const GroupIcon = group.icon;
                  return (
                    <div key={group.label} className="form-group">
                      <div className="form-group-label">
                        <GroupIcon className="h-3.5 w-3.5" />
                        {group.label}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {group.fields.map((field) => (
                          <div key={field.key}>
                            <label className="text-xs font-medium text-muted-foreground">
                              {field.label}
                            </label>
                            <Select
                              value={form[field.key] as string}
                              onValueChange={(v) =>
                                updateSelectField(field.key, v)
                              }
                            >
                              <SelectTrigger className="mt-1 w-full">
                                <SelectValue
                                  placeholder={`Pilih ${field.label}`}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {(optionsByField[field.key] ?? []).map(
                                  (val) => (
                                    <SelectItem key={val} value={val}>
                                      {val}
                                    </SelectItem>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Keterangan */}
                <div>
                  <label htmlFor="keterangan" className="text-sm font-medium">
                    Keterangan
                  </label>
                  <input
                    id="keterangan"
                    type="text"
                    value={form.keterangan}
                    onChange={(e) => updateForm("keterangan", e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm transition-shadow focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {!canSubmit && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-50/60 px-3 py-2.5 text-xs text-amber-900 dark:bg-amber-950/20 dark:text-amber-200 flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                      Lengkapi semua field wajib dan isi jumlah transaksi lebih
                      dari 0 sebelum menjalankan prediksi.
                    </span>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          <ThresholdSlider value={threshold} onChange={setThreshold} />
          <ThresholdExplainer />

          <Button
            onClick={handlePredict}
            disabled={predict.isPending || !canSubmit}
            className="w-full"
            size="lg"
          >
            {predict.isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Memproses prediksi...
              </span>
            ) : (
              "Jalankan prediksi"
            )}
          </Button>

          {predict.isError && (
            <Card className="border-destructive/40">
              <CardContent className="pt-6 text-sm text-destructive">
                <p>Gagal memproses permintaan.</p>
                <p className="text-xs mt-1">{predict.error.message}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {!result ? (
            <Card className="surface-card flex min-h-[420px] items-center justify-center">
              <CardContent className="text-center text-muted-foreground">
                {predict.isPending ? (
                  <div className="skeleton-page w-full max-w-md mx-auto">
                    <div className="skeleton skeleton-header mx-auto" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="skeleton h-48 rounded-xl" />
                      <div className="skeleton h-48 rounded-xl" />
                    </div>
                    <div className="skeleton h-32 rounded-xl" />
                    <div className="skeleton h-24 rounded-xl" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60">
                      <Sparkles className="h-7 w-7 text-muted-foreground/60" />
                    </div>
                    <p className="text-2xl font-semibold text-foreground">
                      Analisis siap dijalankan
                    </p>
                    <p>Hasil prediksi akan muncul di panel ini</p>
                    <p className="text-xs">
                      Isi form di sebelah kiri dan klik &quot;Jalankan
                      Prediksi&quot;
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 stagger-children">
              {/* Gauges */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="surface-card">
                  <CardHeader className="pb-0">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10">
                        <Trees className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                      <span className="text-muted-foreground">XGBoost</span>
                      {/* Inline status */}
                      <span
                        className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
                          result.xgboost.probability >= threshold
                            ? "risk-badge-high"
                            : "risk-badge-low"
                        }`}
                      >
                        {result.xgboost.probability >= threshold
                          ? "Berisiko"
                          : "Layak"}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 flex justify-center">
                    <RiskGauge
                      probability={result.xgboost.probability}
                      threshold={threshold}
                      modelName="XGBoost"
                    />
                  </CardContent>
                </Card>
                <Card className="surface-card">
                  <CardHeader className="pb-0">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-500/10">
                        <Brain className="h-3.5 w-3.5 text-rose-500" />
                      </div>
                      <span className="text-muted-foreground">MLP</span>
                      <span
                        className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
                          result.mlp.probability >= threshold
                            ? "risk-badge-high"
                            : "risk-badge-low"
                        }`}
                      >
                        {result.mlp.probability >= threshold
                          ? "Berisiko"
                          : "Layak"}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 flex justify-center">
                    <RiskGauge
                      probability={result.mlp.probability}
                      threshold={threshold}
                      modelName="MLP"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Comparison */}
              <Card className="surface-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Perbandingan Model
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ComparisonTable
                    xgbProb={result.xgboost.probability}
                    mlpProb={result.mlp.probability}
                    threshold={threshold}
                  />
                </CardContent>
              </Card>

              {/* Recommendation */}
              <RecommendationCard
                xgbProb={result.xgboost.probability}
                mlpProb={result.mlp.probability}
                threshold={threshold}
              />

              {/* SHAP */}
              {result.shap_explanation?.xgboost && (
                <Card className="surface-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      SHAP feature contributions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ShapWaterfall
                      baseValue={result.shap_explanation.xgboost.base_value}
                      features={result.shap_explanation.xgboost.top_features}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
