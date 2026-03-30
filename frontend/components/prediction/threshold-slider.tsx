"use client";

import { Slider } from "@/components/ui/slider";
import { fmtPercent } from "@/lib/formatters";
import { getThresholdDescription } from "@/lib/threshold-utils";
import { Crosshair } from "lucide-react";

interface ThresholdSliderProps {
  value: number;
  onChange: (value: number) => void;
  showDescription?: boolean;
}

export function ThresholdSlider({
  value,
  onChange,
  showDescription = true,
}: ThresholdSliderProps) {
  const desc = getThresholdDescription(value);

  /* Snap points for key thresholds */
  const markers = [
    { pos: 0.3, label: "0.3" },
    { pos: 0.5, label: "0.5" },
    { pos: 0.7, label: "0.7" },
  ];

  /* Dynamic bg color for the value badge */
  const badgeColor =
    value <= 0.35
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
      : value <= 0.55
        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
        : "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300";

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4 surface-card">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Crosshair className="h-4 w-4 text-primary" />
          Ambang Batas (Threshold)
        </label>
        <span
          className={`text-sm font-bold tabular-nums px-2.5 py-0.5 rounded-full ${badgeColor}`}
        >
          {fmtPercent(value, 0)}
        </span>
      </div>
      <div className="relative pt-1 pb-4">
        <Slider
          value={[value]}
          onValueChange={(v) => onChange(v[0])}
          min={0.1}
          max={0.9}
          step={0.01}
        />
        {/* Snap-point markers */}
        <div className="relative mt-1 h-3">
          {markers.map((m) => {
            const leftPct = ((m.pos - 0.1) / 0.8) * 100;
            return (
              <button
                key={m.pos}
                type="button"
                className="absolute -translate-x-1/2 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                style={{ left: `${leftPct}%` }}
                onClick={() => onChange(m.pos)}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
      {showDescription && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm flex gap-2 items-start">
          <span className="text-lg leading-none shrink-0">{desc.emoji}</span>
          <span className="text-muted-foreground">{desc.text}</span>
        </div>
      )}
    </div>
  );
}
