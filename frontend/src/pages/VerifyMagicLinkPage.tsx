import { useEffect, useMemo } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Spinner } from '../components/Spinner';
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
 * verification call (hard-coded; see GHSA-hc7v-rggr-4hvx).
 *
 * The redirect is fired from useEffect (client-side, post-mount) rather
 * than a <meta refresh> or server-side redirect, so HTTP-only link scanners
 * like Microsoft Safe Links — which fetch URLs but do NOT execute
 * JavaScript — see only inert HTML and don't follow through to the verify
 * endpoint. A real user's browser runs the effect and is redirected.
 *
 * We use `window.location.href` (a top-level browser navigation) rather
 * than `fetch` so the Set-Cookie from the 302 response lands in the
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

  useEffect(() => {
    if (verifyHref) window.location.replace(verifyHref);
  }, [verifyHref]);

  if (!verifyHref) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="flex items-center gap-3 text-sm text-neutral-500">
        <Spinner />
        <span>Signing you in…</span>
      </div>
    </div>
  );
}
