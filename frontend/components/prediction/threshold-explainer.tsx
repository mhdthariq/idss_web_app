"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";

export function ThresholdExplainer() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border bg-card">
      <button
        className="flex w-full items-center gap-2 p-3 text-sm font-medium text-left hover:bg-muted/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <Info className="h-4 w-4 text-blue-500" />
        <span>ℹ️ Apa itu Ambang Batas (Threshold)?</span>
        {open ? (
          <ChevronUp className="ml-auto h-4 w-4" />
        ) : (
          <ChevronDown className="ml-auto h-4 w-4" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-muted-foreground space-y-3">
          <p>
            Model menghasilkan <strong>probabilitas</strong> (0%–100%) bahwa
            transaksi akan terlambat dibayar. Ambang batas menentukan kapan
            probabilitas tersebut dianggap &quot;cukup tinggi&quot; untuk ditandai
            sebagai BERISIKO.
          </p>
          <div className="rounded-md bg-muted p-3 space-y-1">
            <p className="font-medium text-foreground">
              Contoh: Transaksi dengan P(Late) = 42%
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>Threshold 0.30 → 42% ≥ 30% → ⚠️ BERISIKO</li>
              <li>Threshold 0.50 → 42% &lt; 50% → ✅ LAYAK</li>
              <li>Threshold 0.70 → 42% &lt; 70% → ✅ LAYAK</li>
            </ul>
            <p className="text-xs mt-1">
              <strong>Probabilitas tidak berubah.</strong> Hanya keputusan yang
              berubah.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-2">
              <p className="font-semibold text-amber-800 dark:text-amber-400">
                Threshold Rendah (0.2–0.3)
              </p>
              <ul className="mt-1 space-y-0.5">
                <li>• Lebih banyak ditandai BERISIKO</li>
                <li>• Protektif — tangkap semua risiko</li>
                <li>• ⚠️ Banyak false alarm</li>
              </ul>
            </div>
            <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-2">
              <p className="font-semibold text-blue-800 dark:text-blue-400">
                Threshold Tinggi (0.7–0.8)
              </p>
              <ul className="mt-1 space-y-0.5">
                <li>• Lebih sedikit ditandai BERISIKO</li>
                <li>• Agresif — hanya risiko tinggi</li>
                <li>• ⚠️ Beberapa piutang macet lolos</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
