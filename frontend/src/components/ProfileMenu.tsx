import { useEffect, useRef, useState } from 'react';
import { authClient } from '../lib/auth-client';
import { useMe } from '../hooks/use-me';

function getInitials(user: {
  name?: string | null;
  email?: string | null;
}): string {
  if (user.name?.trim()) {
    const parts = user.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (user.email) {
    return user.email.slice(0, 2).toUpperCase();
  }
  return '?';
}

type ProfileMenuProps = {
  onSignOut: () => void;
};

export function ProfileMenu({ onSignOut }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: session } = authClient.useSession();
  const { data: me } = useMe();
  const user = session?.user;
  const email = me?.email ?? user?.email ?? '';
  const isPro = me?.isPro === true;

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-sm font-medium text-neutral-700 shadow-sm ring-1 transition-all duration-200 ease-out hover:bg-neutral-50 hover:shadow-md active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 ${
          isPro
            ? open
              ? 'ring-emerald-400'
              : 'ring-emerald-300 hover:ring-emerald-400'
            : open
              ? 'ring-neutral-300'
              : 'ring-neutral-200 hover:ring-neutral-300'
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        {getInitials(user)}
        {isPro ? (
          <span
            className="absolute -bottom-0.5 -right-0.5 rounded-full bg-emerald-600 px-1 py-px text-[9px] font-bold leading-none text-white ring-2 ring-white"
            aria-hidden
          >
            Pro
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-[12rem] max-w-[16rem] overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-neutral-200"
        >
          <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
            {email ? (
              <p
                className="min-w-0 flex-1 truncate text-sm text-neutral-600"
                title={email}
              >
                {email}
              </p>
            ) : (
              <p className="min-w-0 flex-1 text-sm text-neutral-400">Signed in</p>
            )}
            {isPro ? (
              <span className="inline-flex shrink-0 items-center rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                Pro
              </span>
            ) : null}
          </div>
          <button
            type="button"
            role="menuitem"
            className="w-full cursor-pointer px-4 py-2.5 text-left text-sm text-neutral-700 transition-colors duration-200 hover:bg-neutral-50 hover:text-neutral-900 active:bg-neutral-100"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
