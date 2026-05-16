import type { BetterAuthOptions } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import type { ResolvedEnv } from '../resolve-env';
import { getAllowedOrigins } from '../cors';

/**
 * Shared Better Auth options (plugins, providers, CORS origins).
 * basePath defaults to /api/auth — matches Hono mount at /api/auth/**
 */
export function createBetterAuthOptions(
  env: Pick<
    ResolvedEnv,
    | 'BETTER_AUTH_URL'
    | 'FRONTEND_URL'
    | 'RESEND_API_KEY'
    | 'GITHUB_CLIENT_ID'
    | 'GITHUB_CLIENT_SECRET'
  >,
): BetterAuthOptions {
  const isHttps = env.BETTER_AUTH_URL.startsWith('https://');

  return {
    appName: 'hanhylee job tracker app',
    trustedOrigins: getAllowedOrigins(env),
    ...(isHttps && {
      advanced: {
        defaultCookieAttributes: {
          sameSite: 'none',
          secure: true,
        },
      },
    }),
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          console.log('*****************************************');
          console.log(`NEW MAGIC LINK FOR: ${email}`);
          console.log(`URL: ${url}`);
          console.log('*****************************************');

          if (env.RESEND_API_KEY) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'login@yourdomain.com',
                to: email,
                subject: 'Log in to Job Tracker',
                html: `<p>Click <a href="${url}">here</a> to log in.</p>`,
              }),
            });
          }
        },
      }),
    ],
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID ?? '',
        clientSecret: env.GITHUB_CLIENT_SECRET ?? '',
      },
    },
  };
}
