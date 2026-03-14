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
  fpr: number[];
  tpr: number[];
  auc: number;
}

interface RocCurveChartProps {
  xgboost: CurveData;
  mlp?: CurveData | null;
}

export function RocCurveChart({ xgboost, mlp }: RocCurveChartProps) {
  const xgbData = xgboost.fpr.map((fpr, i) => ({
    fpr,
    tpr: xgboost.tpr[i],
  }));
  const mlpData = mlp
    ? mlp.fpr.map((fpr, i) => ({ fpr, tpr: mlp.tpr[i] }))
    : [];

  return (
    <ChartContainer
      title="ROC Curve"
      description={`XGBoost AUC: ${fmtChartFloat(xgboost.auc)}${mlp ? ` | MLP AUC: ${fmtChartFloat(mlp.auc)}` : ""}`}
      height={380}
    >
      <LineChart margin={{ top: 24, right: 12, bottom: 24, left: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          opacity={0.35}
        />
        <XAxis
          dataKey="fpr"
          type="number"
          domain={[0, 1]}
          ticks={[0, 0.25, 0.5, 0.75, 1]}
          tickFormatter={(v) => `${Math.round(v * 100)}%`}
          minTickGap={24}
        />
        <YAxis
          dataKey="tpr"
          type="number"
          domain={[0, 1]}
          ticks={[0, 0.25, 0.5, 0.75, 1]}
          tickFormatter={(v) => `${Math.round(v * 100)}%`}
          width={44}
        />
        <ReferenceLine
          segment={[
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ]}
          stroke={CHART_COLORS.diagonal}
          strokeDasharray="5 5"
        />
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
          dataKey="tpr"
          name={`XGBoost (AUC=${fmtChartFloat(xgboost.auc)})`}
          stroke={CHART_COLORS.xgboost}
          strokeWidth={2}
          dot={false}
        />
        {mlpData.length > 0 && (
          <Line
            data={mlpData}
            type="monotone"
            dataKey="tpr"
            name={`MLP (AUC=${fmtChartFloat(mlp!.auc)})`}
            stroke={CHART_COLORS.mlp}
            strokeWidth={2}
            dot={false}
          />
        )}
      </LineChart>
    </ChartContainer>
  );
}
