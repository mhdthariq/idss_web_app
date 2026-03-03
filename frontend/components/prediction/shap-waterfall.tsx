"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { CHART_COLORS } from "@/lib/chart-utils";

interface ShapFeature {
  feature: string;
  shap_value: number;
  feature_value: number | string | null;
}

interface ShapWaterfallProps {
  baseValue: number;
  features: ShapFeature[];
}

export function ShapWaterfall({ baseValue, features }: ShapWaterfallProps) {
  const sorted = [...features]
    .sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value))
    .slice(0, 10)
    .reverse();

  const data = sorted.map((f) => ({
    feature: f.feature.replace(/_/g, " "),
    shapValue: f.shap_value,
    featureValue: f.feature_value,
  }));

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">
        Base value: {baseValue.toFixed(4)} • Merah = mendorong ke Late, Hijau =
        mendorong ke On-time
      </p>
      <ResponsiveContainer width="100%" height={Math.max(280, data.length * 32)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 140, right: 40, top: 5, bottom: 5 }}
        >
          <XAxis type="number" tickFormatter={(v) => v.toFixed(3)} />
          <YAxis
            type="category"
            dataKey="feature"
            width={130}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value, _name, props) => [
              `SHAP: ${Number(value).toFixed(4)} | Value: ${props.payload.featureValue ?? "N/A"}`,
            ]}
          />
          <ReferenceLine x={0} stroke="hsl(var(--border))" />
          <Bar dataKey="shapValue" radius={[4, 4, 4, 4]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.shapValue > 0
                    ? CHART_COLORS.negative
                    : CHART_COLORS.positive
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
