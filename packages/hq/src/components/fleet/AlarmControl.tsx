import React, { useState } from 'react';
import axios from 'axios';

interface AlarmControlProps {
  nodes?: Array<{ id: string; name: string; facility: string }>;
}

export const AlarmControl: React.FC<AlarmControlProps> = ({ nodes = [] }) => {
  const [selectedNode, setSelectedNode] = useState(nodes[0]?.id || '');
  const [isResetting, setIsResetting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleOverride = async () => {
    if (!selectedNode) return;
    try {
      setIsResetting(true);
      const token = localStorage.getItem('accessToken');
      await axios.post(
        '/api/v1/alarm/reset',
        { nodeId: selectedNode, reason: 'Supreme Command Center override' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg('Site piezo buzzer successfully silenced.');
    } catch (err) {
      setMsg('Error silencing alarm.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="bg-hq-surface border border-hq-border rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl p-3 bg-amber-950/60 border border-amber-600 rounded-2xl">
          🔕
        </span>
        <div>
          <h3 className="text-sm font-black text-white">Supreme Remote Piezo Buzzer Override</h3>
          <p className="text-xs text-hq-muted">
            Direct downstream hardware trigger to silence persistent network or tamper alarms.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto">
        <select
          value={selectedNode}
          onChange={(e) => setSelectedNode(e.target.value)}
          className="p-2.5 bg-[#0B1120] border border-hq-border rounded-xl text-white text-xs font-bold focus:outline-none"
        >
          {nodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name} ({n.facility})
            </option>
          ))}
        </select>

        <button
          disabled={isResetting}
          onClick={handleOverride}
          className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md whitespace-nowrap"
        >
          {isResetting ? 'Sending...' : 'Silence Alarm'}
        </button>
      </div>

      {msg && <span className="text-xs text-amber-300 font-bold block">{msg}</span>}
    </div>
  );
};
export default AlarmControl;
