"use client";

import { useState, useMemo } from "react";
import { useTestSetData } from "@/hooks/use-test-set-data";
import { DEFAULT_THRESHOLD } from "@/lib/constants";
import { computeConfusionMatrix, computeMetrics } from "@/lib/threshold-utils";
import { fmtPercent, fmtFloat } from "@/lib/formatters";
import { ThresholdSlider } from "@/components/prediction/threshold-slider";
import { ConfusionMatrix } from "@/components/charts/confusion-matrix";
import { ThresholdSweepChart } from "@/components/charts/threshold-sweep-chart";
import { RocCurveChart } from "@/components/charts/roc-curve-chart";
import { PrCurveChart } from "@/components/charts/pr-curve-chart";
import { ProbabilityDistribution } from "@/components/charts/probability-distribution";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Trees, Brain } from "lucide-react";

export default function TestSetPage() {
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const { data, isLoading, error } = useTestSetData();

  const xgbCM = useMemo(
    () =>
      data
        ? computeConfusionMatrix(data.y_true, data.xgb_probabilities, threshold)
        : null,
    [data, threshold]
  );
  const mlpCM = useMemo(
    () =>
      data
        ? computeConfusionMatrix(data.y_true, data.mlp_probabilities, threshold)
        : null,
    [data, threshold]
  );
  const xgbM = xgbCM ? computeMetrics(xgbCM) : null;
  const mlpM = mlpCM ? computeMetrics(mlpCM) : null;

  if (isLoading)
    return (
      <div className="skeleton-page p-4">
        <div className="skeleton skeleton-header" />
        <div className="skeleton h-16 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <div className="skeleton h-48" />
          <div className="skeleton h-48" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="skeleton h-64" />
          <div className="skeleton h-64" />
        </div>
      </div>
    );
  if (error) return <p className="text-destructive">Error: {error.message}</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1>Analisis Test Set</h1>
            <p className="text-muted-foreground text-sm">
              {data.n_samples} sampel • Geser threshold untuk melihat perubahan metrik secara real-time
            </p>
          </div>
        </div>
      </div>

      <ThresholdSlider value={threshold} onChange={setThreshold} />

      {/* Metrics cards */}
      {xgbM && mlpM && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 stagger-children">
          {[
            { label: "AUC-ROC", xgb: fmtFloat(data.roc_curve.xgboost.auc ?? 0), mlp: fmtFloat(data.roc_curve.mlp.auc ?? 0) },
            { label: "Precision", xgb: fmtPercent(xgbM.precision), mlp: fmtPercent(mlpM.precision) },
            { label: "Recall", xgb: fmtPercent(xgbM.recall), mlp: fmtPercent(mlpM.recall) },
            { label: "F1", xgb: fmtPercent(xgbM.f1), mlp: fmtPercent(mlpM.f1) },
            { label: "Accuracy", xgb: fmtPercent(xgbM.accuracy), mlp: fmtPercent(mlpM.accuracy) },
          ].map((m) => (
            <Card key={m.label} className="surface-card">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {m.label}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Trees className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="font-semibold tabular-nums">{m.xgb}</span>
                </div>
                <div className="flex items-center gap-2 text-sm mt-1">
                  <Brain className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  <span className="font-semibold tabular-nums">{m.mlp}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confusion matrices */}
      {xgbCM && mlpCM && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="surface-card">
            <CardContent className="pt-6">
              <ConfusionMatrix {...xgbCM} modelName="🌲 XGBoost" />
            </CardContent>
          </Card>
          <Card className="surface-card">
            <CardContent className="pt-6">
              <ConfusionMatrix {...mlpCM} modelName="🧠 MLP" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ROC + PR curves */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.roc_curve.xgboost.fpr && (
          <RocCurveChart
            xgboost={{
              fpr: data.roc_curve.xgboost.fpr!,
              tpr: data.roc_curve.xgboost.tpr!,
              auc: data.roc_curve.xgboost.auc!,
            }}
            mlp={
              data.roc_curve.mlp.fpr
                ? {
                    fpr: data.roc_curve.mlp.fpr,
                    tpr: data.roc_curve.mlp.tpr!,
                    auc: data.roc_curve.mlp.auc!,
                  }
                : null
            }
          />
        )}
        {data.pr_curve.xgboost.precision && (
          <PrCurveChart
            xgboost={{
              precision: data.pr_curve.xgboost.precision!,
              recall: data.pr_curve.xgboost.recall!,
              ap: data.pr_curve.xgboost.ap!,
            }}
            mlp={
              data.pr_curve.mlp.precision
                ? {
                    precision: data.pr_curve.mlp.precision,
                    recall: data.pr_curve.mlp.recall!,
                    ap: data.pr_curve.mlp.ap!,
                  }
                : null
            }
            baseRate={
              data.y_true.reduce((s, v) => s + v, 0) / data.y_true.length
            }
          />
        )}
      </div>

      {/* Threshold sweep */}
      <Tabs defaultValue="xgboost">
        <TabsList>
          <TabsTrigger value="xgboost" className="gap-1.5">
            <Trees className="h-3.5 w-3.5" />
            XGBoost
          </TabsTrigger>
          <TabsTrigger value="mlp" className="gap-1.5">
            <Brain className="h-3.5 w-3.5" />
            MLP
          </TabsTrigger>
        </TabsList>
        <TabsContent value="xgboost">
          <ThresholdSweepChart yTrue={data.y_true} probabilities={data.xgb_probabilities} currentThreshold={threshold} modelName="XGBoost" />
        </TabsContent>
        <TabsContent value="mlp">
          <ThresholdSweepChart yTrue={data.y_true} probabilities={data.mlp_probabilities} currentThreshold={threshold} modelName="MLP" />
        </TabsContent>
      </Tabs>

      {/* Probability distribution */}
      <Tabs defaultValue="xgboost">
        <TabsList>
          <TabsTrigger value="xgboost" className="gap-1.5">
            <Trees className="h-3.5 w-3.5" />
            XGBoost
          </TabsTrigger>
          <TabsTrigger value="mlp" className="gap-1.5">
            <Brain className="h-3.5 w-3.5" />
            MLP
          </TabsTrigger>
        </TabsList>
        <TabsContent value="xgboost">
          <ProbabilityDistribution yTrue={data.y_true} probabilities={data.xgb_probabilities} currentThreshold={threshold} modelName="XGBoost" />
        </TabsContent>
        <TabsContent value="mlp">
          <ProbabilityDistribution yTrue={data.y_true} probabilities={data.mlp_probabilities} currentThreshold={threshold} modelName="MLP" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
