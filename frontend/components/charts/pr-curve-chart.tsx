"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ReferenceLine,
} from "recharts";
import { ChartContainer } from "@/components/charts/chart-container";
import { CHART_COLORS, fmtChartFloat } from "@/lib/chart-utils";

interface CurveData { precision: number[]; recall: number[]; ap: number; }

interface PrCurveChartProps {
  xgboost: CurveData;
  mlp?: CurveData | null;
  baseRate?: number;
}

export function PrCurveChart({ xgboost, mlp, baseRate }: PrCurveChartProps) {
  const xgbData = xgboost.recall.map((r, i) => ({ recall: r, precision: xgboost.precision[i] }));
  const mlpData = mlp ? mlp.recall.map((r, i) => ({ recall: r, precision: mlp.precision[i] })) : [];

  return (
    <ChartContainer
      title="Precision-Recall Curve"
      description={`XGBoost AP: ${fmtChartFloat(xgboost.ap)}${mlp ? ` | MLP AP: ${fmtChartFloat(mlp.ap)}` : ""}`}
      height={380}
    >
      <LineChart margin={{ top: 10, right: 30, bottom: 30, left: 30 }}>
        <XAxis dataKey="recall" type="number" domain={[0, 1]} label={{ value: "Recall", position: "bottom", offset: 10 }} />
        <YAxis dataKey="precision" type="number" domain={[0, 1]} label={{ value: "Precision", angle: -90, position: "left" }} />
        {baseRate != null && (
          <ReferenceLine y={baseRate} stroke={CHART_COLORS.diagonal} strokeDasharray="5 5" />
        )}
        <Tooltip formatter={(v) => fmtChartFloat(Number(v))} />
        <Legend />
        <Line data={xgbData} type="monotone" dataKey="precision" name={`XGBoost (AP=${fmtChartFloat(xgboost.ap)})`} stroke={CHART_COLORS.xgboost} strokeWidth={2} dot={false} />
        {mlpData.length > 0 && (
          <Line data={mlpData} type="monotone" dataKey="precision" name={`MLP (AP=${fmtChartFloat(mlp!.ap)})`} stroke={CHART_COLORS.mlp} strokeWidth={2} dot={false} />
        )}
      </LineChart>
    </ChartContainer>
  );
}
