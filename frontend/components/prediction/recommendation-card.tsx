"use client";

import { riskLabel } from "@/lib/threshold-utils";
import { fmtPercent } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  let emoji: string;
  let title: string;
  let desc: string;
  let variant: string;

  if (agree && xgbLabel === "LAYAK") {
    emoji = "✅";
    title = "Kedua model menyatakan LAYAK";
    desc = `XGBoost: ${fmtPercent(xgbProb)} dan MLP: ${fmtPercent(mlpProb)} — keduanya di bawah threshold ${fmtPercent(threshold, 0)}. Transaksi ini memiliki risiko rendah keterlambatan pembayaran.`;
    variant = "border-green-500/50 bg-green-50 dark:bg-green-950/20";
  } else if (agree && xgbLabel === "BERISIKO") {
    emoji = "🔴";
    title = "Kedua model menyatakan BERISIKO";
    desc = `XGBoost: ${fmtPercent(xgbProb)} dan MLP: ${fmtPercent(mlpProb)} — keduanya di atas threshold ${fmtPercent(threshold, 0)}. Transaksi ini memiliki risiko tinggi keterlambatan pembayaran. Disarankan untuk melakukan review lebih lanjut.`;
    variant = "border-red-500/50 bg-red-50 dark:bg-red-950/20";
  } else {
    emoji = "🔶";
    title = "Model tidak sepakat";
    desc = `XGBoost: ${fmtPercent(xgbProb)} (${xgbLabel}), MLP: ${fmtPercent(mlpProb)} (${mlpLabel}). Diperlukan pertimbangan manajer lebih lanjut. MLP cenderung lebih sensitif (recall lebih tinggi) sementara XGBoost lebih spesifik (precision lebih tinggi).`;
    variant = "border-amber-500/50 bg-amber-50 dark:bg-amber-950/20";
  }

  return (
    <Card className={variant}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <span>{emoji}</span>
          <span>Rekomendasi</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-semibold text-sm mb-1">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </CardContent>
    </Card>
  );
}
