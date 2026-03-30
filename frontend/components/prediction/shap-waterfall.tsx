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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

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

  const positiveCount = data.filter((d) => d.shapValue > 0).length;
  const negativeCount = data.filter((d) => d.shapValue <= 0).length;

  return (
    <div className="space-y-3 animate-in" style={{ animationDelay: "400ms" }}>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <ArrowUpRight className="h-3.5 w-3.5 text-red-500" />
          <span className="text-muted-foreground">
            Mendorong ke <strong className="text-red-500">Late</strong>{" "}
            ({positiveCount} fitur)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowDownRight className="h-3.5 w-3.5 text-green-500" />
          <span className="text-muted-foreground">
            Mendorong ke <strong className="text-green-500">On-time</strong>{" "}
            ({negativeCount} fitur)
          </span>
        </div>
        <div className="ml-auto text-muted-foreground">
          Base value:{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {baseValue.toFixed(4)}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={Math.max(280, data.length * 34)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 140, right: 50, top: 5, bottom: 5 }}
        >
          <XAxis
            type="number"
            tickFormatter={(v) => v.toFixed(3)}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            type="category"
            dataKey="feature"
            width={130}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              fontSize: "0.75rem",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
            formatter={(value, _name, props) => [
              `SHAP: ${Number(value).toFixed(4)} | Value: ${props.payload.featureValue ?? "N/A"}`,
              "Kontribusi",
            ]}
            cursor={{ fill: "var(--muted)", opacity: 0.2 }}
          />
          <ReferenceLine
            x={0}
            stroke="var(--border)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <Bar dataKey="shapValue" radius={[4, 4, 4, 4]} barSize={18}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.shapValue > 0
                    ? CHART_COLORS.negative
                    : CHART_COLORS.positive
                }
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
