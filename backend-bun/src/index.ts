/**
 * IDSS Backend — Elysia + Bun entry point.
 */

import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { initialise } from "./data-loader";
import { healthRoutes } from "./routes/health";
import { predictRoutes } from "./routes/predict";
import { analysisRoutes } from "./routes/analysis";
import { configRoutes } from "./routes/config";

// Load all artifacts
await initialise();

const port = parseInt(process.env.PORT ?? "8080");

const corsOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

const app = new Elysia()
  .use(
    cors({
      origin: corsOrigins,
      credentials: true,
    })
  )
  .use(healthRoutes)
  .use(predictRoutes)
  .use(analysisRoutes)
  .use(configRoutes)
  .get("/", () => ({
    name: "IDSS — Debt Prediction API",
    version: "0.2.0-bun",
    runtime: "bun",
    docs: "/api/health",
  }))
  .listen(port);

console.log(`🦊 IDSS API running at http://localhost:${port}`);
