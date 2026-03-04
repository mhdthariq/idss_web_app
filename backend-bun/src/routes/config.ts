/**
 * Config routes — unique values, feature config.
 */

import { Elysia } from "elysia";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getPipelineMaps, getProcessedDir } from "../data-loader";

export const configRoutes = new Elysia()
  .get("/api/config/unique-values", () => {
    const pm = getPipelineMaps();
    return pm.unique_values ?? {};
  })
  .get("/api/config/feature-config", () => {
    const processedDir = getProcessedDir();
    const configPath = join(processedDir, "feature_config.json");

    if (!existsSync(configPath)) {
      return { error: "Feature config not found" };
    }

    return JSON.parse(readFileSync(configPath, "utf-8"));
  });
