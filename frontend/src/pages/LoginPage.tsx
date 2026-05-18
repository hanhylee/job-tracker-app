import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { authClient } from '../lib/auth-client';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export function LoginPage() {
  const { data: session, isPending } = authClient.useSession();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isPending && session?.user) {
    return <Navigate to="/" replace />;
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { error: authError } = await authClient.signIn.magicLink({
        email,
        callbackURL: window.location.origin + '/',
      });
      if (authError) {
        setError(authError.message ?? 'Could not send magic link');
        return;
      }
      setMessage('Check your email for a sign-in link.');
    } catch {
      setError('Could not send magic link');
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGitHub() {
    setError(null);
    await authClient.signIn.social({
      provider: 'github',
      callbackURL: window.location.origin + '/',
    });
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-neutral-100 transition-shadow duration-200 hover:shadow-md">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          CanCareer
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Track your job applications in one place.
        </p>

        <form onSubmit={sendMagicLink} className="mt-8 space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="text-sm text-emerald-600" role="status">
              {message}
            </p>
          ) : null}
          <Button type="submit" disabled={loading} className="w-full" variant="primary">
            {loading ? 'Sending…' : 'Continue with email'}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-neutral-400">or</span>
          </div>
        </div>

        <Button
          variant="secondary"
          className="w-full"
          onClick={signInWithGitHub}
        >
          Continue with GitHub
        </Button>
      </div>
    </div>
  );
}
