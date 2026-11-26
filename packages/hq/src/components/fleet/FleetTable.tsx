import React from 'react';
import { NodeItem } from './NodeCard';

interface FleetTableProps {
  nodes?: NodeItem[];
}

export const FleetTable: React.FC<FleetTableProps> = ({ nodes = [] }) => {
  return (
    <div className="bg-hq-surface border border-hq-border rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0B1120] text-hq-muted uppercase font-black tracking-wider border-b border-hq-border">
            <tr>
              <th className="py-3 px-4">Node Name</th>
              <th className="py-3 px-4">Facility / Entity</th>
              <th className="py-3 px-4">MAC Address</th>
              <th className="py-3 px-4">Battery</th>
              <th className="py-3 px-4">4G Signal (RSSI)</th>
              <th className="py-3 px-4">Last Telemetry Ping</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hq-border font-medium text-white">
            {nodes.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-6 text-hq-muted">
                  No hardware nodes registered
                </td>
              </tr>
            ) : (
              nodes.map((node) => (
                <tr key={node.id} className="hover:bg-hq-border/30 transition-colors">
                  <td className="py-3 px-4 font-bold">{node.name}</td>
                  <td className="py-3 px-4 text-hq-muted">{node.facilityName}</td>
                  <td className="py-3 px-4 font-mono text-[11px]">{node.mac}</td>
                  <td className="py-3 px-4 font-mono">{node.batteryPct}%</td>
                  <td className="py-3 px-4 font-mono">{node.rssiDbm} dBm</td>
                  <td className="py-3 px-4 text-hq-muted">{node.lastPing}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        node.status === 'ONLINE'
                          ? 'bg-green-950 text-green-400'
                          : 'bg-red-950 text-red-400'
                      }`}
                    >
                      {node.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default FleetTable;
