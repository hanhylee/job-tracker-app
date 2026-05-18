import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AnalyzeForm } from '../components/AnalyzeForm';
import { useToast } from '../components/ToastProvider';
import { useApplication } from '../hooks/use-applications';
import { useMe } from '../hooks/use-me';
import { runAnalysisPipeline } from '../hooks/use-analysis';

export function AnalyzePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: me, isSuccess: meLoaded } = useMe();
  const isPro = me?.isPro === true;

  const { data: application, isLoading, isError } = useApplication(id);

  async function handleRun(input: {
    applicationId: string;
    jobDescription: string;
    resumeFile: File | null;
    hasResume: boolean;
  }) {
    const final = await runAnalysisPipeline(input, queryClient);
    if (final.status === 'failed') {
      throw new Error(final.error ?? 'Analysis failed');
    }
    showToast({ variant: 'success', message: 'Analysis complete' });
    navigate(`/applications/${input.applicationId}/analysis`, { replace: true });
    return final;
  }

  if (isLoading) {
    return (
      <div className="h-64 animate-pulse rounded-2xl bg-white/80 shadow-sm" />
    );
  }

  if (isError || !application || !id) {
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
        Analyze resume
      </h2>
      <p className="mb-6 mt-1 text-sm text-neutral-500">
        {application.company} — {application.title}
      </p>
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-100 transition-shadow duration-200 hover:shadow-md">
        <AnalyzeForm
          application={application}
          isPro={!meLoaded || isPro}
          proMembershipKnown={meLoaded}
          onRun={handleRun}
        />
      </div>
    </section>
  );
}
