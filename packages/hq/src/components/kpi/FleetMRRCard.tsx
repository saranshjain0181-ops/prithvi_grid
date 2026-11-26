import type { KpiData } from '@/types';

interface FleetMRRCardProps {
  data: KpiData | undefined;
  isLoading: boolean;
}

export default function FleetMRRCard({ data, isLoading }: FleetMRRCardProps) {
  const trend = data?.fleetMRRTrend ?? 0;
  const isUp = trend >= 0;

  return (
    <div className="hq-card flex flex-col gap-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs text-hq-muted font-semibold uppercase tracking-wider">Fleet MRR</span>
        <span className="text-lg">💰</span>
      </div>

      {isLoading ? (
        <div className="h-8 bg-hq-border rounded animate-pulse w-32" />
      ) : (
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-hq-text font-mono">
            ₹{data?.fleetMRR?.toLocaleString('en-IN') ?? '—'}
          </span>
          <span className="text-sm text-hq-muted mb-0.5">/mo</span>
        </div>
      )}

      <div className={`flex items-center gap-1 text-sm font-medium ${isUp ? 'text-green-400' : 'text-red-400'}`}>
        <span>{isUp ? '↑' : '↓'}</span>
        <span>{Math.abs(trend).toFixed(1)}%</span>
        <span className="text-hq-muted font-normal text-xs ml-1">vs last month</span>
      </div>
    </div>
  );
}
