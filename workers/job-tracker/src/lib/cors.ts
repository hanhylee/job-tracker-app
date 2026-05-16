import type { CloudflareBindings } from '../types';

const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://localhost:8787'];

export function getAllowedOrigins(
  env: Pick<CloudflareBindings, 'FRONTEND_URL'>,
): string[] {
  if (!env.FRONTEND_URL) {
    return DEFAULT_ORIGINS;
  }
  const fromEnv = env.FRONTEND_URL.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...DEFAULT_ORIGINS, ...fromEnv])];
}
