/**
 * IDSS Backend — Local dev entry point.
 * For Vercel deployment, see api/[[...slug]].ts
 */

import { createApp } from "./app";

const port = parseInt(process.env.PORT ?? "8080");

const app = await createApp();
app.listen(port);

console.log(`🦊 IDSS API running at http://localhost:${port}`);
