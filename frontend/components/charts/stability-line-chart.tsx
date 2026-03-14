"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { ChartContainer } from "@/components/charts/chart-container";
import { CHART_COLORS, fmtChartFloat } from "@/lib/chart-utils";

interface StabilityLineChartProps {
  results: Record<string, unknown>[];
  metric: string;
  metricLabel: string;
}

export function StabilityLineChart({
  results,
  metric,
  metricLabel,
}: StabilityLineChartProps) {
  const data = results.map((r) => ({
    seed: r.seed as number,
    xgboost: r[`xgb_${metric}`] as number,
    mlp: r[`mlp_${metric}`] as number,
  }));
  const seedTicks = data
    .filter((_, i) => i % 3 === 0 || i === data.length - 1)
    .map((d) => d.seed);

  return (
    <ChartContainer
      title={`${metricLabel} per Seed`}
      description="Setiap titik = satu random split. Model stabil = garis datar."
      height={340}
    >
      <LineChart
        data={data}
        margin={{ top: 24, right: 12, bottom: 16, left: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          opacity={0.35}
        />
        <XAxis
          dataKey="seed"
          type="number"
          domain={[1, data.length]}
          ticks={seedTicks}
          allowDecimals={false}
        />
        <YAxis tickFormatter={(v) => fmtChartFloat(v, 2)} width={44} />
        <Tooltip
          formatter={(v, name) => [fmtChartFloat(Number(v), 4), name as string]}
          labelFormatter={(label) => `Seed ${label}`}
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
        <Line
          dataKey="xgboost"
          name="XGBoost"
          stroke={CHART_COLORS.xgboost}
          strokeWidth={2}
          dot={false}
        />
        <Line
          dataKey="mlp"
          name="MLP"
          stroke={CHART_COLORS.mlp}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
