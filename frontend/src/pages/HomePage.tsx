import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApplicationList } from '../components/ApplicationList';
import { ApplicationStats } from '../components/ApplicationStats';
import { useToast } from '../components/ToastProvider';
import { useApplications } from '../hooks/use-applications';
import { useMe } from '../hooks/use-me';
import { useApplicationsAnalysisMap } from '../hooks/use-analysis';
import type { Application } from '../types/application';

export function HomePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: me, isSuccess: meLoaded } = useMe();
  const isPro = me?.isPro === true;

  const { data: applications = [], isLoading, isError, error } = useApplications();
  const ids = useMemo(() => applications.map((a) => a.id), [applications]);
  const { map: analysisMap } = useApplicationsAnalysisMap(ids);

  const rowHandlers = useMemo(
    () => ({
      onAnalyze: (app: Application) => {
        if (meLoaded && !isPro) {
          showToast({ variant: 'error', message: 'Pro membership required' });
          return;
        }
        navigate(`/applications/${app.id}/analyze`);
      },
      onViewAnalysis: (app: Application) => {
        navigate(`/applications/${app.id}/analysis`);
      },
      getAnalysis: (id: string) => analysisMap.get(id) ?? null,
    }),
    [analysisMap, meLoaded, isPro, navigate, showToast],
  );

  return (
    <section>
      {!isLoading && !isError ? (
        <ApplicationStats applications={applications} />
      ) : null}

      {isError ? (
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700" role="alert">
          {(error as Error)?.message ?? 'Failed to load applications'}
        </div>
      ) : (
        <ApplicationList
          applications={applications}
          isLoading={isLoading}
          rowHandlers={rowHandlers}
        />
      )}
    </section>
  );
}
