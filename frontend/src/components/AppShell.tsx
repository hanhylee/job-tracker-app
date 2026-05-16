import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { authClient } from '../lib/auth-client';
import { AddApplicationButton } from './AddApplicationButton';
import { ProfileMenu } from './ProfileMenu';

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const showAdd = !location.pathname.startsWith('/applications/new');

  async function signOut() {
    await authClient.signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex items-center justify-between">
        <Link
          to="/"
          className="cursor-pointer rounded-lg text-2xl font-semibold tracking-tight text-neutral-900 transition-colors duration-200 hover:text-neutral-600 active:text-neutral-800"
        >
          CanCareer
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          {showAdd ? <AddApplicationButton /> : null}
          <ProfileMenu onSignOut={signOut} />
        </div>
      </header>
      <Outlet />
    </div>
  );
}
