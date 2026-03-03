export interface DecisionLogEntry {
  id: string;
  timestamp: string;
  jumlah: number;
  kode_customer: string;
  xgb_probability: number;
  mlp_probability: number | null;
  threshold: number;
  xgb_label: string;
  mlp_label: string | null;
}
