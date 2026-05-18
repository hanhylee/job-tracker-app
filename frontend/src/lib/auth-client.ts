import { createAuthClient } from 'better-auth/react';
import { magicLinkClient } from 'better-auth/client/plugins';
import { getApiBaseUrl } from './api-base';

/**
 * Resolve baseURL for better-auth. Requires an absolute URL.
 * - Absolute VITE_API_URL (e.g. https://api.example.com)  -> use as-is
 * - Path-only VITE_API_URL (e.g. /proxy)                  -> prepend window.location.origin
 * - Empty                                                 -> window.location.origin (same-origin)
 */
function resolveAuthBaseURL(): string {
  const base = getApiBaseUrl();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (!base) return origin;
  if (/^https?:\/\//i.test(base)) return base;
  return `${origin}${base.startsWith('/') ? base : `/${base}`}`;
}

export const authClient = createAuthClient({
  baseURL: resolveAuthBaseURL(),
  plugins: [magicLinkClient()],
  fetchOptions: {
    credentials: 'include',
  },
});
