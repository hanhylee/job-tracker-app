import { useMemo } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { apiUrl } from '../lib/api-base';

/**
 * Magic-link confirmation page.
 *
 * Why this page exists (and why the button is non-negotiable):
 *
 * Better-auth consumes magic-link tokens atomically on the first verification
 * call (hard-coded per GHSA-hc7v-rggr-4hvx). Inbound-mail link scanners —
 * Microsoft Defender Safe Links, Proofpoint, Mimecast, Gmail link safety —
 * fetch every URL in incoming mail, and modern scanners (notably Safe Links
 * in Defender for Office 365 P2) execute JavaScript. So any automatic
 * redirect, whether <meta refresh> or `useEffect` + `window.location`, can
 * burn the token before the user clicks.
 *
 * The only robust defense is a true human gesture. The "Continue" button
 * below performs a top-level navigation to /api/auth/magic-link/verify,
 * which is when the token is consumed — and now the Set-Cookie lands in
 * the user's browser instead of a scanner's connection.
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
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          You&rsquo;re almost in.
        </p>
        <Button
          variant="primary"
          className="mt-6 w-full"
          onClick={() => {
            window.location.href = verifyHref;
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
