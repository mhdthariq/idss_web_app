/**
 * Data loader — loads all JSON artifacts at startup.
 * Uses __dirname for Node.js/Vercel compatibility.
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { loadXGBoostModelDirect } from "./xgboost-predict";
import { loadMLPModel } from "./mlp-predict";
import type { PipelineMaps } from "./feature-engineering";

// Resolve paths — works in both Bun and Node.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, "..", "data");
const MODELS_DIR = join(__dirname, "..", "..", "models");
const PROCESSED_DIR = join(__dirname, "..", "..", "data", "processed");
const FIGURES_DIR = join(__dirname, "..", "..", "docs", "figures");

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
let _initialised = false;

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
  if (_initialised) return;

  console.log("=".repeat(60));
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

  // MLP model — pure TypeScript, loads JSON weights (no ONNX runtime needed)
  mlpConfig = loadJSON(join(DATA_DIR, "mlp_v4_config.json"), "MLP config");
  const scalerJson = loadJSON(join(DATA_DIR, "mlp_scaler.json"), "MLP scaler");

  const weightsPath = join(DATA_DIR, "mlp_weights.json");
  if (scalerJson && existsSync(weightsPath)) {
    try {
      await loadMLPModel(weightsPath, scalerJson);
    } catch (e) {
      console.error("  ✗ MLP weights load failed:", e);
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

  _initialised = true;
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
