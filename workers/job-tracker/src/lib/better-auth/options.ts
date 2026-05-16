import type { BetterAuthOptions } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import type { CloudflareBindings } from '../../types';

/**
 * Shared Better Auth options (plugins, providers, CORS origins).
 * basePath defaults to /api/auth — matches Hono mount at /api/auth/**
 */
export function createBetterAuthOptions(
  env: Pick<
    CloudflareBindings,
    | 'RESEND_API_KEY'
    | 'GITHUB_CLIENT_ID'
    | 'GITHUB_CLIENT_SECRET'
  >,
): BetterAuthOptions {
  return {
    appName: 'hanhylee job tracker app',
    trustedOrigins: ['http://localhost:5173', 'http://localhost:8787'],
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
