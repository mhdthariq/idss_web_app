export interface PredictionInput {
  jumlah: number;
  kode_customer: string;
  nama_salesman: string;
  nama_divisi: string;
  nama_kategori: string;
  nama_sub_kategori: string;
  kode_cabang: string;
  provinsi: string;
  kota: string;
  kecamatan: string;
  nama_group_customer: string;
  keterangan: string;
}

export interface ShapFeature {
  feature: string;
  shap_value: number;
  feature_value: number | string | null;
}

export interface ShapExplanation {
  base_value: number;
  top_features: ShapFeature[];
}

export interface PredictionResult {
  prediction_id: string;
  timestamp: string;
  input_summary: {
    jumlah: number;
    customer: string;
    divisi: string;
  };
  xgboost: {
    probability: number;
  };
  mlp: {
    probability: number;
  };
  shap_explanation: {
    xgboost: ShapExplanation;
  };
  feature_vector: Record<string, number | string>;
}

export interface BatchResultItem {
  row_index: number;
  xgb_probability: number;
  mlp_probability: number;
}

export interface BatchPredictionResult {
  total_rows: number;
  processed_rows: number;
  results: BatchResultItem[];
}

export interface UniqueValues {
  kode_customer: string[];
  nama_salesman: string[];
  nama_divisi: string[];
  nama_kategori: string[];
  nama_sub_kategori: string[];
  kode_cabang: string[];
  provinsi: string[];
  kota: string[];
  kecamatan: string[];
  nama_group_customer: string[];
}
