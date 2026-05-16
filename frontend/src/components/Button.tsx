import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const variants: Record<Variant, string> = {
  primary:
    'bg-neutral-900 text-white shadow-sm hover:bg-neutral-800 hover:shadow-md active:bg-neutral-950 disabled:bg-neutral-400 disabled:shadow-none disabled:hover:bg-neutral-400',
  secondary:
    'bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-200 hover:bg-neutral-50 hover:ring-neutral-300 hover:shadow-md active:bg-neutral-100 disabled:hover:bg-white disabled:hover:ring-neutral-200',
  danger:
    'bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow-md active:bg-red-800 disabled:bg-red-300 disabled:shadow-none disabled:hover:bg-red-300',
  ghost:
    'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 active:bg-neutral-200 disabled:hover:bg-transparent disabled:hover:text-neutral-600',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex cursor-pointer items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
