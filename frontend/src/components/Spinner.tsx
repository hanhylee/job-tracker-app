type SpinnerProps = {
  className?: string;
  label?: string;
};

export function Spinner({
  className = 'h-8 w-8',
  label = 'Loading',
}: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={`animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900 ${className}`}
    />
  );
}
