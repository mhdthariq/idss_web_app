"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ReferenceLine } from "recharts";
import { ChartContainer } from "@/components/charts/chart-container";
import { CHART_COLORS, fmtChartFloat } from "@/lib/chart-utils";

interface CalibrationModelData {
  brier_score: number;
  ece: number;
  calibration_curve_x: number[];
  calibration_curve_y: number[];
}

interface CalibrationCurveChartProps {
  xgb: CalibrationModelData;
  mlp: CalibrationModelData;
}

export function CalibrationCurveChart({ xgb, mlp }: CalibrationCurveChartProps) {
  const xgbData = xgb.calibration_curve_x.map((x, i) => ({ x, y: xgb.calibration_curve_y[i] }));
  const mlpData = mlp.calibration_curve_x.map((x, i) => ({ x, y: mlp.calibration_curve_y[i] }));

  return (
    <ChartContainer
      title="Kurva Kalibrasi (Reliability Diagram)"
      description={`XGBoost Brier: ${fmtChartFloat(xgb.brier_score)} ECE: ${fmtChartFloat(xgb.ece)} | MLP Brier: ${fmtChartFloat(mlp.brier_score)} ECE: ${fmtChartFloat(mlp.ece)}`}
      height={380}
    >
      <LineChart margin={{ top: 10, right: 30, bottom: 30, left: 30 }}>
        <XAxis dataKey="x" type="number" domain={[0, 1]} label={{ value: "Mean Predicted Probability", position: "bottom", offset: 10 }} />
        <YAxis type="number" domain={[0, 1]} label={{ value: "Observed Frequency", angle: -90, position: "left" }} />
        <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke={CHART_COLORS.diagonal} strokeDasharray="5 5" />
        <Tooltip formatter={(v) => fmtChartFloat(Number(v))} />
        <Legend />
        <Line data={xgbData} dataKey="y" name={`XGBoost (Brier=${fmtChartFloat(xgb.brier_score)})`} stroke={CHART_COLORS.xgboost} strokeWidth={2} dot={{ r: 4 }} />
        <Line data={mlpData} dataKey="y" name={`MLP (Brier=${fmtChartFloat(mlp.brier_score)})`} stroke={CHART_COLORS.mlp} strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ChartContainer>
  );
}
