export const CHART_COLORS = {
  xgboost: "hsl(221, 83%, 53%)",     // blue
  mlp: "hsl(24, 95%, 53%)",          // orange
  positive: "hsl(142, 71%, 45%)",    // green
  negative: "hsl(0, 84%, 60%)",      // red
  neutral: "hsl(215, 14%, 60%)",     // gray
  threshold: "hsl(0, 84%, 60%)",     // red dashed
  diagonal: "hsl(215, 14%, 60%)",    // gray dashed
} as const;

export const MODEL_LABELS: Record<string, string> = {
  xgboost: "XGBoost",
  mlp: "MLP (Neural Network)",
  "XGB-Orig": "XGBoost (Original)",
  "XGB-Aug": "XGBoost (Augmented)",
  "MLP-Aug": "MLP (Augmented)",
  "RF-Aug": "Random Forest (Augmented)",
  "LGBM-Aug": "LightGBM (Augmented)",
  "RF-Orig": "Random Forest (Original)",
  "LGBM-Orig": "LightGBM (Original)",
  "XGB-Wt": "XGBoost (Weighted)",
  "RF-Wt": "Random Forest (Weighted)",
  "LGBM-Wt": "LightGBM (Weighted)",
  "MLP-Wt": "MLP (Weighted)",
};

export function fmtPct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function fmtChartFloat(value: number, decimals = 4): string {
  return value.toFixed(decimals);
}
