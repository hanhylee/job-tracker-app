import type { BetterAuthOptions } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import type { ResolvedEnv } from '../resolve-env';
import { getAllowedOrigins } from '../cors';

/**
 * Shared Better Auth options (plugins, providers, CORS origins).
 * basePath defaults to /api/auth — matches Hono mount at /api/auth/*
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
    user: {
      additionalFields: {
        isPro: {
          type: 'boolean',
          defaultValue: false,
        },
      },
    },
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
        sendMagicLink: async ({ email, url, token }) => {
          // IMPORTANT: do not email the direct `/api/auth/magic-link/verify` URL.
          // Better-auth consumes magic-link tokens atomically on first hit
          // (GHSA-hc7v-rggr-4hvx) and corporate email link scanners — most
          // notably Microsoft Defender Safe Links, but also Proofpoint,
          // Mimecast, Gmail link safety, etc. — fetch every URL in inbound
          // mail. That pre-fetch consumes the token before the user clicks,
          // leaving us with "user is created but no session" because the
          // Set-Cookie attaches to the scanner's connection.
          //
          // Instead, send a link to the SPA confirmation page `/auth/verify`,
          // which is just static HTML. Scanners load it as harmless content;
          // only the user's click triggers a real navigation to the verify
          // endpoint so the session cookie lands in their browser.
          const verifyUrl = new URL(url);
          const callbackURL = verifyUrl.searchParams.get('callbackURL') ?? '/';
          const confirmUrl = new URL('/auth/verify', env.BETTER_AUTH_URL);
          confirmUrl.searchParams.set('token', token);
          confirmUrl.searchParams.set('callbackURL', callbackURL);
          const newUserCallbackURL = verifyUrl.searchParams.get(
            'newUserCallbackURL',
          );
          if (newUserCallbackURL) {
            confirmUrl.searchParams.set('newUserCallbackURL', newUserCallbackURL);
          }
          const linkUrl = confirmUrl.toString();

          console.log('*****************************************');
          console.log(`NEW MAGIC LINK FOR: ${email}`);
          console.log(`URL: ${linkUrl}`);
          console.log('*****************************************');

          if (env.RESEND_API_KEY) {
            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'hello@cancareer.com',
                to: email,
                subject: 'Log in to Job Tracker',
                html: `<p>Click <a href="${linkUrl}">here</a> to log in.</p>`,
              }),
            });
            if (!res.ok) {
              const body = await res.text();
              console.error(`Resend error ${res.status}: ${body}`);
            }
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
