import { useMemo } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { apiUrl } from '../lib/api-base';

/**
 * Magic-link confirmation page.
 *
 * The email links here (NOT directly to /api/auth/magic-link/verify) so that
 * inbound-mail link scanners (Microsoft Defender Safe Links, Proofpoint,
 * Mimecast, Gmail link safety, etc.) don't pre-fetch the verify endpoint
 * and burn the single-use token before the user clicks.
 *
 * Better-auth's magic-link tokens are consumed atomically on the first
 * verification call (hard-coded; see GHSA-hc7v-rggr-4hvx). The only safe
 * design is to require a user gesture before hitting the verify endpoint —
 * which is what this page provides via the "Sign in" button.
 *
 * The button uses `window.location.href` (a top-level browser navigation)
 * rather than `fetch` so the Set-Cookie from the 302 response lands in the
 * browser's cookie jar.
 */
export function VerifyMagicLinkPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const callbackURL = params.get('callbackURL') ?? '/';
  const newUserCallbackURL = params.get('newUserCallbackURL');

  const verifyHref = useMemo(() => {
    if (!token) return null;
    const u = new URL(apiUrl('/api/auth/magic-link/verify'), window.location.origin);
    u.searchParams.set('token', token);
    u.searchParams.set('callbackURL', callbackURL);
    if (newUserCallbackURL) u.searchParams.set('newUserCallbackURL', newUserCallbackURL);
    return u.toString();
  }, [token, callbackURL, newUserCallbackURL]);

  if (!verifyHref) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-neutral-100">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Sign in to CanCareer
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Click below to finish signing in. This extra step prevents email
          scanners from invalidating your link.
        </p>
        <Button
          variant="primary"
          className="mt-6 w-full"
          onClick={() => {
            window.location.href = verifyHref;
          }}
        >
          Sign in
        </Button>
      </div>
    </div>
  );
}
