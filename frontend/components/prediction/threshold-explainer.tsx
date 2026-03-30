"use client";

import { useState } from "react";
import { ChevronDown, Info, ShieldAlert, Target } from "lucide-react";

export function ThresholdExplainer() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border bg-card surface-card overflow-hidden">
      <button
        className="flex w-full items-center gap-2.5 p-3.5 text-sm font-medium text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <Info className="h-4 w-4 text-blue-500 shrink-0" />
        <span>Apa itu Ambang Batas (Threshold)?</span>
        <ChevronDown
          className={`ml-auto h-4 w-4 text-muted-foreground transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-muted-foreground space-y-3 animate-slide-down">
          <p>
            Model menghasilkan <strong className="text-foreground">probabilitas</strong> (0%–100%) bahwa
            transaksi akan terlambat dibayar. Ambang batas menentukan kapan
            probabilitas tersebut dianggap &quot;cukup tinggi&quot; untuk ditandai
            sebagai BERISIKO.
          </p>
          <div className="rounded-lg bg-muted/40 p-3 space-y-1.5 border border-border/50">
            <p className="font-medium text-foreground text-xs uppercase tracking-wider">
              Contoh: Transaksi dengan P(Late) = 42%
            </p>
            <ul className="space-y-1 text-xs">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                Threshold 0.30 → 42% ≥ 30% → ⚠️ BERISIKO
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                Threshold 0.50 → 42% &lt; 50% → ✅ LAYAK
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                Threshold 0.70 → 42% &lt; 70% → ✅ LAYAK
              </li>
            </ul>
            <p className="text-xs mt-1.5 italic">
              Probabilitas tidak berubah — hanya keputusan yang berubah.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20 p-3">
              <p className="font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-1.5 mb-1.5">
                <ShieldAlert className="h-3.5 w-3.5" />
                Threshold Rendah (0.2–0.3)
              </p>
              <ul className="space-y-0.5 text-amber-900/70 dark:text-amber-200/70">
                <li>• Lebih banyak ditandai BERISIKO</li>
                <li>• Protektif — tangkap semua risiko</li>
                <li>• ⚠️ Banyak false alarm</li>
              </ul>
            </div>
            <div className="rounded-lg border border-blue-500/30 bg-blue-50/60 dark:bg-blue-950/20 p-3">
              <p className="font-semibold text-blue-800 dark:text-blue-400 flex items-center gap-1.5 mb-1.5">
                <Target className="h-3.5 w-3.5" />
                Threshold Tinggi (0.7–0.8)
              </p>
              <ul className="space-y-0.5 text-blue-900/70 dark:text-blue-200/70">
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
