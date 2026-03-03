"use client";

import { Slider } from "@/components/ui/slider";
import { fmtPercent } from "@/lib/formatters";
import { getThresholdDescription } from "@/lib/threshold-utils";

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

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          🎯 Ambang Batas (Threshold)
        </label>
        <span className="text-sm font-bold tabular-nums">
          {fmtPercent(value, 0)}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={0.1}
        max={0.9}
        step={0.01}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0.10</span>
        <span>0.50</span>
        <span>0.90</span>
      </div>
      {showDescription && (
        <div className="rounded-md bg-muted p-3 text-sm">
          <span className="mr-1">{desc.emoji}</span>
          {desc.text}
        </div>
      )}
    </div>
  );
}
