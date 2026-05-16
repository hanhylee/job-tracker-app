import { Link } from 'react-router-dom';

function PlusIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M9 3.5v11M3.5 9h11"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AddApplicationButton() {
  return (
    <Link
      to="/applications/new"
      aria-label="Add application"
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-neutral-900 text-white shadow-sm transition-all duration-200 ease-out hover:bg-neutral-800 hover:shadow-md active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
    >
      <PlusIcon />
    </Link>
  );
}
