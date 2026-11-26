import type { KpiData } from '@/types';

interface ActiveDutyCardProps {
  data: KpiData | undefined;
  isLoading: boolean;
}

export default function ActiveDutyCard({ data, isLoading }: ActiveDutyCardProps) {
  const pct = data ? Math.round((data.activeLabours / data.totalLabours) * 100) : 0;

  return (
    <div className="hq-card flex flex-col gap-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs text-hq-muted font-semibold uppercase tracking-wider">Active Duty</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-hq-accent animate-pulse" />
          <span className="text-xs text-hq-accent font-mono">LIVE</span>
        </div>
      </div>

      {isLoading ? (
        <div className="h-8 bg-hq-border rounded animate-pulse w-24" />
      ) : (
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-hq-text font-mono">
            {data?.activeLabours ?? '—'}
          </span>
          <span className="text-sm text-hq-muted mb-0.5">
            / {data?.totalLabours ?? '—'} labours
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div className="w-full bg-hq-border rounded-full h-1.5 overflow-hidden">
        <div
          className="h-1.5 rounded-full bg-hq-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-hq-muted">{pct}% on duty today</div>
    </div>
  );
}
