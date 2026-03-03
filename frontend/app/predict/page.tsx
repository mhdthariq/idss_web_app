"use client";

import { useState } from "react";
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
import type { PredictionInput, PredictionResult, UniqueValues } from "@/types/prediction";

export default function PredictPage() {
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const predict = usePrediction();
  const addEntry = useDecisionLogStore((s) => s.addEntry);

  const { data: uniqueValues } = useStaticData<UniqueValues>(
    "unique-values",
    "/api/config/unique-values"
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

  const handlePredict = async () => {
    try {
      const res = await predict.mutateAsync(form);
      setResult(res);
      // Save to decision log
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

  const dropdownFields: { key: keyof PredictionInput; label: string }[] = [
    { key: "kode_customer", label: "Kode Customer" },
    { key: "nama_salesman", label: "Salesman" },
    { key: "nama_divisi", label: "Divisi" },
    { key: "nama_kategori", label: "Kategori" },
    { key: "nama_sub_kategori", label: "Sub Kategori" },
    { key: "kode_cabang", label: "Cabang" },
    { key: "provinsi", label: "Provinsi" },
    { key: "kota", label: "Kota" },
    { key: "kecamatan", label: "Kecamatan" },
    { key: "nama_group_customer", label: "Group Customer" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📝 Prediksi Risiko Kredit</h1>
        <p className="text-muted-foreground">
          Input data transaksi baru untuk mendapatkan prediksi risiko
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        {/* Left: Input form */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Input Transaksi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Jumlah */}
              <div>
                <label className="text-sm font-medium">Jumlah (Rp)</label>
                <input
                  type="number"
                  value={form.jumlah || ""}
                  onChange={(e) =>
                    updateForm("jumlah", Number(e.target.value))
                  }
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="15000000"
                />
              </div>

              {/* Dropdown fields */}
              {dropdownFields.map((field) => (
                <div key={field.key}>
                  <label className="text-sm font-medium">{field.label}</label>
                  <Select
                    value={form[field.key] as string}
                    onValueChange={(v) => updateForm(field.key, v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={`Pilih ${field.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        (uniqueValues?.[
                          field.key as keyof UniqueValues
                        ] as string[]) ?? []
                      ).map((val) => (
                        <SelectItem key={val} value={val}>
                          {val}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              {/* Keterangan */}
              <div>
                <label className="text-sm font-medium">Keterangan</label>
                <input
                  type="text"
                  value={form.keterangan}
                  onChange={(e) => updateForm("keterangan", e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <ThresholdSlider value={threshold} onChange={setThreshold} />
          <ThresholdExplainer />

          <Button
            onClick={handlePredict}
            disabled={predict.isPending || form.jumlah <= 0}
            className="w-full"
            size="lg"
          >
            {predict.isPending ? "Memproses..." : "🔮 Jalankan Prediksi"}
          </Button>

          {predict.isError && (
            <p className="text-sm text-destructive">
              Error: {predict.error.message}
            </p>
          )}
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {!result ? (
            <Card className="flex items-center justify-center min-h-[400px]">
              <CardContent className="text-center text-muted-foreground">
                <p className="text-4xl mb-2">🔮</p>
                <p>Hasil prediksi akan muncul di sini</p>
                <p className="text-xs mt-1">
                  Isi form di sebelah kiri dan klik &quot;Jalankan Prediksi&quot;
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Gauges */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardContent className="pt-6 flex justify-center">
                    <RiskGauge
                      probability={result.xgboost.probability}
                      threshold={threshold}
                      modelName="🌲 XGBoost"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 flex justify-center">
                    <RiskGauge
                      probability={result.mlp.probability}
                      threshold={threshold}
                      modelName="🧠 MLP"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Comparison */}
              <Card>
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
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      📊 SHAP Feature Contributions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ShapWaterfall
                      baseValue={
                        result.shap_explanation.xgboost.base_value
                      }
                      features={
                        result.shap_explanation.xgboost.top_features
                      }
                    />
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
