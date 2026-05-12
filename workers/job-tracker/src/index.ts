import { fromHono } from "chanfana";
import { Hono } from "hono";
import { getAuth, authMiddleware } from './lib/auth';
import { ApplicationCreate } from "./endpoints/applicationCreate";
import { ApplicationDelete } from "./endpoints/applicationDelete";
import { ApplicationFetch } from "./endpoints/applicationFetch";
import { ApplicationList } from "./endpoints/applicationList";

export type CloudflareBindings = {
  db: D1Database;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  RESEND_API_KEY?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
};

export type Variables = {
  user: any;
  session: any; 
};

// Start a Hono app
const app = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>();

// Capture all /api/auth/* routes and hand them to Better Auth
app.on(["POST", "GET"], "/api/auth/**", (c) => {
  const auth = getAuth(c.env);
  return auth.handler(c.req.raw);
});

// Setup OpenAPI registry
const openapi = fromHono(app, {
	docs_url: "/",
    schema: {
        info: {
            title: "Job Tracker API",
            version: "1.0.0",
        },
        security: [
            {
                cookieAuth: [],
            },
        ],
    },
});

app.use("/api/*", authMiddleware);

// Register the security scheme definition
openapi.registry.registerComponent("securitySchemes", "cookieAuth", {
    type: "apiKey",
    in: "cookie",
    name: "better-auth.session_token",
});

// Register protected OpenAPI endpoints
openapi.get("/api/applications", ApplicationList);
openapi.post("/api/applications", ApplicationCreate);
openapi.get("/api/applications/:applicationSlug", ApplicationFetch);
openapi.delete("/api/applications/:applicationSlug", ApplicationDelete);

app.get("/api/applications", async (c) => {
  const user = c.get("user"); // This is injected by your authMiddleware
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  
  return c.json({
    message: `Welcome to your applications, ${user.email}`,
    userId: user.id,
    applications: [] // Future: Fetch these from D1 where userId = user.id
  });
});

// Export the Hono app
export default app;
