import type { ApplicationStatus } from '../types/application';

const styles: Record<ApplicationStatus, string> = {
  saved: 'bg-neutral-100 text-neutral-600',
  applied: 'bg-blue-50 text-blue-700',
  interviewing: 'bg-violet-50 text-violet-700',
  offered: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-600',
};

const labels: Record<ApplicationStatus, string> = {
  saved: 'Saved',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offered: 'Offered',
  rejected: 'Rejected',
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
