import { Auth } from "./lib/better-auth";

type Session = Auth["$Infer"]["Session"];

export type Variables = {
  user: Session["user"];
  session: Session["session"];
};

export type CloudflareBindings = {
  db: D1Database;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  RESEND_API_KEY?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
};
