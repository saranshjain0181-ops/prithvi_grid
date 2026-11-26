import React, { useState } from 'react';
import { KpiCard } from '../../components/manager/KpiCard';
import { TelemetryChart } from '../../components/manager/TelemetryChart';
import { SanjivaniAlerts } from '../../components/manager/SanjivaniAlerts';
import { AlarmResetPanel } from '../../components/manager/AlarmResetPanel';
import { AppTopBar } from '../../components/layout/AppTopBar';
import { ManagerSubNav } from '../../components/layout/ManagerSubNav';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { BachatRoiTracker } from '../../components/manager/BachatRoiTracker';
import { UniversalAiAssistant } from '../../components/ai/UniversalAiAssistant';
import { CompostVisionModal } from '../../components/manager/CompostVisionModal';
import { useAuthStore } from '../../store/auth.store';
import { useUiStore } from '../../store/ui.store';

export const ManagerDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedNodeId, selectedBoxId } = useUiStore();
  const [isVisionModalOpen, setIsVisionModalOpen] = useState(false);

  const activeNodeName = selectedNodeId || user?.assignedNodes?.[0] || 'Node Alpha (Pit 1)';
  const activeBoxName = selectedBoxId || user?.assignedBoxes?.[0] || 'Pit 1 (Compost Box A)';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Universal Hierarchical Top Bar */}
      <AppTopBar roleMode="BWG_MANAGER" />

      {/* Sub-Navigation for Manager Modules */}
      <ManagerSubNav />

      {/* Offline Mode & Sync Status Banner */}
      <OfflineBanner />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Context Banner showing Locked Node Selection */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-emerald-950 dark:text-emerald-200">
              लाइव मॉनिटरिंग लॉक:
            </span>
            <span className="font-extrabold text-emerald-800 dark:text-emerald-300">
              {activeBoxName} ➔ {activeNodeName}
            </span>
          </div>
          <div className="text-slate-500 dark:text-slate-400 font-medium">
            सेंसर टेलीमेट्री एवं जैविक अलर्ट स्वचालित रूप से चुने गए नोड से सिंक हैं।
          </div>
        </div>

        {/* Top Pinned Sanjivani Alerts */}
        <SanjivaniAlerts />

        {/* Remote Buzzer Silence Bar */}
        <AlarmResetPanel nodeId={activeNodeName} />

        {/* Biological Process & KPI Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Biological Process Batch Tracker */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              जैविक खाद प्रक्रिया ट्रैकर
            </span>
            <div className="my-2">
              <div className="text-2xl font-black text-slate-900 dark:text-white">Batch #102</div>
              <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                Active Day: 14 / 30
              </div>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-[46%] rounded-full" />
            </div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-2">
              थर्मोफिलिक जैविक चरम अवस्था (Thermophilic Phase)
            </span>
          </div>

          {/* SWM Compliance Audit Matrix */}
          <KpiCard
            title="SWM-2026 Compliance Audit"
            value="100% अनुपालन"
            subtitle="Solid Waste Management Rules Zero Violations"
            icon="⚖️"
            trend={{ value: '0 Violations', isPositive: true }}
          />

          {/* Connected Pits & Active Staff */}
          <KpiCard
            title="सक्रिय गड्ढे व नोड्स (Active Fleet)"
            value="4 / 4 चालू"
            subtitle="ESP32 4G Hardware Nodes Online"
            icon="📡"
          />

          {/* Labour Attendance & Execution */}
          <KpiCard
            title="मजदूर काम का सबूत (Labour Saboot)"
            value="98.2% प्रमाणित"
            subtitle="Physical sensor variance validated"
            icon="🛡️"
            trend={{ value: '2 Flagged', isPositive: false }}
          />
        </div>

        {/* Advanced Bachat & ROI Tracker (Workstream F7) */}
        <BachatRoiTracker />

        {/* Global First Integrations Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* AI Compost Health Predictor & Recipe Optimizer */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 transition-colors">
            <div className="flex items-center gap-2 text-xs font-black text-amber-600 dark:text-amber-400 uppercase">
              <span>🧠 AI Recipe Optimizer</span>
            </div>
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">जैविक संतुलन सुझाव</h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60">
              "Temp 45°C पर freeze है, 15kg green waste और 3kg jaggery water मिलाएं।"
            </p>
          </div>

          {/* Micro-Atmospheric Odor Warning System */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 transition-colors">
            <div className="flex items-center gap-2 text-xs font-black text-blue-600 dark:text-blue-400 uppercase">
              <span>🌬️ 24-Hr Odor Predictor</span>
            </div>
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">दुर्गंध पूर्व चेतावनी</h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200 dark:border-blue-800/60">
              Static pressure स्थिर है, मीथेन स्तर सामान्य है। आगामी 24 घंटे में कोई बदबू का खतरा नहीं।
            </p>
          </div>

          {/* Time-Lapse Texture Analyzer */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-black text-purple-600 dark:text-purple-400 uppercase">
                <span>📷 Gemini Vision Texture AI</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 font-mono">
                  LIVE
                </span>
              </div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                कम्पोस्ट सतह विश्लेषण (Vision AI)
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-purple-50 dark:bg-purple-950/40 p-3 rounded-xl border border-purple-200 dark:border-purple-800/60 my-2">
                कंप्यूटर विज़न द्वारा खाद की परिपक्वता, नमी एवं प्लास्टिक संदूषण (Contaminants) की जांच।
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsVisionModalOpen(true)}
              className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center justify-center gap-1.5"
            >
              <span>📸 Open Vision Inspector</span>
            </button>
          </div>
        </div>

        {/* 30-Day Comprehensive Telemetry Chart locked to active node */}
        <TelemetryChart nodeName={activeNodeName} />
      </main>

      {/* Computer Vision Inspector Modal (Workstream K) */}
      <CompostVisionModal
        isOpen={isVisionModalOpen}
        onClose={() => setIsVisionModalOpen(false)}
        pitId={activeBoxName}
      />

      {/* Universal Floating AI Assistant Widget */}
      <UniversalAiAssistant userRole="BWG_MANAGER" />
    </div>
  );
};
