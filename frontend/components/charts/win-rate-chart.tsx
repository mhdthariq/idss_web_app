"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { ChartContainer } from "@/components/charts/chart-container";
import { CHART_COLORS } from "@/lib/chart-utils";

interface WinRates {
  [metric: string]: { xgb_wins: number; mlp_wins: number; ties?: number };
}

interface WinRateChartProps {
  winRates: WinRates;
}

export function WinRateChart({ winRates }: WinRateChartProps) {
  const data = Object.entries(winRates).map(([metric, wr]) => ({
    metric: metric.replace("test_", "").toUpperCase(),
    "XGBoost Wins": wr.xgb_wins,
    "MLP Wins": wr.mlp_wins,
  }));

  return (
    <ChartContainer title="Win Rate — XGBoost vs MLP (30 Seeds)" description="Berapa kali masing-masing model menang" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 80, right: 30 }}>
        <XAxis type="number" domain={[0, 30]} />
        <YAxis type="category" dataKey="metric" />
        <Tooltip />
        <Legend />
        <Bar dataKey="XGBoost Wins" stackId="a" fill={CHART_COLORS.xgboost} />
        <Bar dataKey="MLP Wins" stackId="a" fill={CHART_COLORS.mlp} />
      </BarChart>
    </ChartContainer>
  );
}
