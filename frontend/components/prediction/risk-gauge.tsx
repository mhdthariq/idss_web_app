"use client";

import { PieChart, Pie, Cell } from "recharts";
import { riskLabel, getRiskLevel } from "@/lib/threshold-utils";

interface RiskGaugeProps {
  probability: number;
  threshold: number;
  modelName: string;
  size?: number;
}

const GAUGE_DATA = [
  { name: "Rendah", value: 40 },
  { name: "Sedang", value: 30 },
  { name: "Tinggi", value: 30 },
];
const GAUGE_COLORS = ["#22c55e", "#f59e0b", "#ef4444"];

export function RiskGauge({
  probability,
  threshold,
  modelName,
  size = 200,
}: RiskGaugeProps) {
  const label = riskLabel(probability, threshold);
  const riskLevel = getRiskLevel(probability);

  // Needle angle: 180° (left) to 0° (right), maps prob 0→1 to angle 180→0
  const angle = 180 - probability * 180;
  const cx = size / 2;
  const cy = size / 2;
  const needleLen = size * 0.32;
  const radians = (angle * Math.PI) / 180;
  const nx = cx + needleLen * Math.cos(radians);
  const ny = cy - needleLen * Math.sin(radians);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-sm font-medium text-muted-foreground">
        {modelName}
      </span>
      <div className="relative">
        <PieChart width={size} height={size / 2 + 20}>
          <Pie
            data={GAUGE_DATA}
            cx={cx}
            cy={cy}
            startAngle={180}
            endAngle={0}
            innerRadius={size * 0.28}
            outerRadius={size * 0.42}
            dataKey="value"
            stroke="none"
          >
            {GAUGE_DATA.map((_, i) => (
              <Cell key={i} fill={GAUGE_COLORS[i]} opacity={0.8} />
            ))}
          </Pie>
        </PieChart>
        {/* Needle SVG overlay */}
        <svg
          width={size}
          height={size / 2 + 20}
          className="absolute top-0 left-0"
          style={{ pointerEvents: "none" }}
        >
          <line
            x1={cx}
            y1={cy}
            x2={nx}
            y2={ny}
            stroke="hsl(var(--foreground))"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <circle
            cx={cx}
            cy={cy}
            r={4}
            fill="hsl(var(--foreground))"
          />
        </svg>
      </div>
      <div className="text-center -mt-2">
        <p className="text-2xl font-bold">
          {(probability * 100).toFixed(1)}%
        </p>
        <p
          className="text-sm font-semibold"
          style={{ color: riskLevel.color }}
        >
          {label === "BERISIKO" ? "⚠️" : "✅"} {label}
        </p>
        <p className="text-xs text-muted-foreground">
          Risiko: {riskLevel.label}
        </p>
      </div>
    </div>
  );
}
