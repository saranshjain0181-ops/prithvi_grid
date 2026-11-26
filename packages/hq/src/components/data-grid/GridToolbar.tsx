import React from 'react';

interface GridToolbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onExportCsv: () => void;
  onRefresh: () => void;
}

export const COLLECTIONS = [
  { key: 'ENTITIES', label: 'Global Entities' },
  { key: 'FACILITIES', label: 'Facilities Locations' },
  { key: 'ROSTER', label: 'User Auth Roster' },
  { key: 'ASSETS', label: 'Physical Assets' },
  { key: 'TELEMETRY', label: 'Live Telemetry Lake' },
  { key: 'LEDGER', label: 'Labour Execution Ledger' },
  { key: 'DIARY', label: 'Khad Kachra Flow' },
  { key: 'SANJIVANI', label: 'AI Alerts Sanjivani' },
  { key: 'COMPLIANCE', label: 'SWM Compliance Archive' },
];

export const GridToolbar: React.FC<GridToolbarProps> = ({
  activeTab,
  onTabChange,
  onExportCsv,
  onRefresh,
}) => {
  return (
    <div className="space-y-4">
      {/* Horizontal Collection Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {COLLECTIONS.map((c) => (
          <button
            key={c.key}
            onClick={() => onTabChange(c.key)}
            className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              activeTab === c.key
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-hq-surface text-hq-muted hover:bg-hq-border hover:text-white'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-hq-muted font-bold">
          Live Editable Data Grid • Changes sync directly with MongoDB Atlas Data Lake
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="py-1.5 px-3 bg-hq-surface hover:bg-hq-border border border-hq-border text-white rounded-lg text-xs font-bold transition-all"
          >
            🔄 Refresh Lake
          </button>
          <button
            onClick={onExportCsv}
            className="py-1.5 px-3 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xs font-black transition-all shadow-sm"
          >
            📥 Export CSV
          </button>
        </div>
      </div>
    </div>
  );
};
export default GridToolbar;
