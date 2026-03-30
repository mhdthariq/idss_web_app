"use client";

import { useState } from "react";
import { useStaticData } from "@/hooks/use-static-data";
import { StabilityLineChart } from "@/components/charts/stability-line-chart";
import { WinRateChart } from "@/components/charts/win-rate-chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtFloat } from "@/lib/formatters";
import { TrendingUp, Info } from "lucide-react";
import type { InstabilityData } from "@/types/analysis";

const METRICS = [
  { key: "test_auc", label: "Test AUC-ROC" },
  { key: "test_f1", label: "Test F1" },
  { key: "test_precision", label: "Test Precision" },
  { key: "test_recall", label: "Test Recall" },
];

export default function StabilityPage() {
  const [metric, setMetric] = useState("test_auc");
  const { data, isLoading, error } = useStaticData<InstabilityData>(
    "instability",
    "/api/data/instability"
  );

  const metricLabel = METRICS.find((m) => m.key === metric)?.label ?? metric;

  if (isLoading)
    return (
      <div className="skeleton-page p-4">
        <div className="skeleton skeleton-header" />
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-64 w-full" />
        <div className="skeleton h-48 w-full" />
      </div>
    );
  if (error) return <p className="text-destructive">Error: {error.message}</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1>Stabilitas Model</h1>
            <p className="text-muted-foreground text-sm">
              Analisis 30-seed random split untuk menguji konsistensi performa
            </p>
          </div>
        </div>
      </div>

      <Card className="surface-card">
        <CardContent className="pt-5 pb-5 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Hasil evaluasi dari satu random split bisa menyesatkan. Analisis ini menggunakan <strong className="text-foreground">30 random seeds</strong> yang berbeda untuk menguji apakah performa model konsisten di berbagai pembagian data.
          </p>
        </CardContent>
      </Card>

      {/* Metric selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Metrik:</label>
        <Select value={metric} onValueChange={setMetric}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METRICS.map((m) => (
              <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Line chart */}
      <StabilityLineChart results={data.results} metric={metric} metricLabel={metricLabel} />

      {/* Summary table */}
      {data.summary && (
        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="text-base">Ringkasan Statistik</CardTitle>
            <CardDescription>Mean ± Std dari 30 random seeds</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Metrik</TableHead>
                    <TableHead>XGBoost (Mean ± Std)</TableHead>
                    <TableHead>MLP (Mean ± Std)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(data.summary).map(([metricName, models]) => (
                    <TableRow key={metricName} className="hover:bg-muted/20">
                      <TableCell className="font-medium">{metricName}</TableCell>
                      {Object.entries(models).map(([model, stats]) => (
                        <TableCell key={model} className="tabular-nums">
                          {fmtFloat(stats.mean)} ± {fmtFloat(stats.std)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Win rates */}
      {data.json_data?.win_rates && (
        <WinRateChart winRates={data.json_data.win_rates} />
      )}
    </div>
  );
}
