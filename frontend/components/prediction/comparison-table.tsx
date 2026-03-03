"use client";

import { riskLabel, getRiskLevel } from "@/lib/threshold-utils";
import { fmtPercent } from "@/lib/formatters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ComparisonTableProps {
  xgbProb: number;
  mlpProb: number;
  threshold: number;
}

export function ComparisonTable({
  xgbProb,
  mlpProb,
  threshold,
}: ComparisonTableProps) {
  const xgbLabel = riskLabel(xgbProb, threshold);
  const mlpLabel = riskLabel(mlpProb, threshold);
  const xgbRisk = getRiskLevel(xgbProb);
  const mlpRisk = getRiskLevel(mlpProb);

  const rows = [
    {
      aspect: "Probabilitas",
      xgb: fmtPercent(xgbProb),
      mlp: fmtPercent(mlpProb),
    },
    {
      aspect: "Status Kelayakan",
      xgb: `${xgbLabel === "BERISIKO" ? "⚠️" : "✅"} ${xgbLabel}`,
      mlp: `${mlpLabel === "BERISIKO" ? "⚠️" : "✅"} ${mlpLabel}`,
    },
    {
      aspect: `Di atas Threshold (${fmtPercent(threshold, 0)})`,
      xgb: xgbProb >= threshold ? "Ya" : "Tidak",
      mlp: mlpProb >= threshold ? "Ya" : "Tidak",
    },
    {
      aspect: "Tingkat Risiko",
      xgb: xgbRisk.label,
      mlp: mlpRisk.label,
    },
  ];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Aspek</TableHead>
          <TableHead>🌲 XGBoost</TableHead>
          <TableHead>🧠 MLP</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.aspect}>
            <TableCell className="font-medium">{row.aspect}</TableCell>
            <TableCell>{row.xgb}</TableCell>
            <TableCell>{row.mlp}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
