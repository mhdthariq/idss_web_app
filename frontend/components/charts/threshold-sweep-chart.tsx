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
  CartesianGrid,
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
      height={360}
    >
      <LineChart
        data={sweepData}
        margin={{ top: 24, right: 12, bottom: 24, left: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          opacity={0.35}
        />
        <XAxis
          dataKey="threshold"
          type="number"
          domain={[0, 1]}
          ticks={[0, 0.25, 0.5, 0.75, 1]}
          tickFormatter={(v) => fmtPct(v, 0)}
          minTickGap={36}
        />
        <YAxis domain={[0, 1]} tickFormatter={(v) => fmtPct(v, 0)} width={44} />
        <Tooltip
          formatter={(value, name) => [fmtPct(Number(value)), name as string]}
          labelFormatter={(label) => `Threshold: ${fmtPct(label as number, 0)}`}
        />
        <Legend
          verticalAlign="bottom"
          align="center"
          iconType="circle"
          wrapperStyle={{ paddingTop: 10 }}
        />
        <ReferenceLine
          x={currentThreshold}
          stroke="hsl(0, 84%, 60%)"
          strokeDasharray="5 5"
          strokeWidth={2}
          label={{
            value: `t=${fmtPct(currentThreshold, 0)}`,
            position: "insideTopRight",
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
