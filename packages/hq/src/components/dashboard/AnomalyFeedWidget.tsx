import React, { useState } from 'react';
import { AlertTriangle, Flame, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';

interface AnomalyEvent {
  id: string;
  timestamp: string;
  facility: string;
  node: string;
  type: 'ACID_CRASH' | 'ANAEROBIC_SPIKE' | 'PRESSURE_CHOKING' | 'SENSOR_OFFLINE' | 'HARDWARE_TAMPER';
  severity: 'CRITICAL' | 'WARNING' | 'NOTICE';
  description: string;
  status: 'ACTIVE' | 'RESOLVING' | 'RESOLVED';
}

export const AnomalyFeedWidget: React.FC = () => {
  const [events, setEvents] = useState<AnomalyEvent[]>([
    {
      id: 'anom-1',
      timestamp: '2 mins ago',
      facility: 'Apollo Onsite Unit',
      node: 'Node B1',
      type: 'ACID_CRASH',
      severity: 'CRITICAL',
      description: 'pH dropped to 4.85 with Temp 39.2°C. Sanjivani emergency recipe dispatched.',
      status: 'ACTIVE',
    },
    {
      id: 'anom-2',
      timestamp: '14 mins ago',
      facility: 'BCC Composting Yard',
      node: 'Node C2',
      type: 'PRESSURE_CHOKING',
      severity: 'WARNING',
      description: 'Static compaction pressure spiked to 1018.4 hPa. Bottom choking risk detected.',
      status: 'ACTIVE',
    },
    {
      id: 'anom-3',
      timestamp: '38 mins ago',
      facility: 'Chappan Bio-Waste Station',
      node: 'Node D1',
      type: 'ANAEROBIC_SPIKE',
      severity: 'WARNING',
      description: 'Methane surged to 340 PPM. 24-hr advance foul odor alert pushed to manager.',
      status: 'RESOLVING',
    },
    {
      id: 'anom-4',
      timestamp: '1 hr ago',
      facility: 'Indore Residency Pit Complex',
      node: 'Node A1',
      type: 'ACID_CRASH',
      severity: 'NOTICE',
      description: 'Labour Ramu Baghel completed biochar turning. pH stabilized to 6.8.',
      status: 'RESOLVED',
    },
    {
      id: 'anom-5',
      timestamp: '2 hrs ago',
      facility: 'Sayaji Waste Complex',
      node: 'Node S1',
      type: 'HARDWARE_TAMPER',
      severity: 'NOTICE',
      description: 'Top cover tilt sensor trigger verified genuine by technician.',
      status: 'RESOLVED',
    },
  ]);

  const severityBadge = (severity: AnomalyEvent['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400 border border-red-300 dark:border-red-800 flex items-center gap-1">
            <Flame className="w-2.5 h-2.5 animate-pulse" /> CRITICAL
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5" /> WARNING
          </span>
        );
      case 'NOTICE':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400 border border-blue-300 dark:border-blue-800 flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" /> RESOLVED
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col h-[380px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
              Global Anomaly & Sanjivani Trigger Stream
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Live automated detection across 100+ telemetry nodes in Indore
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            // cycle or refresh
            setEvents((prev) => [...prev]);
          }}
          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pt-3 pr-1 text-xs">
        {events.map((ev) => (
          <div
            key={ev.id}
            className={`p-3 rounded-2xl border transition-all ${
              ev.severity === 'CRITICAL'
                ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900/60'
                : ev.severity === 'WARNING'
                ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                {ev.facility} • <span className="font-mono text-slate-500 dark:text-slate-400">{ev.node}</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono">{ev.timestamp}</span>
                {severityBadge(ev.severity)}
              </div>
            </div>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {ev.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
export default AnomalyFeedWidget;
