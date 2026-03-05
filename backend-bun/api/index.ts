/**
 * Vercel serverless catch-all handler.
 *
 * This file is auto-detected by Vercel as a serverless function.
 * It uses the classic Node.js (req, res) signature expected by @vercel/node.
 *
 * All requests are funnelled through this single function,
 * which delegates to the Elysia app's .handle() method by converting
 * between Node.js IncomingMessage/ServerResponse and Web Standard Request/Response.
 */

import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../src/app";

interface ElysiaApp {
  handle(request: Request): Promise<Response>;
}

// Cache the app instance across warm invocations
let appPromise: Promise<ElysiaApp> | null = null;

function getApp(): Promise<ElysiaApp> {
  if (!appPromise) {
    appPromise = (createApp() as Promise<ElysiaApp>).catch((err: unknown) => {
      // Reset so next cold-start retries
      appPromise = null;
      throw err;
    });
  }
  return appPromise;
}

/**
 * Read the full request body from an IncomingMessage as a Buffer.
 */
function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    req.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    req.on("error", reject);
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

/**
 * Convert a Node.js IncomingMessage into a Web Standard Request.
 */
async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const body = await readBody(req);

  const protocol = (req.headers["x-forwarded-proto"] as string) || "https";
  const host =
    (req.headers["x-forwarded-host"] as string) ||
    req.headers.host ||
    "localhost";
  const url = `${protocol}://${host}${req.url || "/"}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, value);
    }
  }

  const method = (req.method || "GET").toUpperCase();

  const init: RequestInit = {
    method,
    headers,
  };

  // Only attach body for methods that support it
  if (body.length > 0 && method !== "GET" && method !== "HEAD") {
    init.body = body;
    // Ensure duplex is set for Node 18+ fetch compatibility
    (init as Record<string, unknown>).duplex = "half";
  }

  return new Request(url, init);
}

/**
 * Stream a Web Standard Response back to a Node.js ServerResponse.
 */
async function writeWebResponse(
  webRes: Response,
  res: ServerResponse,
): Promise<void> {
  // Build plain header object from Headers
  const headerObj: Record<string, string | string[]> = {};
  webRes.headers.forEach((value, key) => {
    const existing = headerObj[key];
    if (existing) {
      headerObj[key] = Array.isArray(existing)
        ? [...existing, value]
        : [existing, value];
    } else {
      headerObj[key] = value;
    }
  });

  res.writeHead(webRes.status, webRes.statusText, headerObj);

  if (webRes.body) {
    const reader = webRes.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } finally {
      reader.releaseLock();
    }
  }

  res.end();
}

/**
 * Main Vercel handler — Node.js style (req, res).
 * Compatible with @vercel/node runtime.
 */
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const app = await getApp();
    const webReq = await toWebRequest(req);
    const webRes: Response = await app.handle(webReq);
    await writeWebResponse(webRes, res);
  } catch (e: unknown) {
    console.error("Vercel function error:", e);
    const message = e instanceof Error ? e.message : String(e);
    const stack =
      e instanceof Error ? e.stack?.split?.("\n")?.slice(0, 15) : undefined;
    const errorBody = JSON.stringify({
      error: "Function startup failed",
      message,
      stack: process.env.NODE_ENV !== "production" ? stack : undefined,
    });
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
    }
    res.end(errorBody);
  }
}
