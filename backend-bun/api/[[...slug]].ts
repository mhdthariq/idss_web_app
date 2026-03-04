/**
 * Vercel serverless catch-all handler.
 *
 * All requests are funnelled through this single function,
 * which delegates to the Elysia app's .handle() method.
 */

import { createApp } from "../src/app";

export default async function handler(request: Request): Promise<Response> {
  const app = await createApp();
  return app.handle(request);
}
