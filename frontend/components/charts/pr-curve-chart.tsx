"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { ChartContainer } from "@/components/charts/chart-container";
import { CHART_COLORS, fmtChartFloat } from "@/lib/chart-utils";

interface CurveData {
  precision: number[];
  recall: number[];
  ap: number;
}

interface PrCurveChartProps {
  xgboost: CurveData;
  mlp?: CurveData | null;
  baseRate?: number;
}

export function PrCurveChart({ xgboost, mlp, baseRate }: PrCurveChartProps) {
  const xgbData = xgboost.recall.map((r, i) => ({
    recall: r,
    precision: xgboost.precision[i],
  }));
  const mlpData = mlp
    ? mlp.recall.map((r, i) => ({ recall: r, precision: mlp.precision[i] }))
    : [];

  return (
    <ChartContainer
      title="Precision-Recall Curve"
      description={`XGBoost AP: ${fmtChartFloat(xgboost.ap)}${mlp ? ` | MLP AP: ${fmtChartFloat(mlp.ap)}` : ""}`}
      height={380}
    >
      <LineChart margin={{ top: 24, right: 12, bottom: 24, left: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          opacity={0.35}
        />
        <XAxis
          dataKey="recall"
          type="number"
          domain={[0, 1]}
          ticks={[0, 0.25, 0.5, 0.75, 1]}
          tickFormatter={(v) => `${Math.round(v * 100)}%`}
          minTickGap={24}
        />
        <YAxis
          dataKey="precision"
          type="number"
          domain={[0, 1]}
          ticks={[0, 0.25, 0.5, 0.75, 1]}
          tickFormatter={(v) => `${Math.round(v * 100)}%`}
          width={44}
        />
        {baseRate != null && (
          <ReferenceLine
            y={baseRate}
            stroke={CHART_COLORS.diagonal}
            strokeDasharray="5 5"
          />
        )}
        <Tooltip formatter={(v) => fmtChartFloat(Number(v))} />
        <Legend
          verticalAlign="bottom"
          align="center"
          iconType="circle"
          wrapperStyle={{ paddingTop: 10 }}
        />
        <Line
          data={xgbData}
          type="monotone"
          dataKey="precision"
          name={`XGBoost (AP=${fmtChartFloat(xgboost.ap)})`}
          stroke={CHART_COLORS.xgboost}
          strokeWidth={2}
          dot={false}
        />
        {mlpData.length > 0 && (
          <Line
            data={mlpData}
            type="monotone"
            dataKey="precision"
            name={`MLP (AP=${fmtChartFloat(mlp!.ap)})`}
            stroke={CHART_COLORS.mlp}
            strokeWidth={2}
            dot={false}
          />
        )}
      </LineChart>
    </ChartContainer>
  );
}
