import { useEffect, useRef, useState } from 'react';
import { authClient } from '../lib/auth-client';

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
  const user = session?.user;

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
        className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-sm font-medium text-neutral-700 shadow-sm ring-1 transition-all duration-200 ease-out hover:bg-neutral-50 hover:ring-neutral-300 hover:shadow-md active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 ${open ? 'ring-neutral-300' : 'ring-neutral-200'}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        {getInitials(user)}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-36 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-neutral-200"
        >
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
