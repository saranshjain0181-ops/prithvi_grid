import type { KpiData } from '@/types';

interface ViolationsCardProps {
  data: KpiData | undefined;
  isLoading: boolean;
}

export default function ViolationsCard({ data, isLoading }: ViolationsCardProps) {
  return (
    <div className="hq-card flex flex-col gap-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs text-hq-muted font-semibold uppercase tracking-wider">SWM Violations Prevented</span>
        <span className="text-lg">🛡️</span>
      </div>

      {isLoading ? (
        <div className="h-8 bg-hq-border rounded animate-pulse w-20" />
      ) : (
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-green-400 font-mono">
            {data?.violationsPrevented ?? '—'}
          </span>
        </div>
      )}

      <div className="text-xs text-hq-muted">This month</div>

      <div className="flex items-center gap-2 text-xs text-green-400/80">
        <span>✓</span>
        <span>Fully compliant with IMC norms</span>
      </div>
    </div>
  );
}
