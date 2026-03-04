/**
 * Health + debug routes.
 */

import { Elysia } from "elysia";
import { isMLPLoaded } from "../mlp-predict";
import { getPipelineMaps, getShapValues } from "../data-loader";

export const healthRoutes = new Elysia()
  .get("/api/health", () => {
    const pm = getPipelineMaps();
    const hasXgb = true; // If we got this far, XGBoost was loaded
    const hasMlp = isMLPLoaded();
    const hasPipelineMaps = Object.keys(pm).length > 0;
    const hasShap = getShapValues() !== null;

    const required = hasXgb && hasPipelineMaps;

    return {
      status: required ? "healthy" : "degraded",
      version: "0.2.0-bun",
      runtime: "bun",
      models_loaded: {
        xgboost: hasXgb,
        mlp: hasMlp,
        pipeline_maps: hasPipelineMaps,
        shap_explainer: hasShap,
        unique_values: !!(pm.unique_values && Object.keys(pm.unique_values).length > 0),
      },
    };
  })
  .get("/api/debug", () => {
    return {
      status: "ok",
      runtime: "bun",
      bun_version: Bun.version,
      cwd: process.cwd(),
      env_PORT: process.env.PORT ?? "(not set)",
      env_CORS_ORIGINS: process.env.CORS_ORIGINS ?? "(not set)",
    };
  });
