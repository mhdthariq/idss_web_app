/**
 * Data loader — loads all JSON artifacts at startup.
 *
 * Path resolution strategy:
 *   - When running locally (bun run dev): __dirname = src/, data is at ../data
 *   - When bundled for Vercel (api/index.js): __dirname = api/, data is at ../data
 *   - Both cases resolve to <project_root>/data via join(__dirname, "..", "data")
 *
 * We also try process.cwd() + "/data" as a fallback, which works when
 * Vercel sets the working directory to the project root.
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { loadXGBoostModelDirect, type XGBModelJson } from "./xgboost-predict";
import { loadMLPModel } from "./mlp-predict";
import type { PipelineMaps } from "./feature-engineering";

// --- Typed interfaces for loaded JSON artifacts ---

interface CalibrationMetrics {
  [model: string]: {
    brier_score?: number;
    log_loss?: number;
    ece?: number;
    [key: string]: unknown;
  };
}

interface CostAnalysis {
  thresholds?: number[];
  costs?: number[];
  optimal_threshold?: number;
  [key: string]: unknown;
}

interface StatisticalTests {
  [testName: string]: {
    statistic?: number;
    p_value?: number;
    [key: string]: unknown;
  };
}

interface InstabilityResults {
  splits?: unknown[];
  summary?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ShapComparison {
  models?: Record<string, unknown>;
  [key: string]: unknown;
}

interface MLMetrics {
  [model: string]: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1?: number;
    auc_roc?: number;
    [key: string]: unknown;
  };
}

interface FeatureImportance {
  [model: string]: {
    features?: string[];
    importances?: number[];
    [key: string]: unknown;
  };
}

interface ShapValues {
  [key: string]: unknown;
}

interface MLPConfig {
  cat_cardinalities?: Record<string, number>;
  [key: string]: unknown;
}

interface ScalerJson {
  mean: number[];
  scale: number[];
}

// Resolve paths — works in both Bun and Node.js (bundled or not)
let __dir: string;
try {
  __dir = dirname(fileURLToPath(import.meta.url));
} catch {
  // Fallback for environments where import.meta.url is not a file URL
  __dir = __dirname ?? process.cwd();
}

/**
 * Find the data directory by checking multiple candidate paths.
 * This makes the loader resilient to different bundling/runtime contexts.
 */
function resolveDataDir(): string {
  const candidates = [
    join(__dir, "..", "data"), // Standard: src/../data or api/../data
    join(__dir, "data"), // If __dir is project root
    join(process.cwd(), "data"), // CWD-based (Vercel sometimes uses this)
    join(process.cwd(), "backend-bun", "data"), // If CWD is parent
  ];

  for (const candidate of candidates) {
    const resolved = resolve(candidate);
    if (existsSync(resolved)) {
      console.log(`  📂 Data directory found at: ${resolved}`);
      return resolved;
    }
  }

  // Default to the standard expected path even if it doesn't exist yet
  const fallback = resolve(join(__dir, "..", "data"));
  console.warn(
    `  ⚠ Data directory not found at any candidate path, using fallback: ${fallback}`,
  );
  console.warn(
    `  Candidates tried: ${candidates.map((c) => resolve(c)).join(", ")}`,
  );
  return fallback;
}

const DATA_DIR = resolveDataDir();

// These directories are only used for local analysis endpoints;
// they may not exist on Vercel and that's fine.
const PROCESSED_DIR = join(__dir, "..", "..", "data", "processed");
const FIGURES_DIR = join(__dir, "..", "..", "docs", "figures");

// Loaded data
let pipelineMaps: PipelineMaps = {};
let mlpConfig: MLPConfig | null = null;
let shapValues: ShapValues | null = null;
let featureImportance: FeatureImportance | null = null;
let mlMetrics: MLMetrics | null = null;
let calibrationMetrics: CalibrationMetrics | null = null;
let costAnalysis: CostAnalysis | null = null;
let statisticalTests: StatisticalTests | null = null;
let instabilityResults: InstabilityResults | null = null;
let shapComparison: ShapComparison | null = null;
let _initialised = false;

function loadJSON<T>(path: string, label: string): T | null {
  if (!existsSync(path)) {
    console.log(`  ✗ ${label} not found at ${path}`);
    return null;
  }
  try {
    const data = JSON.parse(readFileSync(path, "utf-8")) as T;
    console.log(`  ✓ ${label}`);
    return data;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`  ✗ ${label} failed to parse: ${message}`);
    return null;
  }
}

export async function initialise(): Promise<void> {
  if (_initialised) return;

  console.log("=".repeat(60));
  console.log("  IDSS Backend (Bun/Elysia) — Loading artifacts");
  console.log(
    `  Runtime: ${typeof (globalThis as Record<string, unknown>).Bun !== "undefined" ? "Bun" : "Node.js"}`,
  );
  console.log(`  __dir: ${__dir}`);
  console.log(`  DATA_DIR: ${DATA_DIR}`);
  console.log(`  CWD: ${process.cwd()}`);
  console.log("=".repeat(60));

  const start = performance.now();

  // Pipeline maps
  pipelineMaps =
    loadJSON<PipelineMaps>(
      join(DATA_DIR, "pipeline_maps.json"),
      "pipeline_maps",
    ) ?? {};

  // XGBoost model
  const xgbJson = loadJSON<XGBModelJson>(
    join(DATA_DIR, "xgb_orig_v4.json"),
    "XGBoost model",
  );
  if (xgbJson) {
    loadXGBoostModelDirect(xgbJson);
  }

  // MLP model — pure TypeScript, loads JSON weights (no ONNX runtime needed)
  mlpConfig = loadJSON<MLPConfig>(
    join(DATA_DIR, "mlp_v4_config.json"),
    "MLP config",
  );
  const scalerJson = loadJSON<ScalerJson>(
    join(DATA_DIR, "mlp_scaler.json"),
    "MLP scaler",
  );

  const weightsPath = join(DATA_DIR, "mlp_weights.json");
  if (scalerJson && existsSync(weightsPath)) {
    try {
      await loadMLPModel(weightsPath, scalerJson);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("  ✗ MLP weights load failed:", message);
    }
  }

  // Precomputed analysis data
  shapValues = loadJSON<ShapValues>(
    join(DATA_DIR, "shap_values.json"),
    "SHAP values",
  );
  featureImportance = loadJSON<FeatureImportance>(
    join(DATA_DIR, "feature_importance_v4.json"),
    "Feature importance",
  );
  mlMetrics = loadJSON<MLMetrics>(
    join(DATA_DIR, "ml_metrics_v4.json"),
    "ML metrics",
  );
  calibrationMetrics = loadJSON<CalibrationMetrics>(
    join(DATA_DIR, "calibration_metrics_v4.json"),
    "Calibration metrics",
  );
  costAnalysis = loadJSON<CostAnalysis>(
    join(DATA_DIR, "cost_analysis_v4.json"),
    "Cost analysis",
  );
  statisticalTests = loadJSON<StatisticalTests>(
    join(DATA_DIR, "statistical_tests_v4.json"),
    "Statistical tests",
  );
  instabilityResults = loadJSON<InstabilityResults>(
    join(DATA_DIR, "split_instability_results.json"),
    "Instability results",
  );
  shapComparison = loadJSON<ShapComparison>(
    join(DATA_DIR, "shap_comparison_v4.json"),
    "SHAP comparison",
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
export function getMLPConfig(): MLPConfig | null {
  return mlpConfig;
}
export function getShapValues(): ShapValues | null {
  return shapValues;
}
export function getFeatureImportance(): FeatureImportance | null {
  return featureImportance;
}
export function getMLMetrics(): MLMetrics | null {
  return mlMetrics;
}
export function getCalibrationMetrics(): CalibrationMetrics | null {
  return calibrationMetrics;
}
export function getCostAnalysis(): CostAnalysis | null {
  return costAnalysis;
}
export function getStatisticalTests(): StatisticalTests | null {
  return statisticalTests;
}
export function getInstabilityResults(): InstabilityResults | null {
  return instabilityResults;
}
export function getShapComparison(): ShapComparison | null {
  return shapComparison;
}
export function getProcessedDir(): string {
  return PROCESSED_DIR;
}
export function getFiguresDir(): string {
  return FIGURES_DIR;
}
