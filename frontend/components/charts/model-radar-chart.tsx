"use client";

import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, Tooltip } from "recharts";
import { ChartContainer } from "@/components/charts/chart-container";
import { CHART_COLORS, fmtChartFloat } from "@/lib/chart-utils";

interface ModelRadarChartProps {
  xgbMetrics: Record<string, number>;
  mlpMetrics: Record<string, number>;
}

const RADAR_FIELDS = [
  { key: "auc", label: "AUC-ROC" },
  { key: "precision", label: "Precision" },
  { key: "recall", label: "Recall" },
  { key: "f1", label: "F1 Score" },
  { key: "stability", label: "Stabilitas" },
  { key: "calibration", label: "Kalibrasi" },
];

export function ModelRadarChart({ xgbMetrics, mlpMetrics }: ModelRadarChartProps) {
  const data = RADAR_FIELDS.map((field) => ({
    metric: field.label,
    XGBoost: xgbMetrics[field.key] ?? 0,
    MLP: mlpMetrics[field.key] ?? 0,
  }));

  return (
    <ChartContainer title="Profil Model — XGBoost vs MLP" description="Kekuatan dan kelemahan relatif" height={350}>
      <RadarChart data={data} cx="50%" cy="50%">
        <PolarGrid />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 1]} tickFormatter={(v) => fmtChartFloat(v, 1)} />
        <Tooltip formatter={(v) => fmtChartFloat(Number(v))} />
        <Legend />
        <Radar name="XGBoost" dataKey="XGBoost" stroke={CHART_COLORS.xgboost} fill={CHART_COLORS.xgboost} fillOpacity={0.2} strokeWidth={2} />
        <Radar name="MLP" dataKey="MLP" stroke={CHART_COLORS.mlp} fill={CHART_COLORS.mlp} fillOpacity={0.2} strokeWidth={2} />
      </RadarChart>
    </ChartContainer>
  );
}
