import { useState } from "react";

import { Link } from "react-router-dom";

import type { Application } from "../types/application";

import type { AnalysisRecord, AnalysisResult } from "../types/analysis";

import { downloadApplicationResume } from "../lib/download-resume";
import { roundScore, scoreBadgeClass } from "../lib/analysis-score-style";
import { Button } from "./Button";
import { Spinner } from "./Spinner";

type AnalysisViewProps = {
  application: Application;

  analysis: AnalysisRecord | null;

  loading?: boolean;

  reAnalyzeTo?: string;
};

export function AnalysisView({
  application,

  analysis,

  loading,

  reAnalyzeTo,
}: AnalysisViewProps) {
  const [jdOpen, setJdOpen] = useState(false);
  const [downloadingResume, setDownloadingResume] = useState(false);

  const hasResume = application.resumeUrl != null;

  const result = analysis?.result;

  const score = result?.overallScore ?? analysis?.overallScore ?? null;

  const rounded = score != null ? roundScore(score) : null;
  const isAnalyzing =
    analysis?.status === "pending" || analysis?.status === "running";

  async function handleDownloadResume() {
    if (!hasResume || downloadingResume) return;
    setDownloadingResume(true);
    try {
      await downloadApplicationResume(
        application.id,
        application.company,
        application.title,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed";
      window.alert(`Could not download resume: ${message}`);
    } finally {
      setDownloadingResume(false);
    }
  }

  return (
    <div className="space-y-6">
      {loading || isAnalyzing ? (
        <>
          {hasResume ? (
            <div className="flex justify-end">
              <DownloadResumeButton
                downloading={downloadingResume}
                onDownload={handleDownloadResume}
              />
            </div>
          ) : null}
          <AnalysisPendingState
            message={loading ? "Loading analysis…" : "Analyzing your resume…"}
          />
        </>
      ) : analysis?.status === "failed" ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
          {analysis.error ?? "Analysis failed"}
        </p>
      ) : result && rounded != null ? (
        <AnalysisContent
          result={result}
          rounded={rounded}
          jobDescription={application.jobDescription}
          jdOpen={jdOpen}
          onToggleJd={() => setJdOpen((v) => !v)}
          hasResume={hasResume}
          downloadingResume={downloadingResume}
          onDownloadResume={handleDownloadResume}
        />
      ) : (
        <p className="text-sm text-neutral-500">No analysis results yet.</p>
      )}

      {reAnalyzeTo && !loading && !isAnalyzing ? (
        <Link
          to={reAnalyzeTo}
          className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 shadow-sm ring-1 ring-neutral-200 transition-all duration-200 hover:bg-neutral-50 hover:ring-neutral-300"
        >
          Re-analyze
        </Link>
      ) : null}
    </div>
  );
}

function DownloadResumeButton({
  downloading,
  onDownload,
}: {
  downloading: boolean;
  onDownload: () => void;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      disabled={downloading}
      onClick={() => void onDownload()}
      className="shrink-0"
    >
      {downloading ? "Downloading…" : "Download resume"}
    </Button>
  );
}

function AnalysisPendingState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Spinner label={message} />
      <p className="text-sm text-neutral-500">{message}</p>
    </div>
  );
}

function AnalysisContent({
  result,
  rounded,
  jobDescription,
  jdOpen,
  onToggleJd,
  hasResume,
  downloadingResume,
  onDownloadResume,
}: {
  result: AnalysisResult;
  rounded: number;
  jobDescription: string | null | undefined;
  jdOpen: boolean;
  onToggleJd: () => void;
  hasResume: boolean;
  downloadingResume: boolean;
  onDownloadResume: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`inline-flex h-12 min-w-12 shrink-0 items-center justify-center rounded-xl px-2 text-lg font-bold tabular-nums ring-1 ${scoreBadgeClass(rounded)}`}
          >
            {rounded}
          </span>

          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-900">
              Overall resume score
            </p>

            <p className="text-xs text-neutral-500">
              Analyzed {formatAnalyzedAt(result.meta.analyzedAt)}
            </p>
          </div>
        </div>

        {hasResume ? (
          <DownloadResumeButton
            downloading={downloadingResume}
            onDownload={onDownloadResume}
          />
        ) : null}
      </div>

      {jobDescription?.trim() ? (
        <section className="overflow-hidden rounded-lg bg-neutral-50 ring-1 ring-neutral-200">
          <button
            type="button"
            onClick={onToggleJd}
            aria-expanded={jdOpen}
            className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-100/80"
          >
            Job description used
            <ChevronIcon
              className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform duration-200 ${jdOpen ? "rotate-180" : ""}`}
            />
          </button>

          {jdOpen ? (
            <div className="border-t border-neutral-200 px-3 py-3">
              <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-neutral-700">
                {jobDescription.trim()}
              </pre>
            </div>
          ) : null}
        </section>
      ) : null}

      <CategorySection
        title="Skills & keywords"
        category={result.categories.skills}
      />

      <CategorySection
        title="Experience & impact"
        category={result.categories.experience}
      />

      <CategorySection
        title="Role keywords"
        category={result.categories.titleAlignment}
      />

      <section>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium text-neutral-900">
            Resume readability
          </h3>

          <div className="flex items-baseline gap-3">
            {result.categories.atsFormatting.wordCount != null &&
            result.categories.atsFormatting.wordCount > 0 ? (
              <span className="text-xs text-neutral-500 tabular-nums">
                {result.categories.atsFormatting.wordCount} words
              </span>
            ) : null}
            <span className="text-sm font-semibold tabular-nums text-neutral-700">
              {roundScore(result.categories.atsFormatting.score)}/100
            </span>
          </div>
        </div>

        {(result.categories.atsFormatting.risks ?? []).length > 0 ? (
          <ul className="mt-2 list-inside list-disc text-sm text-neutral-600">
            {result.categories.atsFormatting.risks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-neutral-600">
            No major parsing issues detected.
          </p>
        )}

        {(result.categories.atsFormatting.tips ?? []).length > 0 ? (
          <ul className="mt-2 list-inside list-disc text-xs text-neutral-500">
            {result.categories.atsFormatting.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        ) : null}
      </section>

      {result.actions.length > 0 ? (
        <section>
          <h3 className="text-sm font-medium text-neutral-900">
            Recommended actions
          </h3>

          <ol className="mt-2 space-y-2">
            {[...result.actions]

              .sort((a, b) => a.priority - b.priority)

              .map((action, i) => (
                <li
                  key={`${action.priority}-${i}`}
                  className="rounded-lg bg-neutral-50 px-3 py-2 text-sm ring-1 ring-neutral-100"
                >
                  <p className="text-neutral-800">{action.message}</p>

                  {action.suggestion ? (
                    <p className="mt-1 text-xs text-neutral-500">
                      {action.suggestion}
                    </p>
                  ) : null}
                </li>
              ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

function CategorySection({
  title,

  category,
}: {
  title: string;

  category: {
    score: number;

    summary: string;

    matched: string[];

    missing: string[];
  };
}) {
  const scoreRounded = roundScore(category.score);

  return (
    <section>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-neutral-900">{title}</h3>

        <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-700">
          {scoreRounded}/100
        </span>
      </div>

      <p className="mt-1 text-sm text-neutral-600">{category.summary}</p>

      {category.matched.length > 0 ? (
        <p className="mt-1 text-xs text-neutral-500">
          Matched: {category.matched.slice(0, 8).join(", ")}
          {category.matched.length > 8 ? "…" : ""}
        </p>
      ) : null}

      {category.missing.length > 0 ? (
        <p className="mt-1 text-xs text-neutral-500">
          Missing: {category.missing.slice(0, 8).join(", ")}
          {category.missing.length > 8 ? "…" : ""}
        </p>
      ) : null}
    </section>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function formatAnalyzedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",

      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}
