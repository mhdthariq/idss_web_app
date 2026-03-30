"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { riskLabel, getRiskLevel } from "@/lib/threshold-utils";

interface RiskGaugeProps {
  probability: number;
  threshold: number;
  modelName: string;
  size?: number;
}

export function RiskGauge({
  probability,
  threshold,
  modelName,
  size = 200,
}: RiskGaugeProps) {
  const label = riskLabel(probability, threshold);
  const riskLevel = getRiskLevel(probability);
  const percent = Math.max(0, Math.min(100, probability * 100));

  // Animated fill
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 900;
    const from = 0;
    const to = percent;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedPercent(from + (to - from) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [percent]);

  // SVG arc geometry
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = size * 0.1;
  const r = (size - strokeWidth) / 2 - 4;
  const circumference = Math.PI * r; // semicircle
  const fillLength = (animatedPercent / 100) * circumference;
  const thresholdAngle = threshold * 180; // 0→180 degrees

  // Color stops for the gauge gradient
  const getArcColor = (pct: number) => {
    if (pct < 40) return "#22c55e";
    if (pct < 70) return "#f59e0b";
    return "#ef4444";
  };

  const glowClass =
    percent < 40
      ? "gauge-glow gauge-glow-green"
      : percent < 70
        ? "gauge-glow gauge-glow-amber"
        : "gauge-glow gauge-glow-red";

  return (
    <div
      className="flex w-full max-w-xs flex-col items-center gap-3 animate-in-scale"
      style={{ animationDelay: "200ms" }}
    >
      <div
        className="relative"
        style={{ width: size, height: size / 2 + 28 }}
        aria-label={`Skor risiko ${modelName} ${percent.toFixed(1)} persen`}
      >
        {/* Glow behind gauge */}
        <div
          className={`absolute inset-0 pointer-events-none ${glowClass}`}
          style={{ top: "10%", height: "60%" }}
        />

        <svg
          width={size}
          height={size / 2 + 16}
          viewBox={`0 0 ${size} ${size / 2 + 16}`}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id={`gauge-grad-${modelName}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="40%" stopColor="#22c55e" />
              <stop offset="55%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <filter id={`gauge-shadow-${modelName}`}>
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Track (background arc) */}
          <path
            d={describeArc(cx, cy, r, 180, 360)}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={0.5}
          />

          {/* Colored segments */}
          <path
            d={describeArc(cx, cy, r, 180, 252)}
            fill="none"
            stroke="#22c55e"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={0.15}
          />
          <path
            d={describeArc(cx, cy, r, 252, 306)}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={0.15}
          />
          <path
            d={describeArc(cx, cy, r, 306, 360)}
            fill="none"
            stroke="#ef4444"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={0.15}
          />

          {/* Fill arc (animated) */}
          <path
            d={describeArc(cx, cy, r, 180, 360)}
            fill="none"
            stroke={`url(#gauge-grad-${modelName})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={circumference - fillLength}
            filter={`url(#gauge-shadow-${modelName})`}
            style={{ transition: "stroke-dashoffset 0.1s ease-out" }}
          />

          {/* Threshold marker */}
          {(() => {
            const angle = 180 + thresholdAngle;
            const rad = (angle * Math.PI) / 180;
            const x1 = cx + (r - strokeWidth / 2 - 2) * Math.cos(rad);
            const y1 = cy + (r - strokeWidth / 2 - 2) * Math.sin(rad);
            const x2 = cx + (r + strokeWidth / 2 + 2) * Math.cos(rad);
            const y2 = cy + (r + strokeWidth / 2 + 2) * Math.sin(rad);
            return (
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--foreground)"
                strokeWidth={2.5}
                strokeLinecap="round"
                opacity={0.6}
              />
            );
          })()}

          {/* Needle dot */}
          {(() => {
            const angle = 180 + (animatedPercent / 100) * 180;
            const rad = (angle * Math.PI) / 180;
            const nx = cx + r * Math.cos(rad);
            const ny = cy + r * Math.sin(rad);
            return (
              <circle
                cx={nx}
                cy={ny}
                r={strokeWidth / 2 + 3}
                fill={getArcColor(animatedPercent)}
                stroke="var(--card)"
                strokeWidth={3}
                style={{ transition: "cx 0.1s ease-out, cy 0.1s ease-out" }}
              />
            );
          })()}
        </svg>

        {/* Center text */}
        <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 flex-col items-center">
          <p
            className="text-4xl font-bold leading-none tabular-nums tracking-tight"
            style={{ color: getArcColor(percent) }}
          >
            {animatedPercent.toFixed(1)}%
          </p>
          <p className="mt-1 text-[0.7rem] text-muted-foreground">
            Threshold {(threshold * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Label */}
      <div className="text-center">
        <p
          className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full ${
            label === "BERISIKO"
              ? "risk-badge-high"
              : "risk-badge-low"
          }`}
        >
          {label === "BERISIKO" ? (
            <AlertTriangle className="h-3.5 w-3.5" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          {label}
        </p>
        <p className="text-xs text-muted-foreground mt-1.5">
          Risiko: {riskLevel.label}
        </p>
      </div>
    </div>
  );
}

/* Utility to describe an SVG arc path */
function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angle: number,
): { x: number; y: number } {
  const rad = ((angle - 0) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}
