"use client";

import { useStaticData } from "@/hooks/use-static-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtFloat } from "@/lib/formatters";
import { Trophy, Trees, Brain } from "lucide-react";
import type { MetricsData } from "@/types/analysis";

export default function ComparisonPage() {
  const { data, isLoading, error } = useStaticData<MetricsData>(
    "metrics",
    "/api/data/metrics"
  );

  if (isLoading)
    return (
      <div className="skeleton-page p-4">
        <div className="skeleton skeleton-header" />
        <div className="skeleton h-48 w-full" />
        <div className="skeleton h-48 w-full" />
      </div>
    );
  if (error) return <p className="text-destructive">Error: {error.message}</p>;
  if (!data) return null;

  const experiments = data.experiments ?? {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1>Perbandingan Model</h1>
            <p className="text-muted-foreground text-sm">
              Perbandingan performa XGBoost vs MLP di berbagai strategi data
            </p>
          </div>
        </div>
      </div>

      {/* Per-experiment tables */}
      {Object.entries(experiments).map(([expKey, exp]) => {
        const models = Object.entries(exp.models);
        // Find best AUC/F1 per experiment
        let bestAuc = "";
        let bestF1 = "";
        let maxAuc = -1;
        let maxF1 = -1;
        for (const [k, v] of models) {
          const auc = v.test_default.auc_roc ?? v.test_default.auc ?? 0;
          const f1 = v.test_default.f1 ?? 0;
          if (auc > maxAuc) { maxAuc = auc; bestAuc = k; }
          if (f1 > maxF1) { maxF1 = f1; bestF1 = k; }
        }

        return (
          <Card key={expKey} className="surface-card">
            <CardHeader>
              <CardTitle className="text-base">Experiment: {expKey}</CardTitle>
              <CardDescription>Metrik pada default threshold</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Model</TableHead>
                      <TableHead>AUC-ROC</TableHead>
                      <TableHead>Precision</TableHead>
                      <TableHead>Recall</TableHead>
                      <TableHead>F1</TableHead>
                      <TableHead>Threshold</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {models.map(([modelKey, modelData]) => {
                      const m = modelData.test_default;
                      const auc = m.auc_roc ?? m.auc ?? 0;
                      const f1 = m.f1 ?? 0;
                      return (
                        <TableRow key={modelKey} className="hover:bg-muted/20">
                          <TableCell className="font-medium">{modelKey}</TableCell>
                          <TableCell className="tabular-nums">
                            <span className={modelKey === bestAuc ? "text-emerald-500 font-bold" : ""}>
                              {fmtFloat(auc)}
                            </span>
                            {modelKey === bestAuc && <span className="ml-1 text-[10px] text-emerald-500">★</span>}
                          </TableCell>
                          <TableCell className="tabular-nums">{fmtFloat(m.precision ?? 0)}</TableCell>
                          <TableCell className="tabular-nums">{fmtFloat(m.recall ?? 0)}</TableCell>
                          <TableCell className="tabular-nums">
                            <span className={modelKey === bestF1 ? "text-emerald-500 font-bold" : ""}>
                              {fmtFloat(f1)}
                            </span>
                            {modelKey === bestF1 && <span className="ml-1 text-[10px] text-emerald-500">★</span>}
                          </TableCell>
                          <TableCell className="tabular-nums">{modelData.threshold.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Trade-off explanation */}
      <Card className="surface-card border-amber-500/20 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/40 to-transparent" />
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            ⚖️ Trade-off XGBoost vs MLP
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/10 p-4">
              <p className="font-semibold text-foreground mb-1.5 flex items-center gap-2">
                <Trees className="h-4 w-4 text-emerald-500" />
                XGBoost
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li>AUC-ROC lebih tinggi</li>
                <li>Precision lebih tinggi (sedikit false alarm)</li>
                <li>Kalibrasi lebih baik</li>
                <li>Lebih stabil di berbagai random split</li>
              </ul>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-50/30 dark:bg-rose-950/10 p-4">
              <p className="font-semibold text-foreground mb-1.5 flex items-center gap-2">
                <Brain className="h-4 w-4 text-rose-500" />
                MLP
              </p>
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
