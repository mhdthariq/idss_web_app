"use client";

import { riskLabel, getRiskLevel } from "@/lib/threshold-utils";
import { fmtPercent } from "@/lib/formatters";
import { Trees, Brain, AlertTriangle, CheckCircle2 } from "lucide-react";

interface ComparisonTableProps {
  xgbProb: number;
  mlpProb: number;
  threshold: number;
}

export function ComparisonTable({
  xgbProb,
  mlpProb,
  threshold,
}: ComparisonTableProps) {
  const xgbLabel = riskLabel(xgbProb, threshold);
  const mlpLabel = riskLabel(mlpProb, threshold);
  const xgbRisk = getRiskLevel(xgbProb);
  const mlpRisk = getRiskLevel(mlpProb);

  const rows: {
    aspect: string;
    xgb: React.ReactNode;
    mlp: React.ReactNode;
  }[] = [
    {
      aspect: "Probabilitas",
      xgb: <ProbCell value={xgbProb} />,
      mlp: <ProbCell value={mlpProb} />,
    },
    {
      aspect: "Status Kelayakan",
      xgb: <StatusBadge label={xgbLabel} />,
      mlp: <StatusBadge label={mlpLabel} />,
    },
    {
      aspect: `Di atas Threshold (${fmtPercent(threshold, 0)})`,
      xgb: (
        <span className={xgbProb >= threshold ? "text-red-500 font-semibold" : "text-green-500 font-semibold"}>
          {xgbProb >= threshold ? "Ya" : "Tidak"}
        </span>
      ),
      mlp: (
        <span className={mlpProb >= threshold ? "text-red-500 font-semibold" : "text-green-500 font-semibold"}>
          {mlpProb >= threshold ? "Ya" : "Tidak"}
        </span>
      ),
    },
    {
      aspect: "Tingkat Risiko",
      xgb: (
        <span
          className="risk-badge"
          style={{
            color: xgbRisk.color,
            background: `color-mix(in oklab, ${xgbRisk.color} 12%, transparent)`,
            border: `1px solid color-mix(in oklab, ${xgbRisk.color} 25%, transparent)`,
          }}
        >
          {xgbRisk.label}
        </span>
      ),
      mlp: (
        <span
          className="risk-badge"
          style={{
            color: mlpRisk.color,
            background: `color-mix(in oklab, ${mlpRisk.color} 12%, transparent)`,
            border: `1px solid color-mix(in oklab, ${mlpRisk.color} 25%, transparent)`,
          }}
        >
          {mlpRisk.label}
        </span>
      ),
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      {/* Header */}
      <div className="grid grid-cols-[1fr_1fr_1fr] bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Aspek</span>
        <span className="flex items-center gap-1.5">
          <Trees className="h-3.5 w-3.5 text-emerald-500" />
          XGBoost
        </span>
        <span className="flex items-center gap-1.5">
          <Brain className="h-3.5 w-3.5 text-rose-500" />
          MLP
        </span>
      </div>
      {/* Rows */}
      <div className="divide-y divide-border/50">
        {rows.map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_1fr_1fr] px-4 py-3 text-sm items-center hover:bg-muted/30 transition-colors"
          >
            <span className="font-medium text-muted-foreground">
              {row.aspect}
            </span>
            <span>{row.xgb}</span>
            <span>{row.mlp}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Probability cell with inline bar */
function ProbCell({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  const color =
    pct < 40 ? "#22c55e" : pct < 70 ? "#f59e0b" : "#ef4444";

  return (
    <div className="prob-bar-container">
      <span className="font-semibold tabular-nums">{fmtPercent(value)}</span>
      <div className="prob-bar">
        <div
          className="prob-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

/* Status badge pill */
function StatusBadge({ label }: { label: "BERISIKO" | "LAYAK" }) {
  const isRisky = label === "BERISIKO";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
        isRisky ? "risk-badge-high" : "risk-badge-low"
      }`}
    >
      {isRisky ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <CheckCircle2 className="h-3 w-3" />
      )}
      {label}
    </span>
  );
}
