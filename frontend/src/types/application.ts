export const APPLICATION_STATUSES = [
  'saved',
  'applied',
  'interviewing',
  'offered',
  'rejected',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type Application = {
  id: string;
  userId: string;
  company: string;
  title: string;
  status: ApplicationStatus;
  jobUrl: string | null;
  jobDescription: string | null;
  resumeUrl: string | null;
  notes: string | null;
  appliedAt: Date | string | number | null;
  createdAt: Date | string | number | null;
  updatedAt: Date | string | number | null;
};

export type ApplicationInput = {
  company: string;
  title: string;
  status?: ApplicationStatus;
  jobUrl?: string;
  jobDescription?: string;
  notes?: string;
};

export type ApplicationUpdate = Partial<ApplicationInput>;
