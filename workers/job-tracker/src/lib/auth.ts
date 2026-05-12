import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import { createMiddleware } from 'hono/factory';
import { CloudflareBindings } from "..";

export const getAuth = (env: CloudflareBindings) => {
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [
      "http://localhost:5173",
      "http://localhost:8787"
    ],
    database: drizzleAdapter(drizzle(env.db), {
      provider: "sqlite",
      schema: schema
    }),
    secret: env.BETTER_AUTH_SECRET,
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          console.log("*****************************************");
          console.log(`NEW MAGIC LINK FOR: ${email}`);
          console.log(`URL: ${url}`);
          console.log("*****************************************");

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "login@yourdomain.com", // You'll need to verify a domain in Resend later
              to: email,
              subject: "Log in to Job Tracker",
              html: `<p>Click <a href="${url}">here</a> to log in.</p>`,
            }),
          });
        },
      }),
    ],
    socialProviders: {
       github: { 
        clientId: env.GITHUB_CLIENT_ID || "", 
        clientSecret: env.GITHUB_CLIENT_SECRET || "" 
       },
    },
  });
};

export const authMiddleware = createMiddleware(async (c, next) => {
  // 1. Initialize Better Auth with the current environment
  const auth = getAuth(c.env);

  // 2. Ask Better Auth to validate the incoming request headers (where the cookie lives)
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  // 3. If no valid session is found, immediately bounce the request
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // 4. If valid, attach the user and session to the Hono context
  c.set('user', session.user);
  c.set('session', session.session);

  // 5. Let the request continue to the actual route handler
  await next();
});