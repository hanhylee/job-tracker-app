import { createAuthClient } from 'better-auth/react';
import { magicLinkClient } from 'better-auth/client/plugins';
import { getApiBaseUrl } from './api-base';

/**
 * Resolve baseURL for better-auth. Requires an absolute URL.
 *
 * NOTE: better-auth uses the URL's pathname as its basePath (overriding the
 * default `/api/auth`). When using a path prefix like `/proxy`, we MUST include
 * `/api/auth` in the baseURL so the client constructs URLs like
 * `/proxy/api/auth/sign-in/social` (which our Vercel rewrite then forwards to
 * `https://api.cancareer.com/api/auth/sign-in/social`).
 */
function resolveAuthBaseURL(): string {
  const base = getApiBaseUrl();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (!base) return origin;
  if (/^https?:\/\//i.test(base)) return `${base.replace(/\/$/, '')}/api/auth`;
  const prefix = base.startsWith('/') ? base : `/${base}`;
  return `${origin}${prefix}/api/auth`;
}

export const authClient = createAuthClient({
  baseURL: resolveAuthBaseURL(),
  plugins: [magicLinkClient()],
  fetchOptions: {
    credentials: 'include',
  },
});
