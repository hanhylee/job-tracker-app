import type { Application } from '../types/application';
import type { AnalysisRecord } from '../types/analysis';
import { ApplicationRow } from './ApplicationRow';

export type ApplicationRowHandlers = {
  onAnalyze: (app: Application) => void;
  onViewAnalysis: (app: Application) => void;
  getAnalysis: (id: string) => AnalysisRecord | null;
};

type ApplicationListProps = {
  applications: Application[];
  isLoading?: boolean;
  rowHandlers?: ApplicationRowHandlers;
};

const thClass =
  'px-1 pb-2 text-left text-xs font-medium uppercase tracking-wide text-neutral-400';

export function ApplicationList({
  applications,
  isLoading,
  rowHandlers,
}: ApplicationListProps) {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-neutral-100">
        <table className="w-full table-fixed">
          <tbody>
            {[1, 2, 3].map((i) => (
              <tr key={i} className="border-b border-neutral-100 last:border-0">
                <td colSpan={6} className="p-3">
                  <div className="h-4 animate-pulse rounded bg-neutral-100" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <p className="text-neutral-500">No applications yet.</p>
        <p className="mt-1 text-sm text-neutral-400">
          Tap + to track your first role.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-neutral-100">
      <table className="w-full table-fixed">
        <colgroup>
          <col className="w-[16%]" />
          <col className="w-[24%]" />
          <col className="w-[16%]" />
          <col className="w-[16%]" />
          <col />
          <col className="w-[4.75rem]" />
        </colgroup>
        <thead>
          <tr>
            <th className={`${thClass} pl-3`}>Company</th>
            <th className={thClass}>Role</th>
            <th className={thClass}>Status</th>
            <th className={thClass}>Applied</th>
            <th className={thClass}>Notes</th>
            <th className={`${thClass} pr-2`} aria-hidden />
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <ApplicationRow
              key={app.id}
              application={app}
              analysis={rowHandlers?.getAnalysis(app.id) ?? null}
              onAnalyze={rowHandlers?.onAnalyze}
              onViewAnalysis={rowHandlers?.onViewAnalysis}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
