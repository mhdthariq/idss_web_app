/**
 * Data loader — loads all JSON artifacts at startup.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { loadXGBoostModelDirect } from "./xgboost-predict";
import { loadMLPModel } from "./mlp-predict";
import type { PipelineMaps } from "./feature-engineering";

// Resolve paths relative to the project root (backend-bun/)
const DATA_DIR = join(import.meta.dir, "..", "data");
const MODELS_DIR = join(import.meta.dir, "..", "..", "models");
const PROCESSED_DIR = join(import.meta.dir, "..", "..", "data", "processed");
const FIGURES_DIR = join(import.meta.dir, "..", "..", "docs", "figures");

// Loaded data
let pipelineMaps: PipelineMaps = {};
let mlpConfig: any = null;
let shapValues: any = null;
let featureImportance: any = null;
let mlMetrics: any = null;
let calibrationMetrics: any = null;
let costAnalysis: any = null;
let statisticalTests: any = null;
let instabilityResults: any = null;
let shapComparison: any = null;

function loadJSON(path: string, label: string): any {
  if (!existsSync(path)) {
    console.log(`  ✗ ${label} not found at ${path}`);
    return null;
  }
  const data = JSON.parse(readFileSync(path, "utf-8"));
  console.log(`  ✓ ${label}`);
  return data;
}

export async function initialise(): Promise<void> {
  console.log("=" .repeat(60));
  console.log("  IDSS Backend (Bun/Elysia) — Loading artifacts");
  console.log("=".repeat(60));

  const start = performance.now();

  // Pipeline maps
  pipelineMaps =
    loadJSON(join(DATA_DIR, "pipeline_maps.json"), "pipeline_maps") ?? {};

  // XGBoost model
  const xgbJson = loadJSON(
    join(DATA_DIR, "xgb_orig_v4.json"),
    "XGBoost model"
  );
  if (xgbJson) {
    loadXGBoostModelDirect(xgbJson);
  }

  // MLP model
  mlpConfig = loadJSON(join(DATA_DIR, "mlp_v4_config.json"), "MLP config");
  const scalerJson = loadJSON(join(DATA_DIR, "mlp_scaler.json"), "MLP scaler");

  const onnxPath = join(MODELS_DIR, "mlp_v4.onnx");
  if (scalerJson && existsSync(onnxPath)) {
    try {
      await loadMLPModel(onnxPath, scalerJson);
    } catch (e) {
      console.error("  ✗ MLP ONNX load failed:", e);
    }
  }

  // Precomputed analysis data
  shapValues = loadJSON(join(DATA_DIR, "shap_values.json"), "SHAP values");
  featureImportance = loadJSON(
    join(DATA_DIR, "feature_importance_v4.json"),
    "Feature importance"
  );
  mlMetrics = loadJSON(join(DATA_DIR, "ml_metrics_v4.json"), "ML metrics");
  calibrationMetrics = loadJSON(
    join(DATA_DIR, "calibration_metrics_v4.json"),
    "Calibration metrics"
  );
  costAnalysis = loadJSON(
    join(DATA_DIR, "cost_analysis_v4.json"),
    "Cost analysis"
  );
  statisticalTests = loadJSON(
    join(DATA_DIR, "statistical_tests_v4.json"),
    "Statistical tests"
  );
  instabilityResults = loadJSON(
    join(DATA_DIR, "split_instability_results.json"),
    "Instability results"
  );
  shapComparison = loadJSON(
    join(DATA_DIR, "shap_comparison_v4.json"),
    "SHAP comparison"
  );

  const elapsed = ((performance.now() - start) / 1000).toFixed(2);
  console.log(`  Startup complete in ${elapsed}s`);
  console.log("=".repeat(60));
}

// Getters
export function getPipelineMaps(): PipelineMaps {
  return pipelineMaps;
}
export function getMLPConfig(): any {
  return mlpConfig;
}
export function getShapValues(): any {
  return shapValues;
}
export function getFeatureImportance(): any {
  return featureImportance;
}
export function getMLMetrics(): any {
  return mlMetrics;
}
export function getCalibrationMetrics(): any {
  return calibrationMetrics;
}
export function getCostAnalysis(): any {
  return costAnalysis;
}
export function getStatisticalTests(): any {
  return statisticalTests;
}
export function getInstabilityResults(): any {
  return instabilityResults;
}
export function getShapComparison(): any {
  return shapComparison;
}
export function getProcessedDir(): string {
  return PROCESSED_DIR;
}
export function getFiguresDir(): string {
  return FIGURES_DIR;
}
