import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Application, ApplicationStatus } from '../types/application';
import type { AnalysisRecord } from '../types/analysis';
import { APPLICATION_STATUSES } from '../types/application';
import { ApiError } from '../api/client';
import { downloadApplicationResume } from '../lib/download-resume';
import { formatAppliedDate, truncateText } from '../lib/format';
import { roundScore, scoreBadgeClass } from '../lib/analysis-score-style';
import { getRowAnalysisState } from '../hooks/use-analysis';
import { STATUS_SELECT_STYLES, STATUS_SHORT_LABELS } from '../lib/status-labels';
import { useUpdateApplication } from '../hooks/use-applications';
import { AnalyzeIcon } from './icons/AnalyzeIcon';
import { PencilIcon } from './icons/PencilIcon';

type ApplicationRowProps = {
  application: Application;
  analysis?: AnalysisRecord | null;
  onAnalyze?: (app: Application) => void;
  onViewAnalysis?: (app: Application) => void;
};

export function ApplicationRow({
  application,
  analysis = null,
  onAnalyze,
  onViewAnalysis,
}: ApplicationRowProps) {
  const updateMutation = useUpdateApplication();
  const [downloadingResume, setDownloadingResume] = useState(false);
  const notesPreview = truncateText(application.notes);
  const hasResume = application.resumeUrl != null;
  const appliedLabel = formatAppliedDate(application.appliedAt);
  const isUpdating =
    updateMutation.isPending &&
    updateMutation.variables?.id === application.id;

  const { showScore, showAnalyze, overallScore } = getRowAnalysisState(analysis);

  const cell = 'py-2.5 px-1 text-sm leading-snug text-neutral-700';
  const cellTruncate = `${cell} max-w-0 truncate`;

  function handleStatusChange(next: ApplicationStatus) {
    if (next === application.status) return;
    updateMutation.mutate({ id: application.id, data: { status: next } });
  }

  async function handleResumeDownload() {
    if (!hasResume || downloadingResume) return;
    setDownloadingResume(true);
    try {
      await downloadApplicationResume(
        application.id,
        application.company,
        application.title,
      );
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Download failed';
      window.alert(`Could not download resume: ${message}`);
    } finally {
      setDownloadingResume(false);
    }
  }

  return (
    <tr className="group border-b border-neutral-100 transition-colors last:border-0 hover:bg-neutral-50">
      <td className={`${cellTruncate} pl-3 pr-1 font-medium text-neutral-900`}>
        <span title={application.company}>{application.company}</span>
      </td>
      <td className={cellTruncate}>
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
          <span className="block truncate" title={application.title}>
            {application.title}
          </span>
        )}
      </td>
      <td className="py-2.5 px-1">
        <select
          value={application.status}
          disabled={isUpdating}
          onChange={(e) =>
            handleStatusChange(e.target.value as ApplicationStatus)
          }
          aria-label={`Status for ${application.company}`}
          className={`h-8 w-full max-w-[6.5rem] cursor-pointer appearance-none truncate rounded-md px-2 text-sm font-medium ring-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:cursor-wait disabled:opacity-60 ${STATUS_SELECT_STYLES[application.status]}`}
        >
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_SHORT_LABELS[s]}
            </option>
          ))}
        </select>
      </td>
      <td className={`${cell} whitespace-nowrap tabular-nums`}>
        {hasResume ? (
          <button
            type="button"
            onClick={() => void handleResumeDownload()}
            disabled={downloadingResume}
            title="Download resume"
            aria-label={`Download resume for ${application.company}`}
            className="cursor-pointer text-blue-600 underline-offset-2 hover:text-blue-800 hover:underline disabled:cursor-wait disabled:opacity-60"
          >
            {downloadingResume ? '…' : appliedLabel}
          </button>
        ) : (
          <span className="text-neutral-500">{appliedLabel}</span>
        )}
      </td>
      <td className={`${cellTruncate} text-neutral-500`}>
        <span title={application.notes?.trim() || undefined}>{notesPreview}</span>
      </td>
      <td className="py-2.5 pr-2 pl-1">
        <div className="flex items-center justify-center gap-0.5">
          {showScore && overallScore != null && onViewAnalysis ? (
            <button
              type="button"
              onClick={() => onViewAnalysis(application)}
              aria-label={`ATS score ${roundScore(overallScore)} for ${application.company}`}
              className={`inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-md px-1.5 text-sm font-semibold tabular-nums ring-1 transition-colors ${scoreBadgeClass(overallScore)}`}
            >
              {roundScore(overallScore)}
            </button>
          ) : showAnalyze && onAnalyze ? (
            <button
              type="button"
              onClick={() => onAnalyze(application)}
              aria-label={`Analyze resume for ${application.company}`}
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              <AnalyzeIcon />
            </button>
          ) : null}
          <Link
            to={`/applications/${application.id}`}
            aria-label={`Edit ${application.company}`}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <PencilIcon />
          </Link>
        </div>
      </td>
    </tr>
  );
}
