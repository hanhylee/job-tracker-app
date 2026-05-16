import { createAuthClient } from 'better-auth/react';
import { magicLinkClient } from 'better-auth/client/plugins';
import { getApiBaseUrl } from './api-base';

export const authClient = createAuthClient({
  baseURL: getApiBaseUrl() || (typeof window !== 'undefined' ? window.location.origin : ''),
  plugins: [magicLinkClient()],
  fetchOptions: {
    credentials: 'include',
  },
});
