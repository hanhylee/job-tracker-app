import { useState } from 'react';
import type { Application } from '../types/application';
import { APPLICATION_STATUSES } from '../types/application';
import {
  applicationFormSchema,
  type ApplicationFormValues,
} from '../lib/schemas';
import { Button } from './Button';
import { Input, Select, Textarea } from './Input';
import { ResumeField } from './ResumeField';

type PendingResumeProps = {
  resumeMode: 'pending';
  pendingResumeFile: File | null;
  onPendingResumeChange: (file: File | null) => void;
};

type LiveResumeProps = {
  resumeMode: 'live';
  applicationId: string;
  resumeCompany: string;
  resumeTitle: string;
  hasResume: boolean;
};

type ApplicationFormProps = {
  initial?: Application;
  onSubmit: (values: ApplicationFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  submitLabel?: string;
} & (PendingResumeProps | LiveResumeProps | { resumeMode?: undefined });

const emptyValues: ApplicationFormValues = {
  company: '',
  title: '',
  status: 'applied',
  jobUrl: '',
  notes: '',
};

export function ApplicationForm(props: ApplicationFormProps) {
  const { initial, onSubmit, onDelete, submitLabel = 'Save', resumeMode } = props;
  const [values, setValues] = useState<ApplicationFormValues>(
    initial
      ? {
          company: initial.company,
          title: initial.title,
          status: initial.status,
          jobUrl: initial.jobUrl ?? '',
          notes: initial.notes ?? '',
        }
      : emptyValues,
  );
  const [errors, setErrors] = useState<Partial<Record<keyof ApplicationFormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function update<K extends keyof ApplicationFormValues>(
    key: K,
    value: ApplicationFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = applicationFormSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ApplicationFormValues;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!onDelete || !confirm('Delete this application?')) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Company"
        value={values.company}
        onChange={(e) => update('company', e.target.value)}
        error={errors.company}
        autoComplete="organization"
        required
      />
      <Input
        label="Role"
        value={values.title}
        onChange={(e) => update('title', e.target.value)}
        error={errors.title}
        required
      />
      <Select
        label="Status"
        value={values.status}
        onChange={(e) =>
          update('status', e.target.value as ApplicationFormValues['status'])
        }
        error={errors.status}
      >
        {APPLICATION_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </option>
        ))}
      </Select>
      <Input
        label="Job URL"
        type="url"
        value={values.jobUrl ?? ''}
        onChange={(e) => update('jobUrl', e.target.value)}
        error={errors.jobUrl}
        placeholder="https://"
      />
      <Textarea
        label="Notes"
        value={values.notes ?? ''}
        onChange={(e) => update('notes', e.target.value)}
        error={errors.notes}
      />
      {resumeMode === 'pending' ? (
        <ResumeField
          mode="pending"
          file={props.pendingResumeFile}
          onFileChange={props.onPendingResumeChange}
        />
      ) : null}
      {resumeMode === 'live' ? (
        <ResumeField
          mode="live"
          applicationId={props.applicationId}
          company={props.resumeCompany}
          title={props.resumeTitle}
          hasResume={props.hasResume}
        />
      ) : null}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitting ? 'Saving…' : submitLabel}
        </Button>
        {onDelete ? (
          <Button
            type="button"
            variant="dangerOutline"
            disabled={deleting}
            onClick={handleDelete}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
