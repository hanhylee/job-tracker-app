import type { CloudflareBindings } from '../types';

type MaybeSecret = string | undefined | { get(): Promise<string> };

export async function resolveSecret(value: MaybeSecret): Promise<string | undefined> {
  if (value == null) return undefined;
  if (typeof value === 'string') return value || undefined;
  if (typeof value === 'object' && 'get' in value) {
    try {
      return await value.get();
    } catch (e) {
      console.error('[resolveSecret] Secrets Store .get() failed:', e);
      return undefined;
    }
  }
  return undefined;
}

/**
 * All secret fields resolved to plain strings.
 * Passed to auth helpers and CORS — never the raw binding object.
 */
export type ResolvedEnv = {
  db: D1Database;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  FRONTEND_URL?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
};

/**
 * Resolves every Secrets Store binding to a plain string.
 * Safe for both local dev (.dev.vars plain strings) and production
 * (SecretsStoreSecret objects that require `.get()`).
 */
export async function resolveEnv(env: CloudflareBindings): Promise<ResolvedEnv> {
  const [
    BETTER_AUTH_URL,
    BETTER_AUTH_SECRET,
    FRONTEND_URL,
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    RESEND_API_KEY,
  ] = await Promise.all([
    resolveSecret(env.BETTER_AUTH_URL as MaybeSecret),
    resolveSecret(env.BETTER_AUTH_SECRET as MaybeSecret),
    resolveSecret(env.FRONTEND_URL as MaybeSecret),
    resolveSecret(env.GITHUB_CLIENT_ID as MaybeSecret),
    resolveSecret(env.GITHUB_CLIENT_SECRET as MaybeSecret),
    resolveSecret(env.RESEND_API_KEY as MaybeSecret),
  ]);

  if (!BETTER_AUTH_URL) {
    throw new Error('BETTER_AUTH_URL is not set. Add it in Cloudflare Worker settings or .dev.vars.');
  }
  if (!BETTER_AUTH_SECRET) {
    throw new Error('BETTER_AUTH_SECRET is not set. Add it in Cloudflare Worker settings or .dev.vars.');
  }

  return {
    db: env.db,
    BETTER_AUTH_URL,
    BETTER_AUTH_SECRET,
    FRONTEND_URL,
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    RESEND_API_KEY,
  };
}
