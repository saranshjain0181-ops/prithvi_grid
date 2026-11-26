import React, { useState } from 'react';
import axios from 'axios';

interface AlarmResetPanelProps {
  nodeId?: string;
  nodeName?: string;
  onResetSuccess?: () => void;
}

export const AlarmResetPanel: React.FC<AlarmResetPanelProps> = ({
  nodeId,
  nodeName = 'Selected Hardware Node',
  onResetSuccess,
}) => {
  const [isResetting, setIsResetting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleRemoteReset = async () => {
    if (!nodeId) {
      alert('Please select a hardware node first');
      return;
    }

    try {
      setIsResetting(true);
      setStatusMessage(null);

      const token = localStorage.getItem('accessToken');
      await axios.post(
        '/api/v1/alarm/reset',
        { nodeId, reason: 'Silenced remotely from Manager Portal' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setStatusMessage('✅ हार्डवेयर पीजो बजर (Piezo Buzzer) सफलतापूर्वक शांत कर दिया गया है।');
      if (onResetSuccess) onResetSuccess();
    } catch (err: any) {
      setStatusMessage('⚠️ अलार्म रीसेट करने में समस्या आई।');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="p-5 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔕</span>
          <div>
            <h4 className="font-black text-sm text-slate-900">
              रिमोट हार्डवेयर बजर रीसेट (Remote Alarm Reset)
            </h4>
            <p className="text-xs text-slate-500">{nodeName}</p>
          </div>
        </div>

        <button
          disabled={isResetting || !nodeId}
          onClick={handleRemoteReset}
          className="py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all"
        >
          <span>{isResetting ? 'रीसेट हो रहा है...' : 'अलार्म बंद करें (Silence Buzzer)'}</span>
        </button>
      </div>

      {statusMessage && (
        <p className="text-xs font-bold text-slate-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
          {statusMessage}
        </p>
      )}
    </div>
  );
};
