import { Hono } from "hono";
import type { CloudflareBindings } from "./types";
import { auth } from "./lib/better-auth";
import type { Variables } from "./types";
import { authMiddleware } from "./lib/better-auth/middleware";
import { applicationsRoutes } from "./routes";

const app = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>();

app.on(["POST", "GET"], "/api/auth/**", (c) => {
  return auth(c.env).handler(c.req.raw);
});

app.use("/api/applications", authMiddleware);
app.use("/api/applications/*", authMiddleware);
app.route("/api/applications", applicationsRoutes);

export default app;
