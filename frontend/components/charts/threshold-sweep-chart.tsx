"use client";

import { useMemo } from "react";
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
import { computeConfusionMatrix, computeMetrics } from "@/lib/threshold-utils";
import { fmtPct } from "@/lib/chart-utils";

interface ThresholdSweepChartProps {
  yTrue: number[];
  probabilities: number[];
  currentThreshold: number;
  modelName: string;
}

export function ThresholdSweepChart({
  yTrue,
  probabilities,
  currentThreshold,
  modelName,
}: ThresholdSweepChartProps) {
  const sweepData = useMemo(() => {
    const steps: {
      threshold: number;
      precision: number;
      recall: number;
      f1: number;
    }[] = [];
    for (let t = 0.05; t <= 0.95; t += 0.01) {
      const cm = computeConfusionMatrix(yTrue, probabilities, t);
      const m = computeMetrics(cm);
      steps.push({
        threshold: Math.round(t * 100) / 100,
        precision: m.precision,
        recall: m.recall,
        f1: m.f1,
      });
    }
    return steps;
  }, [yTrue, probabilities]);

  return (
    <ChartContainer
      title={`Threshold Sweep — ${modelName}`}
      description="Lihat bagaimana precision, recall, dan F1 berubah saat threshold digeser"
      height={320}
    >
      <LineChart
        data={sweepData}
        margin={{ top: 10, right: 30, bottom: 30, left: 20 }}
      >
        <XAxis
          dataKey="threshold"
          type="number"
          domain={[0, 1]}
          tickFormatter={(v) => fmtPct(v, 0)}
          label={{ value: "Threshold", position: "bottom", offset: 10 }}
        />
        <YAxis domain={[0, 1]} tickFormatter={(v) => fmtPct(v, 0)} />
        <Tooltip
          formatter={(value, name) => [fmtPct(Number(value)), name as string]}
          labelFormatter={(label) => `Threshold: ${fmtPct(label as number, 0)}`}
        />
        <Legend />
        <ReferenceLine
          x={currentThreshold}
          stroke="hsl(0, 84%, 60%)"
          strokeDasharray="5 5"
          strokeWidth={2}
          label={{
            value: `t=${fmtPct(currentThreshold, 0)}`,
            position: "top",
            fill: "hsl(0, 84%, 60%)",
          }}
        />
        <Line
          dataKey="precision"
          name="Precision"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
        />
        <Line
          dataKey="recall"
          name="Recall"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
        />
        <Line
          dataKey="f1"
          name="F1 Score"
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
