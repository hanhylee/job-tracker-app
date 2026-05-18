import { Link, useParams } from 'react-router-dom';
import { AnalysisView } from '../components/AnalysisView';
import { useApplication } from '../hooks/use-applications';
import { useLatestAnalysis } from '../hooks/use-analysis';

export function AnalysisPage() {
  const { id } = useParams();

  const { data: application, isLoading: appLoading, isError: appError } =
    useApplication(id);
  const {
    data: analysis,
    isLoading: analysisLoading,
    isError: analysisError,
  } = useLatestAnalysis(id);

  if (appLoading) {
    return (
      <div className="h-64 animate-pulse rounded-2xl bg-white/80 shadow-sm" />
    );
  }

  if (appError || !application || !id) {
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
      <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
        ATS analysis
      </h2>
      <p className="mb-6 mt-1 text-sm text-neutral-500">
        {application.company} — {application.title}
      </p>
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-100 transition-shadow duration-200 hover:shadow-md">
        <AnalysisView
          application={application}
          analysis={analysis ?? null}
          loading={analysisLoading}
          reAnalyzeTo={`/applications/${id}/analyze`}
        />
        {analysisError && !analysisLoading ? (
          <p className="mt-4 text-sm text-red-600">Could not load analysis.</p>
        ) : null}
      </div>
    </section>
  );
}
