"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
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
    <ChartContainer
      title="Win Rate — XGBoost vs MLP (30 Seeds)"
      description="Berapa kali masing-masing model menang"
      height={260}
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 24, right: 12, bottom: 12, left: 40 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          opacity={0.35}
          horizontal={false}
        />
        <XAxis type="number" domain={[0, 30]} allowDecimals={false} />
        <YAxis type="category" dataKey="metric" width={84} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "hsl(var(--foreground))" }}
        />
        <Legend
          verticalAlign="top"
          align="right"
          height={36}
          iconType="circle"
        />
        <Bar dataKey="XGBoost Wins" stackId="a" fill={CHART_COLORS.xgboost} />
        <Bar dataKey="MLP Wins" stackId="a" fill={CHART_COLORS.mlp} />
      </BarChart>
    </ChartContainer>
  );
}
