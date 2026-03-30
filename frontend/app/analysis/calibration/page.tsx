"use client";

import { useStaticData } from "@/hooks/use-static-data";
import { CalibrationCurveChart } from "@/components/charts/calibration-curve-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtFloat } from "@/lib/formatters";
import { Ruler, FlaskConical, Target, Coins } from "lucide-react";
import type { CalibrationFullData } from "@/types/analysis";

export default function CalibrationPage() {
  const { data, isLoading, error } = useStaticData<CalibrationFullData>(
    "calibration",
    "/api/data/calibration"
  );

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

  const st = data.statistical_tests;
  const ca = data.cost_analysis;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Ruler className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1>Kalibrasi & Statistik</h1>
            <p className="text-muted-foreground text-sm">
              Uji statistik, kalibrasi probabilitas, dan analisis biaya
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="stats">
        <TabsList>
          <TabsTrigger value="stats" className="gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" />
            Uji Statistik
          </TabsTrigger>
          <TabsTrigger value="calibration" className="gap-1.5">
            <Target className="h-3.5 w-3.5" />
            Kalibrasi
          </TabsTrigger>
          <TabsTrigger value="cost" className="gap-1.5">
            <Coins className="h-3.5 w-3.5" />
            Analisis Biaya
          </TabsTrigger>
        </TabsList>

        {/* Statistical Tests */}
        <TabsContent value="stats" className="space-y-4">
          {st?.mcnemar && (
            <Card className="surface-card">
              <CardHeader>
                <CardTitle className="text-base">McNemar Test</CardTitle>
                <CardDescription>
                  Menguji apakah kedua model membuat error yang berbeda
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3 text-sm stagger-children">
                  <div className="rounded-xl bg-muted/40 p-4 text-center border border-border/50">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">χ²</p>
                    <p className="font-bold text-xl mt-1 tabular-nums">{fmtFloat(st.mcnemar.chi2, 2)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-4 text-center border border-border/50">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">p-value</p>
                    <p className="font-bold text-xl mt-1 tabular-nums">
                      {st.mcnemar.p_value_corrected < 0.001
                        ? "< 0.001"
                        : fmtFloat(st.mcnemar.p_value_corrected)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-4 text-center border border-border/50">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Signifikan?</p>
                    <div className="mt-2">
                      <Badge
                        variant={
                          st.mcnemar.p_value_corrected < 0.05
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-sm"
                      >
                        {st.mcnemar.p_value_corrected < 0.05 ? "Ya" : "Tidak"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {st.mcnemar.p_value_corrected < 0.05
                    ? "→ Model membuat error yang berbeda secara signifikan."
                    : "→ Tidak ada perbedaan signifikan dalam pola error."}
                </p>
              </CardContent>
            </Card>
          )}

          {st?.delong && (
            <Card className="surface-card">
              <CardHeader>
                <CardTitle className="text-base">DeLong Test</CardTitle>
                <CardDescription>
                  Menguji perbedaan AUC antara kedua model
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm stagger-children">
                  <div className="rounded-xl bg-muted/40 p-4 text-center border border-border/50">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">AUC XGBoost</p>
                    <p className="font-bold text-xl mt-1 tabular-nums">{fmtFloat(st.delong.auc_xgb)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-4 text-center border border-border/50">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">AUC MLP</p>
                    <p className="font-bold text-xl mt-1 tabular-nums">{fmtFloat(st.delong.auc_mlp)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-4 text-center border border-border/50">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Δ AUC</p>
                    <p className="font-bold text-xl mt-1 tabular-nums">{fmtFloat(st.delong.auc_diff)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-4 text-center border border-border/50">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">p-value</p>
                    <p className="font-bold text-xl mt-1 tabular-nums">
                      {st.delong.p_value < 0.001
                        ? "< 0.001"
                        : fmtFloat(st.delong.p_value)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Calibration */}
        <TabsContent value="calibration" className="space-y-4">
          {data.calibration && (
            <>
              <CalibrationCurveChart
                xgb={data.calibration.xgb_orig}
                mlp={data.calibration.mlp_aug}
              />
              <Card className="surface-card">
                <CardContent className="pt-4 text-sm text-muted-foreground space-y-2">
                  <p>
                    <strong className="text-foreground">Cara membaca:</strong> Titik yang dekat garis diagonal = model terkalibrasi baik.
                  </p>
                  <p>
                    <strong className="text-foreground">Brier Score:</strong> Semakin rendah semakin baik (0 = sempurna).
                  </p>
                  <p>
                    <strong className="text-foreground">ECE:</strong> Semakin rendah semakin baik. Mengukur rata-rata deviasi dari kalibrasi sempurna.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Cost Analysis */}
        <TabsContent value="cost" className="space-y-4">
          {ca && (
            <Card className="surface-card">
              <CardHeader>
                <CardTitle className="text-base">
                  Analisis Biaya per Skenario
                </CardTitle>
                <CardDescription>
                  Biaya minimum pada berbagai rasio FP:FN
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border border-border/60">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Skenario</TableHead>
                        <TableHead>XGB Cost</TableHead>
                        <TableHead>XGB Threshold</TableHead>
                        <TableHead>MLP Cost</TableHead>
                        <TableHead>MLP Threshold</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(ca).map(([scenario, d]) => (
                        <TableRow key={scenario} className="hover:bg-muted/20">
                          <TableCell className="font-medium">
                            {scenario}
                          </TableCell>
                          <TableCell className="tabular-nums">{d["XGB-Orig"]?.min_cost ?? "N/A"}</TableCell>
                          <TableCell className="tabular-nums">
                            {d["XGB-Orig"]?.optimal_threshold?.toFixed(2) ?? "N/A"}
                          </TableCell>
                          <TableCell className="tabular-nums">{d["MLP-Aug"]?.min_cost ?? "N/A"}</TableCell>
                          <TableCell className="tabular-nums">
                            {d["MLP-Aug"]?.optimal_threshold?.toFixed(2) ?? "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
