"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { ChartContainer } from "@/components/charts/chart-container";
import { CHART_COLORS, fmtChartFloat } from "@/lib/chart-utils";

interface StabilityLineChartProps {
  results: Record<string, unknown>[];
  metric: string;
  metricLabel: string;
}

export function StabilityLineChart({ results, metric, metricLabel }: StabilityLineChartProps) {
  const data = results.map((r) => ({
    seed: r.seed as number,
    xgboost: r[`xgb_${metric}`] as number,
    mlp: r[`mlp_${metric}`] as number,
  }));

  return (
    <ChartContainer title={`${metricLabel} per Seed`} description="Setiap titik = satu random split. Model stabil = garis datar." height={300}>
      <LineChart data={data} margin={{ top: 10, right: 30, bottom: 30, left: 20 }}>
        <XAxis dataKey="seed" label={{ value: "Random Seed", position: "bottom", offset: 10 }} />
        <YAxis tickFormatter={(v) => fmtChartFloat(v, 2)} />
        <Tooltip formatter={(v) => fmtChartFloat(Number(v))} />
        <Legend />
        <Line dataKey="xgboost" name="XGBoost" stroke={CHART_COLORS.xgboost} strokeWidth={2} dot={{ r: 3 }} />
        <Line dataKey="mlp" name="MLP" stroke={CHART_COLORS.mlp} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ChartContainer>
  );
}
