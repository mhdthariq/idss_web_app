/**
 * Vercel serverless catch-all handler.
 *
 * All requests are funnelled through this single function,
 * which delegates to the Elysia app's .handle() method.
 *
 * Vercel expects a default export that is either:
 *   - (req: Request) => Response | Promise<Response>   (Web API style)
 *   - (req, res) => void                                (Node.js style)
 *
 * Elysia's .handle() accepts a Web Standard Request and returns a Response,
 * so we use the Web API style.
 */

import { createApp } from "../src/app";

// Cache the app instance across warm invocations
let appPromise: Promise<any> | null = null;

function getApp() {
  if (!appPromise) {
    appPromise = createApp().catch((err) => {
      // Reset so next invocation retries
      appPromise = null;
      throw err;
    });
  }
  return appPromise;
}

export default async function handler(request: Request): Promise<Response> {
  try {
    const app = await getApp();
    return app.handle(request);
  } catch (e: any) {
    console.error("Vercel function error:", e);
    return new Response(
      JSON.stringify({
        error: "Function startup failed",
        message: e.message,
        stack:
          process.env.NODE_ENV !== "production"
            ? e.stack?.split("\n").slice(0, 10)
            : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
