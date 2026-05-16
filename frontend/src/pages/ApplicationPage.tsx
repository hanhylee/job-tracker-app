import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApplicationForm } from '../components/ApplicationForm';
import {
  useApplication,
  useCreateApplication,
  useDeleteApplication,
  useUpdateApplication,
} from '../hooks/use-applications';
import type { ApplicationFormValues } from '../lib/schemas';

export function ApplicationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const { data: application, isLoading, isError } = useApplication(
    isNew ? undefined : id,
  );
  const createMutation = useCreateApplication();
  const updateMutation = useUpdateApplication();
  const deleteMutation = useDeleteApplication();

  async function handleSubmit(values: ApplicationFormValues) {
    const payload = {
      company: values.company,
      title: values.title,
      status: values.status,
      jobUrl: values.jobUrl || undefined,
      notes: values.notes || undefined,
    };

    if (isNew) {
      await createMutation.mutateAsync(payload);
    } else if (id) {
      await updateMutation.mutateAsync({ id, data: payload });
    }
    navigate('/', { replace: true });
  }

  async function handleDelete() {
    if (!id || isNew) return;
    await deleteMutation.mutateAsync(id);
    navigate('/', { replace: true });
  }

  if (!isNew && isLoading) {
    return (
      <div className="h-64 animate-pulse rounded-2xl bg-white/80 shadow-sm" />
    );
  }

  if (!isNew && (isError || !application)) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="text-neutral-500">Application not found.</p>
        <Link
          to="/"
          className="mt-4 inline-block text-sm text-blue-600 transition-colors duration-200 hover:text-blue-800 hover:underline"
        >
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <section>
      <Link
        to="/"
        className="mb-6 inline-flex rounded-lg px-1 py-0.5 text-sm text-neutral-500 transition-colors duration-200 hover:bg-neutral-100 hover:text-neutral-900 active:text-neutral-700"
      >
        ← Back
      </Link>
      <h2 className="mb-6 text-xl font-semibold tracking-tight text-neutral-900">
        {isNew ? 'New application' : 'Edit application'}
      </h2>
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-100 transition-shadow duration-200 hover:shadow-md">
        <ApplicationForm
          initial={application}
          onSubmit={handleSubmit}
          onDelete={isNew ? undefined : handleDelete}
          submitLabel={isNew ? 'Create' : 'Save'}
        />
      </div>
    </section>
  );
}
