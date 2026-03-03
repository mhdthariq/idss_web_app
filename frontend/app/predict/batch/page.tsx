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
import { Upload, Download, FileSpreadsheet } from "lucide-react";
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
      <div>
        <h1 className="text-2xl font-bold">📂 Prediksi Batch</h1>
        <p className="text-muted-foreground">
          Upload file CSV untuk prediksi banyak transaksi sekaligus
        </p>
      </div>

      <ThresholdSlider value={threshold} onChange={setThreshold} />

      {/* Upload */}
      <Card>
        <CardContent className="pt-6">
          <div
            className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">
                Klik atau drag file CSV ke sini
              </p>
              <p className="text-sm text-muted-foreground">
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
            <p className="text-center mt-4 text-sm text-muted-foreground">
              Memproses...
            </p>
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
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{result.total_rows}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">⚠️ BERISIKO</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-500">{berisiko}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">✅ LAYAK</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-500">
                  {result.total_rows - berisiko}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Avg P(Late)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmtPercent(avgProb)}</p>
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
          <Card>
            <CardContent className="pt-6 overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>XGB Prob</TableHead>
                    <TableHead>MLP Prob</TableHead>
                    <TableHead>XGB Label</TableHead>
                    <TableHead>MLP Label</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.results.slice(0, 100).map((r) => (
                    <TableRow key={r.row_index}>
                      <TableCell>{r.row_index + 1}</TableCell>
                      <TableCell>{fmtPercent(r.xgb_probability)}</TableCell>
                      <TableCell>{fmtPercent(r.mlp_probability)}</TableCell>
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
              {result.results.length > 100 && (
                <p className="text-center text-sm text-muted-foreground mt-2">
                  Menampilkan 100 dari {result.results.length} baris
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
