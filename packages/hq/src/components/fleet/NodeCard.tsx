import React from 'react';

export interface NodeItem {
  id: string;
  name: string;
  facilityName: string;
  mac: string;
  batteryPct: number;
  rssiDbm: number;
  lastPing: string;
  status: 'ONLINE' | 'OFFLINE' | 'TAMPERED';
  alarmActive?: boolean;
}

interface NodeCardProps {
  node: NodeItem;
  onSilenceAlarm?: (nodeId: string) => void;
}

export const NodeCard: React.FC<NodeCardProps> = ({ node, onSilenceAlarm }) => {
  return (
    <div className="bg-hq-surface border border-hq-border rounded-2xl p-4 shadow-md space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-bold text-white text-sm">{node.name}</h4>
          <p className="text-[11px] text-hq-muted">{node.facilityName}</p>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            node.status === 'ONLINE'
              ? 'bg-green-950 text-green-400 border border-green-800'
              : node.status === 'TAMPERED'
              ? 'bg-amber-950 text-amber-400 border border-amber-800'
              : 'bg-gray-800 text-gray-400 border border-gray-700'
          }`}
        >
          {node.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs font-mono text-hq-muted bg-[#0B1120] p-2.5 rounded-xl">
        <div>
          <span className="block text-[10px] uppercase font-sans">Battery</span>
          <span className="text-white font-bold">{node.batteryPct}%</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase font-sans">Signal (4G)</span>
          <span className="text-white font-bold">{node.rssiDbm} dBm</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-hq-muted">
        <span>Last Ping: {node.lastPing}</span>
        {node.alarmActive && (
          <button
            onClick={() => onSilenceAlarm && onSilenceAlarm(node.id)}
            className="py-1 px-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-lg text-[10px]"
          >
            🔕 Silence Buzzer
          </button>
        )}
      </div>
    </div>
  );
};
export default NodeCard;
