import { Hono } from "hono";
import { cors } from "hono/cors";
import type { CloudflareBindings } from "./types";
import { auth } from "./lib/better-auth";
import type { Variables } from "./types";
import { authMiddleware } from "./lib/better-auth/middleware";
import { applicationsRoutes } from "./routes";
import { getAllowedOrigins } from "./lib/cors";
import { resolveEnv } from "./lib/resolve-env";

const app = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>();

app.use("*", async (c, next) => {
  const env = await resolveEnv(c.env);
  const allowed = getAllowedOrigins(env);
  return cors({
    origin: (origin) => {
      if (!origin) return allowed[0] ?? null;
      return allowed.includes(origin) ? origin : null;
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })(c, next);
});

app.on(["POST", "GET"], "/api/auth/**", async (c) => {
  const env = await resolveEnv(c.env);
  return auth(env).handler(c.req.raw);
});

app.use("/api/applications", authMiddleware);
app.use("/api/applications/*", authMiddleware);
app.route("/api/applications", applicationsRoutes);

export default app;
