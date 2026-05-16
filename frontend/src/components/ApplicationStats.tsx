import type { Application } from '../types/application';

type ApplicationStatsProps = {
  applications: Application[];
};

function StatPill({
  label,
  count,
  className,
}: {
  label: string;
  count: number;
  className: string;
}) {
  return (
    <div
      className={`rounded-xl px-3 py-2 text-center ring-1 ring-neutral-100 transition-all duration-200 ease-out hover:shadow-sm hover:ring-neutral-200 ${className}`}
    >
      <p className="text-lg font-semibold tabular-nums text-neutral-900">{count}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}


export function ApplicationStats({ applications }: ApplicationStatsProps) {
  const interviewing = applications.filter(
    (a) => a.status === 'interviewing',
  ).length;
  const offered = applications.filter((a) => a.status === 'offered').length;
  const rejected = applications.filter((a) => a.status === 'rejected').length;

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatPill
        label="Total"
        count={applications.length}
        className="bg-neutral-50 hover:bg-neutral-100/80"
      />
      <StatPill
        label="Interviewing"
        count={interviewing}
        className="bg-violet-50 hover:bg-violet-100/80"
      />
      <StatPill
        label="Offers"
        count={offered}
        className="bg-emerald-50 hover:bg-emerald-100/80"
      />
      <StatPill
        label="Rejected"
        count={rejected}
        className="bg-red-50 hover:bg-red-100/80"
      />
    </div>
  );
}
