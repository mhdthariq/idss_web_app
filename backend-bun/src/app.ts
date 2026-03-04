/**
 * IDSS Backend — Elysia app factory.
 * Separated from index.ts so it can be used by both:
 * - Local dev (index.ts → .listen())
 * - Vercel serverless (api/index.ts → .handle())
 */

import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { initialise } from "./data-loader";
import { healthRoutes } from "./routes/health";
import { predictRoutes } from "./routes/predict";
import { analysisRoutes } from "./routes/analysis";
import { configRoutes } from "./routes/config";

// Use `any` to avoid Elysia's deeply nested generic types
let _app: any = null;

function detectRuntime(): string {
  if (typeof (globalThis as any).Bun !== "undefined") return "bun";
  if (typeof (globalThis as any).Deno !== "undefined") return "deno";
  return "node";
}

export async function createApp() {
  if (_app) return _app;

  // Load all artifacts
  await initialise();

  const corsOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim());

  _app = new Elysia()
    .use(
      cors({
        origin: corsOrigins,
        credentials: true,
      }),
    )
    .use(healthRoutes)
    .use(predictRoutes)
    .use(analysisRoutes)
    .use(configRoutes)
    .get("/", () => ({
      name: "IDSS — Debt Prediction API",
      version: "0.2.0-bun",
      runtime: detectRuntime(),
      docs: "/api/health",
    }));

  return _app;
}
