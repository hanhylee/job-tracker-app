import { z } from 'zod';
import { APPLICATION_STATUSES } from '../types/application';

export const applicationFormSchema = z.object({
  company: z.string().min(1, 'Company is required'),
  title: z.string().min(1, 'Title is required'),
  status: z.enum(APPLICATION_STATUSES),
  jobUrl: z
    .string()
    .refine((v) => !v || /^https?:\/\/.+/.test(v), 'Enter a valid URL'),
  notes: z.string(),
});

export type ApplicationFormValues = z.infer<typeof applicationFormSchema>;
