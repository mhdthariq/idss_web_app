"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ReferenceLine } from "recharts";
import { ChartContainer } from "@/components/charts/chart-container";
import { CHART_COLORS, fmtPct } from "@/lib/chart-utils";

interface ProbDistProps {
  yTrue: number[];
  probabilities: number[];
  currentThreshold: number;
  modelName: string;
  nBins?: number;
}

export function ProbabilityDistribution({ yTrue, probabilities, currentThreshold, modelName, nBins = 20 }: ProbDistProps) {
  const histData = useMemo(() => {
    const binWidth = 1 / nBins;
    const bins = Array.from({ length: nBins }, (_, i) => ({
      binLabel: fmtPct(i * binWidth + binWidth / 2, 0),
      onTime: 0,
      late: 0,
    }));
    for (let i = 0; i < probabilities.length; i++) {
      const binIdx = Math.min(Math.floor(probabilities[i] / binWidth), nBins - 1);
      if (yTrue[i] === 0) bins[binIdx].onTime++;
      else bins[binIdx].late++;
    }
    return bins;
  }, [yTrue, probabilities, nBins]);

  const thresholdBinIdx = Math.min(Math.floor(currentThreshold * nBins), nBins - 1);

  return (
    <ChartContainer
      title={`Distribusi Probabilitas — ${modelName}`}
      description="Hijau = tepat waktu, Merah = terlambat. Garis vertikal = threshold"
      height={280}
    >
      <BarChart data={histData} margin={{ top: 10, right: 20, bottom: 30, left: 20 }}>
        <XAxis dataKey="binLabel" label={{ value: "P(Late)", position: "bottom", offset: 10 }} />
        <YAxis label={{ value: "Count", angle: -90, position: "left" }} />
        <Tooltip />
        <Legend />
        <ReferenceLine
          x={histData[thresholdBinIdx]?.binLabel}
          stroke={CHART_COLORS.threshold}
          strokeDasharray="5 5"
          strokeWidth={2}
          label={{ value: "Threshold", position: "top" }}
        />
        <Bar dataKey="onTime" name="On-time (Aktual)" fill={CHART_COLORS.positive} opacity={0.7} />
        <Bar dataKey="late" name="Late (Aktual)" fill={CHART_COLORS.negative} opacity={0.7} />
      </BarChart>
    </ChartContainer>
  );
}
