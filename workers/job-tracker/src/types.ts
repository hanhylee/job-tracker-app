import type { Context } from "hono";
import { z } from "zod";
import { Auth } from "./lib/better-auth";

export type AppContext = Context<{ Bindings: Env }>;

export const Application = z.object({
	name: z.string().describe("The name of the application"),
	slug: z.string(),
	description: z.string().optional(),
	completed: z.boolean().default(false),
	due_date: z.iso.date(),
});

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
  