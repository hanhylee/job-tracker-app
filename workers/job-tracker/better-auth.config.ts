/**
 * Better Auth CLI configuration file
 *
 * Docs: https://www.better-auth.com/docs/concepts/cli
 */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth } from 'better-auth';
import { createBetterAuthOptions } from './src/lib/better-auth/options';
import { schema } from './src/db';

const {
  BETTER_AUTH_URL = 'http://localhost:8787',
  BETTER_AUTH_SECRET = 'dev-secret-for-cli-only',
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  RESEND_API_KEY,
} = process.env;

const sqlite = new Database('.local-auth.db');
const db = drizzle(sqlite);

export const auth = betterAuth({
  ...createBetterAuthOptions({
    BETTER_AUTH_URL,
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    RESEND_API_KEY,
  }),
  database: drizzleAdapter(db, { provider: 'sqlite', schema }),
  baseURL: BETTER_AUTH_URL,
  secret: BETTER_AUTH_SECRET,
});
