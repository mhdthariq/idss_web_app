export interface ConfusionMatrix {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}

export interface Metrics {
  precision: number;
  recall: number;
  f1: number;
  accuracy: number;
}

export function riskLabel(
  prob: number,
  threshold: number,
): "LAYAK" | "BERISIKO" {
  return prob >= threshold ? "BERISIKO" : "LAYAK";
}

export function computeConfusionMatrix(
  yTrue: number[] | undefined,
  proba: number[] | undefined,
  threshold: number,
): ConfusionMatrix {
  const y = Array.isArray(yTrue) ? yTrue : [];
  const p = Array.isArray(proba) ? proba : [];
  const n = Math.min(y.length, p.length);

  let tp = 0,
    fp = 0,
    tn = 0,
    fn = 0;
  for (let i = 0; i < n; i++) {
    const predicted = p[i] >= threshold ? 1 : 0;
    if (y[i] === 1 && predicted === 1) tp++;
    else if (y[i] === 0 && predicted === 1) fp++;
    else if (y[i] === 0 && predicted === 0) tn++;
    else fn++;
  }
  return { tp, fp, tn, fn };
}

export function computeMetrics(cm: ConfusionMatrix): Metrics {
  const precision = cm.tp + cm.fp > 0 ? cm.tp / (cm.tp + cm.fp) : 0;
  const recall = cm.tp + cm.fn > 0 ? cm.tp / (cm.tp + cm.fn) : 0;
  const f1 =
    precision + recall > 0
      ? (2 * (precision * recall)) / (precision + recall)
      : 0;
  const total = cm.tp + cm.fp + cm.tn + cm.fn;
  const accuracy = total > 0 ? (cm.tp + cm.tn) / total : 0;
  return { precision, recall, f1, accuracy };
}

export function getRiskLevel(prob: number): {
  label: string;
  color: string;
} {
  if (prob < 0.4) return { label: "Rendah", color: "#22c55e" };
  if (prob < 0.7) return { label: "Sedang", color: "#f59e0b" };
  return { label: "Tinggi", color: "#ef4444" };
}

export function getThresholdDescription(threshold: number): {
  emoji: string;
  text: string;
} {
  if (threshold <= 0.3) {
    return {
      emoji: "⚠️",
      text: "Threshold sangat rendah — hampir semua transaksi ditandai BERISIKO. Recall sangat tinggi tapi precision rendah. Banyak pelanggan baik akan salah ditolak.",
    };
  }
  if (threshold <= 0.45) {
    return {
      emoji: "📊",
      text: "Threshold di bawah default — model lebih sensitif dari biasanya. Recall meningkat tapi precision menurun.",
    };
  }
  if (threshold <= 0.54) {
    return {
      emoji: "⚖️",
      text: "Threshold mendekati default (0.50) — keseimbangan antara menangkap piutang macet dan menghindari false alarm.",
    };
  }
  if (threshold <= 0.7) {
    return {
      emoji: "🎯",
      text: "Threshold di atas default — model lebih spesifik. Hanya transaksi dengan risiko jelas yang ditandai. Precision meningkat tapi recall menurun.",
    };
  }
  return {
    emoji: "🚨",
    text: "Threshold sangat tinggi — banyak piutang macet yang lolos tanpa terdeteksi. Precision tinggi tapi recall rendah. Berbahaya jika kerugian dari piutang macet besar.",
  };
}
