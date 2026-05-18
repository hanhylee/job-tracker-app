import { Hono } from "hono";
import { cors } from "hono/cors";
import type { CloudflareBindings } from "./types";
import { auth } from "./lib/better-auth";
import type { Variables } from "./types";
import { authMiddleware } from "./lib/better-auth/middleware";
import { applicationsRoutes, analysisRoutes, meRoutes, r2UsageRoutes } from "./routes";
import { getAllowedOrigins } from "./lib/cors";
import { resolveEnv, resolveSecret } from "./lib/resolve-env";

const app = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>();

app.use("*", async (c, next) => {
  // FRONTEND_URL is a plain env var in production — resolveSecret returns it as-is.
  const frontendUrl = await resolveSecret(c.env.FRONTEND_URL);
  const allowed = getAllowedOrigins({ FRONTEND_URL: frontendUrl });
  const requestOrigin = c.req.header("origin");

  // Set ACAO eagerly on the context so it survives even when hono/cors skips it
  // (e.g. when origin function returns null, or when a route throws before cors
  // can write headers post-next()).
  if (requestOrigin && allowed.includes(requestOrigin)) {
    c.header("Access-Control-Allow-Origin", requestOrigin);
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Vary", "Origin");
  }

  return cors({
    origin: (origin) => {
      if (!origin) return allowed[0] ?? null;
      return allowed.includes(origin) ? origin : null;
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })(c, next);
});

// Ensure CORS headers appear on 500 responses (hono/cors writes ACAO after next(),
// so an uncaught route error means ACAO is never set on the error response).
app.onError(async (err, c) => {
  console.error("[worker error]", err.message);
  const requestOrigin = c.req.header("origin");
  if (requestOrigin) {
    const frontendUrl = await resolveSecret(c.env.FRONTEND_URL);
    const allowed = getAllowedOrigins({ FRONTEND_URL: frontendUrl });
    if (allowed.includes(requestOrigin)) {
      c.header("Access-Control-Allow-Origin", requestOrigin);
      c.header("Access-Control-Allow-Credentials", "true");
      c.header("Vary", "Origin");
    }
  }
  return c.json({ error: err.message }, 500);
});

app.all("/api/auth/*", async (c) => {
  const env = await resolveEnv(c.env);
  const response = await auth(env).handler(c.req.raw);

  // better-auth returns a raw Response that bypasses Hono's context header
  // buffering. Explicitly apply CORS headers so they are always present,
  // including on preflight (OPTIONS) responses better-auth may generate.
  const requestOrigin = c.req.header("origin");
  if (requestOrigin) {
    const frontendUrl = await resolveSecret(c.env.FRONTEND_URL);
    const allowed = getAllowedOrigins({ FRONTEND_URL: frontendUrl });
    if (allowed.includes(requestOrigin)) {
      const headers = new Headers(response.headers);
      headers.set("Access-Control-Allow-Origin", requestOrigin);
      headers.set("Access-Control-Allow-Credentials", "true");
      headers.set("Vary", "Origin");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
  }
  return response;
});

app.use("/api/applications", authMiddleware);
app.use("/api/applications/*", authMiddleware);
app.route("/api/applications", applicationsRoutes);
app.route("/api/applications", analysisRoutes);

app.use("/api/me", authMiddleware);
app.route("/api/me", meRoutes);

app.use("/api/r2/usage", authMiddleware);
app.route("/api/r2/usage", r2UsageRoutes);

export default app;
