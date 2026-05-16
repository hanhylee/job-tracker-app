import type { ResolvedEnv } from './resolve-env';

const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://localhost:8787'];

/** Add www / non-www pairs so apex and www both work when one is configured. */
function expandOriginVariants(origins: string[]): string[] {
  const result = new Set<string>();

  for (const origin of origins) {
    result.add(origin);
    try {
      const url = new URL(origin);
      if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost')) {
        continue;
      }
      if (url.hostname.startsWith('www.')) {
        const bare = url.hostname.slice(4);
        result.add(`${url.protocol}//${bare}`);
      } else {
        result.add(`${url.protocol}//www.${url.hostname}`);
      }
    } catch {
      /* ignore invalid URLs */
    }
  }

  return [...result];
}

export function getAllowedOrigins(
  env: Pick<ResolvedEnv, 'FRONTEND_URL'>,
): string[] {
  const fromEnv = env.FRONTEND_URL
    ? env.FRONTEND_URL.split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return expandOriginVariants([...DEFAULT_ORIGINS, ...fromEnv]);
}