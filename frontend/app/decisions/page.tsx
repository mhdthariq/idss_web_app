"use client";

import { useState } from "react";
import { useDecisionLogStore } from "@/stores/decision-log-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fmtPercent, fmtRupiah } from "@/lib/formatters";
import { Download, Trash2, ClipboardList, AlertTriangle, BarChart3, FileText } from "lucide-react";

export default function DecisionsPage() {
  const { entries, clearAll } = useDecisionLogStore();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const totalPredictions = entries.length;
  const highRisk = entries.filter(
    (e) => e.xgb_label === "BERISIKO" || e.mlp_label === "BERISIKO",
  ).length;
  const avgProb =
    totalPredictions > 0
      ? entries.reduce((s, e) => s + e.xgb_probability, 0) / totalPredictions
      : 0;

  const handleDownload = () => {
    const header =
      "timestamp,jumlah,customer,xgb_probability,mlp_probability,threshold,xgb_label,mlp_label\n";
    const rows = entries
      .map(
        (e) =>
          `${e.timestamp},${e.jumlah},${e.kode_customer},${e.xgb_probability},${e.mlp_probability ?? ""},${e.threshold},${e.xgb_label},${e.mlp_label ?? ""}`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "decision_log.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-shell space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1>Log keputusan</h1>
            <p className="text-muted-foreground text-sm">
              Riwayat prediksi tersimpan di browser (localStorage) — bertahan saat refresh
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3 stagger-children">
        <Card className="stat-card stat-card-blue">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-blue-500" />
              Total Prediksi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalPredictions}</p>
          </CardContent>
        </Card>
        <Card className="stat-card stat-card-red">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              High Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-500">{highRisk}</p>
          </CardContent>
        </Card>
        <Card className="stat-card stat-card-amber">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-amber-500" />
              Avg P(Late)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{fmtPercent(avgProb)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={handleDownload}
          disabled={entries.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </Button>
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" disabled={entries.length === 0}>
              <Trash2 className="h-4 w-4 mr-2" />
              Hapus Semua
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hapus Semua Log?</DialogTitle>
              <DialogDescription>
                Tindakan ini tidak dapat dibatalkan. Semua {entries.length}{" "}
                entri akan dihapus.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  clearAll();
                  setConfirmOpen(false);
                }}
              >
                Hapus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      {entries.length === 0 ? (
        <Card className="surface-card flex items-center justify-center py-16">
          <CardContent className="text-center text-muted-foreground">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60 mb-4">
              <ClipboardList className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <p className="text-2xl font-medium mb-2 text-foreground">
              Belum ada riwayat prediksi
            </p>
            <p>Buat prediksi di halaman Prediksi Risiko untuk mulai mencatat</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="surface-card">
          <CardContent className="pt-6 overflow-auto">
            <div className="overflow-hidden rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Waktu</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>XGB</TableHead>
                    <TableHead>MLP</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>XGB Label</TableHead>
                    <TableHead>MLP Label</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id} className="hover:bg-muted/20">
                      <TableCell className="text-xs whitespace-nowrap tabular-nums">
                        {new Date(e.timestamp).toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="tabular-nums">{fmtRupiah(e.jumlah)}</TableCell>
                      <TableCell>{e.kode_customer}</TableCell>
                      <TableCell className="tabular-nums">{fmtPercent(e.xgb_probability)}</TableCell>
                      <TableCell className="tabular-nums">
                        {e.mlp_probability != null
                          ? fmtPercent(e.mlp_probability)
                          : "-"}
                      </TableCell>
                      <TableCell className="tabular-nums">{fmtPercent(e.threshold, 0)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            e.xgb_label === "BERISIKO" ? "destructive" : "success"
                          }
                        >
                          {e.xgb_label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {e.mlp_label ? (
                          <Badge
                            variant={
                              e.mlp_label === "BERISIKO"
                                ? "destructive"
                                : "success"
                            }
                          >
                            {e.mlp_label}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
