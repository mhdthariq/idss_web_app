"use client";

import { riskLabel } from "@/lib/threshold-utils";
import { fmtPercent } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";

interface RecommendationCardProps {
  xgbProb: number;
  mlpProb: number;
  threshold: number;
}

export function RecommendationCard({
  xgbProb,
  mlpProb,
  threshold,
}: RecommendationCardProps) {
  const xgbLabel = riskLabel(xgbProb, threshold);
  const mlpLabel = riskLabel(mlpProb, threshold);
  const agree = xgbLabel === mlpLabel;

  let Icon: typeof ShieldCheck;
  let title: string;
  let desc: string;
  let borderColor: string;
  let bgClass: string;
  let iconColor: string;
  let accentGradient: string;

  if (agree && xgbLabel === "LAYAK") {
    Icon = ShieldCheck;
    title = "Kedua model menyatakan LAYAK";
    desc = `XGBoost: ${fmtPercent(xgbProb)} dan MLP: ${fmtPercent(mlpProb)} — keduanya di bawah threshold ${fmtPercent(threshold, 0)}. Transaksi ini memiliki risiko rendah keterlambatan pembayaran.`;
    borderColor = "border-green-500/40";
    bgClass = "bg-green-50/60 dark:bg-green-950/15";
    iconColor = "text-green-500";
    accentGradient = "from-green-500/10 to-transparent";
  } else if (agree && xgbLabel === "BERISIKO") {
    Icon = ShieldAlert;
    title = "Kedua model menyatakan BERISIKO";
    desc = `XGBoost: ${fmtPercent(xgbProb)} dan MLP: ${fmtPercent(mlpProb)} — keduanya di atas threshold ${fmtPercent(threshold, 0)}. Transaksi ini memiliki risiko tinggi keterlambatan pembayaran. Disarankan untuk melakukan review lebih lanjut.`;
    borderColor = "border-red-500/40";
    bgClass = "bg-red-50/60 dark:bg-red-950/15";
    iconColor = "text-red-500";
    accentGradient = "from-red-500/10 to-transparent";
  } else {
    Icon = ShieldQuestion;
    title = "Model tidak sepakat";
    desc = `XGBoost: ${fmtPercent(xgbProb)} (${xgbLabel}), MLP: ${fmtPercent(mlpProb)} (${mlpLabel}). Diperlukan pertimbangan manajer lebih lanjut. MLP cenderung lebih sensitif (recall lebih tinggi) sementara XGBoost lebih spesifik (precision lebih tinggi).`;
    borderColor = "border-amber-500/40";
    bgClass = "bg-amber-50/60 dark:bg-amber-950/15";
    iconColor = "text-amber-500";
    accentGradient = "from-amber-500/10 to-transparent";
  }

  return (
    <Card
      className={`${borderColor} ${bgClass} overflow-hidden relative animate-in`}
      style={{ animationDelay: "300ms" }}
    >
      {/* Accent gradient strip at top */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accentGradient}`} />

      <CardContent className="pt-5 pb-5">
        <div className="flex gap-4">
          {/* Icon */}
          <div className={`shrink-0 mt-0.5 ${iconColor}`}>
            <div className="rounded-xl bg-white/60 dark:bg-white/5 p-2.5 shadow-sm">
              <Icon className="h-6 w-6" />
            </div>
          </div>

          {/* Content */}
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Rekomendasi
              </span>
            </div>
            <p className="font-semibold text-sm">{title}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {desc}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
