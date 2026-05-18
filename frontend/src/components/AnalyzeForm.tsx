import { useEffect, useRef, useState } from 'react';
import type { Application } from '../types/application';
import type { AnalysisRecord } from '../types/analysis';
import { ApiError } from '../api/client';
import { isProRequiredError } from '../api/analysis';
import { validateResumeFile } from '../lib/resume-validation';
import { downloadApplicationResume } from '../lib/download-resume';
import { Button } from './Button';

type AnalyzeFormProps = {
  application: Application;
  isPro: boolean;
  /** When false, do not show the Pro-required banner yet (membership still loading). */
  proMembershipKnown?: boolean;
  onRun: (input: {
    applicationId: string;
    jobDescription: string;
    resumeFile: File | null;
    hasResume: boolean;
  }) => Promise<AnalysisRecord>;
};

export function AnalyzeForm({
  application,
  isPro,
  proMembershipKnown = true,
  onRun,
}: AnalyzeFormProps) {
  const [jd, setJd] = useState(application.jobDescription ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasResume = application.resumeUrl != null;

  useEffect(() => {
    setJd(application.jobDescription ?? '');
    setFile(null);
    setError(undefined);
    if (fileRef.current) fileRef.current.value = '';
  }, [application.id, application.jobDescription]);

  async function handleFileChange(selected: File | null) {
    if (!selected) {
      setFile(null);
      return;
    }
    const validationError = await validateResumeFile(selected);
    if (validationError) {
      setError(validationError);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setError(undefined);
    setFile(selected);
  }

  async function handleDownload() {
    setError(undefined);
    setDownloading(true);
    try {
      await downloadApplicationResume(
        application.id,
        application.company,
        application.title,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isPro) return;
    const trimmed = jd.trim();
    if (!trimmed) {
      setError('Job description is required');
      return;
    }
    if (!hasResume && !file) {
      setError('Upload a resume PDF to analyze');
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      await onRun({
        applicationId: application.id,
        jobDescription: trimmed,
        resumeFile: file,
        hasResume,
      });
    } catch (err) {
      if (isProRequiredError(err)) {
        setError('Pro membership required');
      } else {
        setError(err instanceof ApiError ? err.message : 'Analysis failed');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    isPro && jd.trim().length > 0 && (hasResume || file != null);

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      {proMembershipKnown && !isPro ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
          Pro membership is required to run resume analysis.
        </p>
      ) : null}
      {!proMembershipKnown ? (
        <p className="text-sm text-neutral-500">Checking membership…</p>
      ) : null}

      <div className="block space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-neutral-700">Job description</span>
          {application.jobUrl?.trim() ? (
            <a
              href={application.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs text-blue-600 underline-offset-2 hover:text-blue-800 hover:underline"
            >
              Go to job URL
            </a>
          ) : null}
        </div>
        <textarea
          id="analyze-job-description"
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          rows={10}
          className="min-h-[100px] w-full resize-y rounded-xl border-0 bg-white px-4 py-3 font-mono text-sm shadow-sm ring-1 ring-neutral-200 transition-all duration-200 placeholder:text-neutral-400 hover:ring-neutral-300 focus:ring-2 focus:ring-blue-500/30"
          placeholder="Paste the full job description here…"
          disabled={submitting || !isPro}
        />
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <span className="text-sm font-medium text-neutral-700">Resume (PDF)</span>
          {!hasResume && !file ? (
            <p className="text-xs text-neutral-500">Required. Max 5 MB.</p>
          ) : null}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          disabled={submitting || !isPro}
          onChange={(e) => void handleFileChange(e.target.files?.[0] ?? null)}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            {file ? (
              <p className="text-sm text-neutral-600">
                Selected:{' '}
                <span className="font-medium text-neutral-800">{file.name}</span>
              </p>
            ) : hasResume ? (
              <p className="text-sm text-neutral-600">Resume attached</p>
            ) : (
              <p className="text-sm text-neutral-500">No resume uploaded</p>
            )}
            {hasResume && !file ? (
              <p className="text-xs text-neutral-500">
                Choose a new file if you&apos;d like to replace the resume.
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2">
            {hasResume && !file ? (
              <Button
                type="button"
                variant="secondary"
                disabled={downloading || submitting}
                onClick={() => void handleDownload()}
              >
                {downloading ? 'Downloading…' : 'Download'}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              disabled={submitting || !isPro}
              onClick={() => fileRef.current?.click()}
            >
              Choose file
            </Button>
          </div>
        </div>
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <Button type="submit" disabled={submitting || !canSubmit} className="w-full sm:w-auto">
        {submitting ? 'Analyzing…' : 'Run analysis'}
      </Button>
    </form>
  );
}



