"use client";

import { useStaticData } from "@/hooks/use-static-data";
import { CalibrationCurveChart } from "@/components/charts/calibration-curve-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtFloat } from "@/lib/formatters";
import type { CalibrationFullData } from "@/types/analysis";

export default function CalibrationPage() {
  const { data, isLoading, error } = useStaticData<CalibrationFullData>(
    "calibration",
    "/api/data/calibration"
  );

  if (isLoading) return <p className="text-muted-foreground">Memuat data kalibrasi...</p>;
  if (error) return <p className="text-destructive">Error: {error.message}</p>;
  if (!data) return null;

  const st = data.statistical_tests;
  const ca = data.cost_analysis;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📐 Kalibrasi & Statistik</h1>
        <p className="text-muted-foreground">
          Uji statistik, kalibrasi probabilitas, dan analisis biaya
        </p>
      </div>

      <Tabs defaultValue="stats">
        <TabsList>
          <TabsTrigger value="stats">Uji Statistik</TabsTrigger>
          <TabsTrigger value="calibration">Kalibrasi</TabsTrigger>
          <TabsTrigger value="cost">Analisis Biaya</TabsTrigger>
        </TabsList>

        {/* Statistical Tests */}
        <TabsContent value="stats" className="space-y-4">
          {st?.mcnemar && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">McNemar Test</CardTitle>
                <CardDescription>
                  Menguji apakah kedua model membuat error yang berbeda
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-3 text-sm">
                  <div className="rounded-md bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">χ²</p>
                    <p className="font-bold">{fmtFloat(st.mcnemar.chi2, 2)}</p>
                  </div>
                  <div className="rounded-md bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">p-value</p>
                    <p className="font-bold">
                      {st.mcnemar.p_value_corrected < 0.001
                        ? "< 0.001"
                        : fmtFloat(st.mcnemar.p_value_corrected)}
                    </p>
                  </div>
                  <div className="rounded-md bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">Signifikan?</p>
                    <Badge
                      variant={
                        st.mcnemar.p_value_corrected < 0.05
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {st.mcnemar.p_value_corrected < 0.05 ? "Ya" : "Tidak"}
                    </Badge>
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
            <Card>
              <CardHeader>
                <CardTitle className="text-base">DeLong Test</CardTitle>
                <CardDescription>
                  Menguji perbedaan AUC antara kedua model
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                  <div className="rounded-md bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">AUC XGBoost</p>
                    <p className="font-bold">{fmtFloat(st.delong.auc_xgb)}</p>
                  </div>
                  <div className="rounded-md bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">AUC MLP</p>
                    <p className="font-bold">{fmtFloat(st.delong.auc_mlp)}</p>
                  </div>
                  <div className="rounded-md bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">Δ AUC</p>
                    <p className="font-bold">{fmtFloat(st.delong.auc_diff)}</p>
                  </div>
                  <div className="rounded-md bg-muted p-3 text-center">
                    <p className="text-xs text-muted-foreground">p-value</p>
                    <p className="font-bold">
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
              <Card>
                <CardContent className="pt-4 text-sm text-muted-foreground space-y-2">
                  <p>
                    <strong>Cara membaca:</strong> Titik yang dekat garis diagonal = model terkalibrasi baik.
                  </p>
                  <p>
                    <strong>Brier Score:</strong> Semakin rendah semakin baik (0 = sempurna).
                  </p>
                  <p>
                    <strong>ECE:</strong> Semakin rendah semakin baik. Mengukur rata-rata deviasi dari kalibrasi sempurna.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Cost Analysis */}
        <TabsContent value="cost" className="space-y-4">
          {ca && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Analisis Biaya per Skenario
                </CardTitle>
                <CardDescription>
                  Biaya minimum pada berbagai rasio FP:FN
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Skenario</TableHead>
                      <TableHead>XGB Cost</TableHead>
                      <TableHead>XGB Threshold</TableHead>
                      <TableHead>MLP Cost</TableHead>
                      <TableHead>MLP Threshold</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(ca).map(([scenario, d]) => (
                      <TableRow key={scenario}>
                        <TableCell className="font-medium">
                          {scenario}
                        </TableCell>
                        <TableCell>{d["XGB-Orig"]?.min_cost ?? "N/A"}</TableCell>
                        <TableCell>
                          {d["XGB-Orig"]?.optimal_threshold?.toFixed(2) ?? "N/A"}
                        </TableCell>
                        <TableCell>{d["MLP-Aug"]?.min_cost ?? "N/A"}</TableCell>
                        <TableCell>
                          {d["MLP-Aug"]?.optimal_threshold?.toFixed(2) ?? "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
