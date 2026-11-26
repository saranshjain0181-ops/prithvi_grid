import React from 'react';
import { TelemetryChart } from '../../components/manager/TelemetryChart';
import { AppTopBar } from '../../components/layout/AppTopBar';
import { ManagerSubNav } from '../../components/layout/ManagerSubNav';
import { UniversalAiAssistant } from '../../components/ai/UniversalAiAssistant';
import { useUiStore } from '../../store/ui.store';

export const ManagerTelemetry: React.FC = () => {
  const { selectedNodeId, selectedBoxId } = useUiStore();
  const activeNodeName = selectedNodeId || 'Node Alpha (Pit 1)';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <AppTopBar roleMode="BWG_MANAGER" />
      <ManagerSubNav />

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              सेंसर टेलीमेट्री एवं बायो-थर्मल ट्रेंड्स
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              लाइव मॉनिटरिंग: {selectedBoxId || 'Pit 1'} ➔ {activeNodeName}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <TelemetryChart nodeName={`${activeNodeName} (Primary Bio-Probe)`} />
          <TelemetryChart nodeName="Node Beta (Cross-Pit Secondary Reference)" />
        </div>
      </div>

      <UniversalAiAssistant userRole="BWG_MANAGER" />
    </div>
  );
};
