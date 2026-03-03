"use client";

import { useStaticData } from "@/hooks/use-static-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtFloat } from "@/lib/formatters";
import type { MetricsData } from "@/types/analysis";

export default function ComparisonPage() {
  const { data, isLoading, error } = useStaticData<MetricsData>(
    "metrics",
    "/api/data/metrics"
  );

  if (isLoading) return <p className="text-muted-foreground">Memuat data perbandingan...</p>;
  if (error) return <p className="text-destructive">Error: {error.message}</p>;
  if (!data) return null;

  const experiments = data.experiments ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🏆 Perbandingan Model</h1>
        <p className="text-muted-foreground">
          Perbandingan performa XGBoost vs MLP di berbagai strategi data
        </p>
      </div>

      {/* Per-experiment tables */}
      {Object.entries(experiments).map(([expKey, exp]) => (
        <Card key={expKey}>
          <CardHeader>
            <CardTitle className="text-base">Experiment: {expKey}</CardTitle>
            <CardDescription>Metrik pada default threshold</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>AUC-ROC</TableHead>
                  <TableHead>Precision</TableHead>
                  <TableHead>Recall</TableHead>
                  <TableHead>F1</TableHead>
                  <TableHead>Threshold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(exp.models).map(([modelKey, modelData]) => {
                  const m = modelData.test_default;
                  return (
                    <TableRow key={modelKey}>
                      <TableCell className="font-medium">{modelKey}</TableCell>
                      <TableCell>{fmtFloat(m.auc_roc ?? m.auc ?? 0)}</TableCell>
                      <TableCell>{fmtFloat(m.precision ?? 0)}</TableCell>
                      <TableCell>{fmtFloat(m.recall ?? 0)}</TableCell>
                      <TableCell>{fmtFloat(m.f1 ?? 0)}</TableCell>
                      <TableCell>{modelData.threshold.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {/* Trade-off explanation */}
      <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10">
        <CardHeader>
          <CardTitle className="text-base">⚖️ Trade-off XGBoost vs MLP</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="font-semibold text-foreground mb-1">🌲 XGBoost</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>AUC-ROC lebih tinggi</li>
                <li>Precision lebih tinggi (sedikit false alarm)</li>
                <li>Kalibrasi lebih baik</li>
                <li>Lebih stabil di berbagai random split</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">🧠 MLP</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Recall lebih tinggi (tangkap lebih banyak piutang macet)</li>
                <li>F1 Score lebih tinggi</li>
                <li>Mendeteksi pola non-linear</li>
                <li>Melengkapi XGBoost dalam dual-model</li>
              </ul>
            </div>
          </div>
          <p className="mt-3 text-xs italic">
            Inilah mengapa sistem menggunakan <strong>kedua model</strong> — untuk memberikan perspektif yang lebih lengkap kepada pengambil keputusan.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
