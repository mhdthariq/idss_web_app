"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { ChartContainer } from "@/components/charts/chart-container";
import { CHART_COLORS, fmtChartFloat } from "@/lib/chart-utils";

interface FeatureImportanceBarProps {
  features: { feature: string; importance: number }[];
  modelName: string;
  topN?: number;
}

export function FeatureImportanceBar({ features, modelName, topN = 20 }: FeatureImportanceBarProps) {
  const data = useMemo(() => {
    return [...features]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, topN)
      .reverse()
      .map((f) => ({ feature: f.feature.replace(/_/g, " "), importance: f.importance }));
  }, [features, topN]);

  return (
    <ChartContainer title={`Feature Importance — ${modelName}`} description={`Top ${topN} fitur`} height={Math.max(400, topN * 26)}>
      <BarChart data={data} layout="vertical" margin={{ left: 180, right: 30, top: 10, bottom: 10 }}>
        <XAxis type="number" tickFormatter={(v) => fmtChartFloat(v, 3)} />
        <YAxis type="category" dataKey="feature" width={170} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => fmtChartFloat(Number(v), 6)} />
        <Bar dataKey="importance" fill={CHART_COLORS.xgboost} radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS.xgboost} opacity={0.4 + 0.6 * ((i + 1) / data.length)} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
