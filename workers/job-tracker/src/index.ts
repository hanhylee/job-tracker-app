import { fromHono } from "chanfana";
import { Hono } from "hono";
import type { CloudflareBindings } from "./bindings";
import { auth } from "./lib/better-auth";
import type { Auth } from "./lib/better-auth";
import { authMiddleware } from "./lib/better-auth/middleware";
import {
  ApplicationCreate,
  ApplicationDelete,
  ApplicationFetch,
  ApplicationList,
} from "./endpoints";

type Session = Auth["$Infer"]["Session"];

export type Variables = {
  user: Session["user"];
  session: Session["session"];
};

const app = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>();

app.on(["POST", "GET"], "/api/auth/**", (c) => {
  return auth(c.env).handler(c.req.raw);
});

const openapi = fromHono(app, {
  docs_url: "/",
  schema: {
    info: {
      title: "hanhylee's Job Tracker API",
      version: "1.0.0",
    },
    security: [
      {
        cookieAuth: [],
      },
    ],
  },
});

app.use("/api/applications", authMiddleware);
app.use("/api/applications/*", authMiddleware);

openapi.registry.registerComponent("securitySchemes", "cookieAuth", {
  type: "apiKey",
  in: "cookie",
  name: "better-auth.session_token",
});

openapi.get("/api/applications", ApplicationList);
openapi.post("/api/applications", ApplicationCreate);
openapi.get("/api/applications/:applicationSlug", ApplicationFetch);
openapi.delete("/api/applications/:applicationSlug", ApplicationDelete);

app.get("/api/applications", async (c) => {
  const user = c.get("user");

  return c.json({
    message: `Welcome to your applications, ${user.email}`,
    userId: user.id,
    applications: [],
  });
});

export default app;
