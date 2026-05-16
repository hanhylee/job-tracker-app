import { ApplicationList } from '../components/ApplicationList';
import { ApplicationStats } from '../components/ApplicationStats';
import { useApplications } from '../hooks/use-applications';

export function HomePage() {
  const { data: applications = [], isLoading, isError, error } = useApplications();

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
        <ApplicationList applications={applications} isLoading={isLoading} />
      )}
    </section>
  );
}
