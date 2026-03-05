/**
 * Analysis + data routes — test-set, instability, metrics, SHAP, figures.
 */

import { Elysia } from "elysia";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  getShapValues,
  getFeatureImportance,
  getMLMetrics,
  getCalibrationMetrics,
  getCostAnalysis,
  getStatisticalTests,
  getInstabilityResults,
  getShapComparison,
  getProcessedDir,
  getFiguresDir,
} from "../data-loader";

export const analysisRoutes = new Elysia()
  // --- Test-set analysis ---
  .get("/api/analysis/test-set", ({ query: _query }) => {
    const processedDir = getProcessedDir();
    const testPath = join(processedDir, "test.csv");

    if (!existsSync(testPath)) {
      return { error: "test.csv not found" };
    }

    const csvText = readFileSync(testPath, "utf-8");
    const lines = csvText.trim().split("\n");
    const headers = (lines[0] ?? "")
      .split(",")
      .map((h) => h.trim().replace(/"/g, ""));

    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = (lines[i] ?? "")
        .split(",")
        .map((c) => c.trim().replace(/"/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, j) => {
        row[h] = cols[j] ?? "";
      });
      rows.push(row);
    }

    return {
      total_rows: rows.length,
      columns: headers,
      data: rows,
    };
  })

  // --- Instability data ---
  .get("/api/data/instability", () => {
    const data = getInstabilityResults();
    if (!data) return { error: "Instability data not available" };
    return data;
  })

  // --- ML metrics ---
  .get("/api/data/metrics", () => {
    const data = getMLMetrics();
    if (!data) return { error: "ML metrics not available" };
    return data;
  })

  // --- SHAP data ---
  .get("/api/data/shap", () => {
    const shapValues = getShapValues();
    const featureImportance = getFeatureImportance();
    const shapComparison = getShapComparison();

    return {
      shap_values: shapValues,
      feature_importance: featureImportance,
      shap_comparison: shapComparison,
    };
  })

  // --- Calibration data ---
  .get("/api/data/calibration", () => {
    const data = getCalibrationMetrics();
    if (!data) return { error: "Calibration data not available" };
    return data;
  })

  // --- Cost analysis ---
  .get("/api/data/cost-analysis", () => {
    const data = getCostAnalysis();
    if (!data) return { error: "Cost analysis data not available" };
    return data;
  })

  // --- Statistical tests ---
  .get("/api/data/statistical-tests", () => {
    const data = getStatisticalTests();
    if (!data) return { error: "Statistical tests data not available" };
    return data;
  })

  // --- Figures ---
  .get("/api/data/figures/:name", ({ params }) => {
    const figuresDir = getFiguresDir();
    const processedDir = getProcessedDir();

    // Try figures dir first, then processed dir
    let filePath = join(figuresDir, params.name);
    if (!existsSync(filePath)) {
      filePath = join(processedDir, params.name);
    }

    if (!existsSync(filePath)) {
      return new Response("Figure not found", { status: 404 });
    }

    const data = readFileSync(filePath);
    const ext = params.name.split(".").pop()?.toLowerCase();
    const contentType =
      ext === "png"
        ? "image/png"
        : ext === "jpg" || ext === "jpeg"
          ? "image/jpeg"
          : ext === "svg"
            ? "image/svg+xml"
            : "application/octet-stream";

    return new Response(data, {
      headers: { "Content-Type": contentType },
    });
  });
