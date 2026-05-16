import { Link } from 'react-router-dom';
import type { Application, ApplicationStatus } from '../types/application';
import { APPLICATION_STATUSES } from '../types/application';
import { formatAppliedDate, truncateText } from '../lib/format';
import { STATUS_SELECT_STYLES, STATUS_SHORT_LABELS } from '../lib/status-labels';
import { useUpdateApplication } from '../hooks/use-applications';
import { PencilIcon } from './icons/PencilIcon';

type ApplicationRowProps = {
  application: Application;
};

export function ApplicationRow({ application }: ApplicationRowProps) {
  const updateMutation = useUpdateApplication();
  const notesPreview = truncateText(application.notes);
  const isUpdating =
    updateMutation.isPending &&
    updateMutation.variables?.id === application.id;

  function handleStatusChange(next: ApplicationStatus) {
    if (next === application.status) return;
    updateMutation.mutate({ id: application.id, data: { status: next } });
  }

  return (
    <tr className="group border-b border-neutral-100 transition-colors last:border-0 hover:bg-neutral-50">
      <td className="max-w-0 truncate py-2 pl-3 pr-1 text-sm font-medium text-neutral-900">
        <span title={application.company}>{application.company}</span>
      </td>
      <td className="max-w-0 truncate py-2 px-1 text-sm">
        {application.jobUrl ? (
          <a
            href={application.jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-blue-600 underline-offset-2 hover:text-blue-800 hover:underline"
            title={application.title}
          >
            {application.title}
          </a>
        ) : (
          <span className="block truncate text-neutral-600" title={application.title}>
            {application.title}
          </span>
        )}
      </td>
      <td className="py-2 px-1">
        <select
          value={application.status}
          disabled={isUpdating}
          onChange={(e) =>
            handleStatusChange(e.target.value as ApplicationStatus)
          }
          aria-label={`Status for ${application.company}`}
          className={`h-7 w-full max-w-[5.5rem] cursor-pointer appearance-none truncate rounded-md px-1.5 text-[11px] font-medium ring-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:cursor-wait disabled:opacity-60 ${STATUS_SELECT_STYLES[application.status]}`}
        >
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_SHORT_LABELS[s]}
            </option>
          ))}
        </select>
      </td>
      <td className="whitespace-nowrap py-2 px-1 text-xs tabular-nums text-neutral-500">
        {formatAppliedDate(application.appliedAt)}
      </td>
      <td className="max-w-0 truncate py-2 px-1 text-xs text-neutral-500">
        <span title={application.notes?.trim() || undefined}>{notesPreview}</span>
      </td>
      <td className="py-2 pr-2 pl-1 text-center">
        <Link
          to={`/applications/${application.id}`}
          aria-label={`Edit ${application.company}`}
          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
        >
          <PencilIcon />
        </Link>
      </td>
    </tr>
  );
}
