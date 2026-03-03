"use client";

import { useState } from "react";
import { useStaticData } from "@/hooks/use-static-data";
import { StabilityLineChart } from "@/components/charts/stability-line-chart";
import { WinRateChart } from "@/components/charts/win-rate-chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtFloat } from "@/lib/formatters";
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

  if (isLoading) return <p className="text-muted-foreground">Memuat data stabilitas...</p>;
  if (error) return <p className="text-destructive">Error: {error.message}</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📈 Stabilitas Model</h1>
        <p className="text-muted-foreground">
          Analisis 30-seed random split untuk menguji konsistensi performa
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Hasil evaluasi dari satu random split bisa menyesatkan. Analisis ini menggunakan <strong>30 random seeds</strong> yang berbeda untuk menguji apakah performa model konsisten di berbagai pembagian data.
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ringkasan Statistik</CardTitle>
            <CardDescription>Mean ± Std dari 30 random seeds</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metrik</TableHead>
                  <TableHead>XGBoost (Mean ± Std)</TableHead>
                  <TableHead>MLP (Mean ± Std)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(data.summary).map(([metricName, models]) => (
                  <TableRow key={metricName}>
                    <TableCell className="font-medium">{metricName}</TableCell>
                    {Object.entries(models).map(([model, stats]) => (
                      <TableCell key={model}>
                        {fmtFloat(stats.mean)} ± {fmtFloat(stats.std)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
