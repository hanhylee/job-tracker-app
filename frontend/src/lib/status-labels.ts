import type { ApplicationStatus } from '../types/application';

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: 'Saved',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offered: 'Offered',
  rejected: 'Rejected',
};

/** Short labels for compact table selects */
export const STATUS_SHORT_LABELS: Record<ApplicationStatus, string> = {
  saved: 'Saved',
  applied: 'Applied',
  interviewing: 'Interview',
  offered: 'Offer',
  rejected: 'Reject',
};

export const STATUS_SELECT_STYLES: Record<ApplicationStatus, string> = {
  saved: 'bg-neutral-50 text-neutral-700 ring-neutral-200',
  applied: 'bg-blue-50 text-blue-700 ring-blue-200',
  interviewing: 'bg-violet-50 text-violet-700 ring-violet-200',
  offered: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected: 'bg-red-50 text-red-700 ring-red-200',
};
