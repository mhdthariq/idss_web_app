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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

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

  if (isLoading) return <p className="text-muted-foreground">Memuat data test set...</p>;
  if (error) return <p className="text-destructive">Error: {error.message}</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📊 Analisis Test Set</h1>
        <p className="text-muted-foreground">
          {data.n_samples} sampel • Geser threshold untuk melihat perubahan metrik secara real-time
        </p>
      </div>

      <ThresholdSlider value={threshold} onChange={setThreshold} />

      {/* Metrics table */}
      {xgbM && mlpM && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Metrik Performa</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>AUC-ROC</TableHead>
                  <TableHead>Precision</TableHead>
                  <TableHead>Recall</TableHead>
                  <TableHead>F1</TableHead>
                  <TableHead>Accuracy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">🌲 XGBoost</TableCell>
                  <TableCell>{fmtFloat(data.roc_curve.xgboost.auc ?? 0)}</TableCell>
                  <TableCell>{fmtPercent(xgbM.precision)}</TableCell>
                  <TableCell>{fmtPercent(xgbM.recall)}</TableCell>
                  <TableCell>{fmtPercent(xgbM.f1)}</TableCell>
                  <TableCell>{fmtPercent(xgbM.accuracy)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">🧠 MLP</TableCell>
                  <TableCell>{fmtFloat(data.roc_curve.mlp.auc ?? 0)}</TableCell>
                  <TableCell>{fmtPercent(mlpM.precision)}</TableCell>
                  <TableCell>{fmtPercent(mlpM.recall)}</TableCell>
                  <TableCell>{fmtPercent(mlpM.f1)}</TableCell>
                  <TableCell>{fmtPercent(mlpM.accuracy)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Confusion matrices */}
      {xgbCM && mlpCM && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <ConfusionMatrix {...xgbCM} modelName="🌲 XGBoost" />
            </CardContent>
          </Card>
          <Card>
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
          <TabsTrigger value="xgboost">XGBoost</TabsTrigger>
          <TabsTrigger value="mlp">MLP</TabsTrigger>
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
          <TabsTrigger value="xgboost">XGBoost</TabsTrigger>
          <TabsTrigger value="mlp">MLP</TabsTrigger>
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
