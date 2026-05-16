import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

type FieldProps = {
  label: string;
  error?: string;
};

export function Input({
  label,
  error,
  className = '',
  id,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <label className="block space-y-1.5" htmlFor={inputId}>
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <input
        id={inputId}
        className={`w-full rounded-xl border-0 bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-neutral-200 transition-all duration-200 placeholder:text-neutral-400 hover:ring-neutral-300 focus:ring-2 focus:ring-blue-500/30 ${error ? 'ring-red-300 hover:ring-red-300' : ''} ${className}`}
        {...props}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </label>
  );
}

export function Textarea({
  label,
  error,
  className = '',
  id,
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <label className="block space-y-1.5" htmlFor={inputId}>
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <textarea
        id={inputId}
        className={`min-h-[100px] w-full resize-y rounded-xl border-0 bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-neutral-200 transition-all duration-200 placeholder:text-neutral-400 hover:ring-neutral-300 focus:ring-2 focus:ring-blue-500/30 ${error ? 'ring-red-300 hover:ring-red-300' : ''} ${className}`}
        {...props}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </label>
  );
}

export function Select({
  label,
  error,
  className = '',
  id,
  children,
  ...props
}: FieldProps &
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    children: React.ReactNode;
  }) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <label className="block space-y-1.5" htmlFor={inputId}>
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <select
        id={inputId}
        className={`w-full appearance-none rounded-xl border-0 bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-neutral-200 transition-all duration-200 hover:ring-neutral-300 focus:ring-2 focus:ring-blue-500/30 ${error ? 'ring-red-300 hover:ring-red-300' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </label>
  );
}
