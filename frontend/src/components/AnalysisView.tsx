import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Application } from '../types/application';
import type { AnalysisRecord, AnalysisResult } from '../types/analysis';
import { roundScore, scoreBadgeClass } from '../lib/analysis-score-style';

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

  const result = analysis?.result;
  const score = result?.overallScore ?? analysis?.overallScore ?? null;
  const rounded = score != null ? roundScore(score) : null;

  return (
    <div className="space-y-6">
      {loading ? (
        <p className="text-sm text-neutral-500">Loading analysis…</p>
      ) : analysis?.status === 'failed' ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
          {analysis.error ?? 'Analysis failed'}
        </p>
      ) : result && rounded != null ? (
        <AnalysisContent
          result={result}
          rounded={rounded}
          jobDescription={application.jobDescription}
          jdOpen={jdOpen}
          onToggleJd={() => setJdOpen((v) => !v)}
        />
      ) : (
        <p className="text-sm text-neutral-500">No analysis results yet.</p>
      )}

      {reAnalyzeTo ? (
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

function AnalysisContent({
  result,
  rounded,
  jobDescription,
  jdOpen,
  onToggleJd,
}: {
  result: AnalysisResult;
  rounded: number;
  jobDescription: string | null | undefined;
  jdOpen: boolean;
  onToggleJd: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-12 min-w-12 items-center justify-center rounded-xl px-2 text-lg font-bold tabular-nums ring-1 ${scoreBadgeClass(rounded)}`}
        >
          {rounded}
        </span>
        <div>
          <p className="text-sm font-medium text-neutral-900">Overall ATS score</p>
          <p className="text-xs text-neutral-500">
            Analyzed {formatAnalyzedAt(result.meta.analyzedAt)}
          </p>
        </div>
      </div>

      {jobDescription?.trim() ? (
        <section>
          <button
            type="button"
            onClick={onToggleJd}
            className="flex w-full items-center justify-between text-left text-sm font-medium text-neutral-700"
          >
            Job description used
            <span className="text-neutral-400">{jdOpen ? '−' : '+'}</span>
          </button>
          {jdOpen ? (
            <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-neutral-50 p-3 font-mono text-xs text-neutral-700 ring-1 ring-neutral-200">
              {jobDescription.trim()}
            </pre>
          ) : null}
        </section>
      ) : null}

      <CategorySection title="Skills" category={result.categories.skills} />
      <CategorySection title="Experience" category={result.categories.experience} />
      <CategorySection
        title="Title alignment"
        category={result.categories.titleAlignment}
      />
      <CategorySection
        title="ATS formatting"
        category={{
          score: result.categories.atsFormatting.score,
          summary:
            result.categories.atsFormatting.risks.join(' ') ||
            'No formatting issues detected.',
          matched: [],
          missing: [],
        }}
      />

      <KeywordSection label="Required keywords" items={result.keywords.required} />
      <KeywordSection label="Preferred keywords" items={result.keywords.preferred} />

      {result.actions.length > 0 ? (
        <section>
          <h3 className="text-sm font-medium text-neutral-900">Recommended actions</h3>
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
                    <p className="mt-1 text-xs text-neutral-500">{action.suggestion}</p>
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
  return (
    <section>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-neutral-900">{title}</h3>
        <span className="text-sm font-semibold tabular-nums text-neutral-700">
          {roundScore(category.score)}
        </span>
      </div>
      <p className="mt-1 text-sm text-neutral-600">{category.summary}</p>
      {category.missing.length > 0 ? (
        <p className="mt-2 text-xs text-neutral-500">
          Missing: {category.missing.slice(0, 8).join(', ')}
          {category.missing.length > 8 ? '…' : ''}
        </p>
      ) : null}
    </section>
  );
}

function KeywordSection({
  label,
  items,
}: {
  label: string;
  items: { term: string; found: boolean }[];
}) {
  if (items.length === 0) return null;
  const missing = items.filter((k) => !k.found);
  return (
    <section>
      <h3 className="text-sm font-medium text-neutral-900">{label}</h3>
      <p className="mt-1 text-xs text-neutral-500">
        {items.filter((k) => k.found).length} of {items.length} found
        {missing.length > 0
          ? ` · Missing: ${missing
              .slice(0, 6)
              .map((k) => k.term)
              .join(', ')}${missing.length > 6 ? '…' : ''}`
          : ''}
      </p>
    </section>
  );
}

function formatAnalyzedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}
