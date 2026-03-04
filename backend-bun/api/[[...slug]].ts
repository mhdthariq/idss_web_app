/**
 * Vercel serverless catch-all handler.
 *
 * All requests are funnelled through this single function,
 * which delegates to the Elysia app's .handle() method.
 */

import { createApp } from "../src/app";

export default async function handler(request: Request): Promise<Response> {
  try {
    const app = await createApp();
    return app.handle(request);
  } catch (e: any) {
    return new Response(
      JSON.stringify({
        error: "Function startup failed",
        message: e.message,
        stack: e.stack?.split("\n").slice(0, 10),
        cwd: process.cwd(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
