"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { ChartContainer } from "@/components/charts/chart-container";
import { CHART_COLORS, fmtPct } from "@/lib/chart-utils";

interface ProbDistProps {
  yTrue: number[];
  probabilities: number[];
  currentThreshold: number;
  modelName: string;
  nBins?: number;
}

export function ProbabilityDistribution({
  yTrue,
  probabilities,
  currentThreshold,
  modelName,
  nBins = 20,
}: ProbDistProps) {
  const histData = useMemo(() => {
    const binWidth = 1 / nBins;
    const bins = Array.from({ length: nBins }, (_, i) => ({
      binCenter: i * binWidth + binWidth / 2,
      onTime: 0,
      late: 0,
    }));
    for (let i = 0; i < probabilities.length; i++) {
      const binIdx = Math.min(
        Math.floor(probabilities[i] / binWidth),
        nBins - 1,
      );
      if (yTrue[i] === 0) bins[binIdx].onTime++;
      else bins[binIdx].late++;
    }
    return bins;
  }, [yTrue, probabilities, nBins]);

  const thresholdBinIdx = Math.min(
    Math.floor(currentThreshold * nBins),
    nBins - 1,
  );

  return (
    <ChartContainer
      title={`Distribusi Probabilitas — ${modelName}`}
      description="Hijau = tepat waktu, Merah = terlambat. Garis vertikal = threshold"
      height={340}
    >
      <BarChart
        data={histData}
        margin={{ top: 24, right: 12, bottom: 24, left: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          opacity={0.35}
          vertical={false}
        />
        <XAxis
          dataKey="binCenter"
          type="number"
          domain={[0, 1]}
          ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
          tickFormatter={(v) => fmtPct(v, 0)}
        />
        <YAxis width={44} />
        <Tooltip />
        <Legend
          verticalAlign="bottom"
          align="center"
          iconType="circle"
          wrapperStyle={{ paddingTop: 10 }}
        />
        <ReferenceLine
          x={histData[thresholdBinIdx]?.binCenter}
          stroke={CHART_COLORS.threshold}
          strokeDasharray="5 5"
          strokeWidth={2}
          label={{ value: "Threshold", position: "insideTopRight" }}
        />
        <Bar
          dataKey="onTime"
          name="On-time (Aktual)"
          fill={CHART_COLORS.positive}
          opacity={0.7}
        />
        <Bar
          dataKey="late"
          name="Late (Aktual)"
          fill={CHART_COLORS.negative}
          opacity={0.7}
        />
      </BarChart>
    </ChartContainer>
  );
}
