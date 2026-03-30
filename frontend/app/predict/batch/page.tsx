"use client";

import { useState, useRef } from "react";
import { useBatchPrediction } from "@/hooks/use-batch-prediction";
import { DEFAULT_THRESHOLD } from "@/lib/constants";
import { riskLabel } from "@/lib/threshold-utils";
import { fmtPercent } from "@/lib/formatters";
import { ThresholdSlider } from "@/components/prediction/threshold-slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Upload, Download, FileSpreadsheet, FolderOpen, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { BatchPredictionResult } from "@/types/prediction";

export default function BatchPredictPage() {
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [result, setResult] = useState<BatchPredictionResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const batch = useBatchPrediction();

  const handleUpload = async (file: File) => {
    try {
      const res = await batch.mutateAsync(file);
      setResult(res);
    } catch { /* handled */ }
  };

  const berisiko = result
    ? result.results.filter(
        (r) =>
          riskLabel(r.xgb_probability, threshold) === "BERISIKO" ||
          riskLabel(r.mlp_probability, threshold) === "BERISIKO"
      ).length
    : 0;

  const avgProb = result
    ? result.results.reduce((s, r) => s + r.xgb_probability, 0) /
      result.results.length
    : 0;

  const handleDownload = () => {
    if (!result) return;
    const header =
      "row_index,xgb_probability,mlp_probability,xgb_label,mlp_label\n";
    const rows = result.results
      .map(
        (r) =>
          `${r.row_index},${r.xgb_probability},${r.mlp_probability},${riskLabel(r.xgb_probability, threshold)},${riskLabel(r.mlp_probability, threshold)}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "batch_results.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <FolderOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1>Prediksi Batch</h1>
            <p className="text-muted-foreground text-sm">
              Upload file CSV untuk prediksi banyak transaksi sekaligus
            </p>
          </div>
        </div>
      </div>

      <ThresholdSlider value={threshold} onChange={setThreshold} />

      {/* Upload */}
      <Card className="surface-card">
        <CardContent className="pt-6">
          <div
            className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border/60 p-10 cursor-pointer hover:bg-muted/30 hover:border-primary/40 transition-all group"
            onClick={() => fileRef.current?.click()}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 group-hover:bg-primary/10 transition-colors">
              <Upload className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-center">
              <p className="font-medium">
                Klik atau drag file CSV ke sini
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                File harus memiliki kolom yang sesuai
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
            />
          </div>
          {batch.isPending && (
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Memproses...
            </div>
          )}
          {batch.isError && (
            <p className="text-center mt-4 text-sm text-destructive">
              Error: {batch.error.message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4 stagger-children">
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card className="stat-card stat-card-blue">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{result.total_rows}</p>
              </CardContent>
            </Card>
            <Card className="stat-card stat-card-red">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                  BERISIKO
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-500">{berisiko}</p>
              </CardContent>
            </Card>
            <Card className="stat-card stat-card-green">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  LAYAK
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-500">
                  {result.total_rows - berisiko}
                </p>
              </CardContent>
            </Card>
            <Card className="stat-card stat-card-amber">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avg P(Late)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{fmtPercent(avgProb)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </div>

          {/* Results table */}
          <Card className="surface-card">
            <CardContent className="pt-6 overflow-auto max-h-[500px]">
              <div className="overflow-hidden rounded-lg border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>#</TableHead>
                      <TableHead>XGB Prob</TableHead>
                      <TableHead>MLP Prob</TableHead>
                      <TableHead>XGB Label</TableHead>
                      <TableHead>MLP Label</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.results.slice(0, 100).map((r) => (
                      <TableRow key={r.row_index} className="hover:bg-muted/20">
                        <TableCell className="tabular-nums">{r.row_index + 1}</TableCell>
                        <TableCell className="tabular-nums">{fmtPercent(r.xgb_probability)}</TableCell>
                        <TableCell className="tabular-nums">{fmtPercent(r.mlp_probability)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              riskLabel(r.xgb_probability, threshold) ===
                              "BERISIKO"
                                ? "destructive"
                                : "success"
                            }
                          >
                            {riskLabel(r.xgb_probability, threshold)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              riskLabel(r.mlp_probability, threshold) ===
                              "BERISIKO"
                                ? "destructive"
                                : "success"
                            }
                          >
                            {riskLabel(r.mlp_probability, threshold)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {result.results.length > 100 && (
                <p className="text-center text-sm text-muted-foreground mt-3">
                  Menampilkan 100 dari {result.results.length} baris
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
