export interface CurveData {
  fpr?: number[];
  tpr?: number[];
  auc?: number;
  precision?: number[];
  recall?: number[];
  ap?: number;
}

export interface TestSetData {
  n_samples: number;
  y_true: number[];
  xgb_probabilities: number[];
  mlp_probabilities: number[];
  roc_curve: {
    xgboost: CurveData;
    mlp: CurveData;
  };
  pr_curve: {
    xgboost: CurveData;
    mlp: CurveData;
  };
}

export interface StabilityResult {
  seed: number;
  [key: string]: number;
}

export interface StabilitySummary {
  [metricGroup: string]: {
    [model: string]: {
      mean: number;
      std: number;
      min: number;
      max: number;
      ci_lower?: number;
      ci_upper?: number;
    };
  };
}

export interface InstabilityData {
  results: StabilityResult[];
  summary: StabilitySummary;
  json_data?: {
    win_rates?: Record<string, { xgb_wins: number; mlp_wins: number; ties?: number }>;
    original_v4_results?: Record<string, number>;
    summary?: StabilitySummary;
  };
}

export interface ModelExperimentMetrics {
  test_default: Record<string, number>;
  test_optimized: Record<string, number>;
  threshold: number;
}

export interface MetricsData {
  experiments: Record<string, {
    models: Record<string, ModelExperimentMetrics>;
  }>;
  best_model?: string;
  best_auc?: number;
  best_threshold?: number;
}

export interface ShapData {
  feature_importance: Record<string, { feature: string; importance: number }[]>;
  shap_values: {
    shap_values: number[][];
    features: string[];
  };
}

export interface CalibrationModelData {
  brier_score: number;
  ece: number;
  calibration_curve_x: number[];
  calibration_curve_y: number[];
}

export interface StatisticalTests {
  mcnemar: {
    contingency: number[][];
    chi2: number;
    p_value_corrected: number;
  };
  delong: {
    auc_xgb: number;
    auc_mlp: number;
    auc_diff: number;
    z_statistic: number;
    p_value: number;
  };
}

export interface CostScenario {
  fp_cost: number;
  fn_cost: number;
  "XGB-Orig": { min_cost: number; optimal_threshold: number };
  "MLP-Aug": { min_cost: number; optimal_threshold: number };
}

export interface CalibrationFullData {
  calibration: {
    xgb_orig: CalibrationModelData;
    mlp_aug: CalibrationModelData;
  };
  statistical_tests: StatisticalTests;
  cost_analysis: Record<string, CostScenario>;
}
