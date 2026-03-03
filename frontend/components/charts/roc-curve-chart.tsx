"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
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
      <LineChart margin={{ top: 10, right: 30, bottom: 30, left: 30 }}>
        <XAxis
          dataKey="fpr"
          type="number"
          domain={[0, 1]}
          label={{ value: "False Positive Rate", position: "bottom", offset: 10 }}
        />
        <YAxis
          dataKey="tpr"
          type="number"
          domain={[0, 1]}
          label={{ value: "True Positive Rate", angle: -90, position: "left" }}
        />
        <ReferenceLine
          segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
          stroke={CHART_COLORS.diagonal}
          strokeDasharray="5 5"
        />
        <Tooltip formatter={(v) => fmtChartFloat(Number(v))} />
        <Legend />
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
