import { formatDistanceToNow } from 'date-fns';
import type { KpiData } from '@/types';

interface DataPacketsCardProps {
  data: KpiData | undefined;
  isLoading: boolean;
}

export default function DataPacketsCard({ data, isLoading }: DataPacketsCardProps) {
  return (
    <div className="hq-card flex flex-col gap-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs text-hq-muted font-semibold uppercase tracking-wider">Data Packets Today</span>
        <span className="text-lg">📡</span>
      </div>

      {isLoading ? (
        <div className="h-8 bg-hq-border rounded animate-pulse w-28" />
      ) : (
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-hq-text font-mono">
            {data?.dataPacketsToday?.toLocaleString() ?? '—'}
          </span>
          <span className="text-sm text-hq-muted mb-0.5">packets</span>
        </div>
      )}

      <div className="text-xs text-hq-muted">
        Last:{' '}
        {data?.lastPacketAt
          ? formatDistanceToNow(new Date(data.lastPacketAt), { addSuffix: true })
          : '—'}
      </div>
    </div>
  );
}
