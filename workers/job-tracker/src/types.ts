import { Auth } from "./lib/better-auth";

type Session = Auth["$Infer"]["Session"];

export type Variables = {
  user: Session["user"];
  session: Session["session"];
};

/** Worker var or account Secrets Store binding (use `resolveEnv` before reading). */
export type EnvSecret = string | { get(): Promise<string> };

/** Raw Cloudflare bindings — secrets may be SecretsStoreSecret objects. */
export type CloudflareBindings = {
  db: D1Database;
  RESUMES: R2Bucket;
  BETTER_AUTH_URL: EnvSecret;
  BETTER_AUTH_SECRET: EnvSecret;
  FRONTEND_URL?: EnvSecret;
  RESEND_API_KEY?: EnvSecret;
  GITHUB_CLIENT_ID?: EnvSecret;
  GITHUB_CLIENT_SECRET?: EnvSecret;
};
