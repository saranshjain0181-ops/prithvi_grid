import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBanner } from '../../components/safai-mitra/StatusBanner';
import { GeminiVoiceOrb } from '../../components/safai-mitra/GeminiVoiceOrb';
import { AlertBanner } from '../../components/safai-mitra/AlertBanner';
import { ActionCardGrid } from '../../components/safai-mitra/ActionCardGrid';
import { MarkDoneButton } from '../../components/safai-mitra/MarkDoneButton';
import { AppTopBar } from '../../components/layout/AppTopBar';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { UniversalAiAssistant } from '../../components/ai/UniversalAiAssistant';
import { useAuthStore } from '../../store/auth.store';
import { useUiStore } from '../../store/ui.store';

export const SafaiMitraDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { selectedNodeId, selectedBoxId } = useUiStore();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col pb-24 transition-colors duration-200">
      {/* Universal Hierarchical Top Bar with Theme Toggler */}
      <AppTopBar roleMode="SAFAI_MITRA" />

      {/* Offline Mode & Sync Status Banner (Workstream E1) */}
      <OfflineBanner />

      {/* Main Content Area */}
      <main className="max-w-md w-full mx-auto p-4 space-y-4 flex-1">
        {/* Status Banner */}
        <StatusBanner status="TURN_WASTE" />

        {/* Real-time AI Voice Agent (Gemini API) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center space-y-3 transition-colors">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            🤖 AI आवाज सहायक (Gemini Live Assistant)
          </p>
          <GeminiVoiceOrb />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            "{user?.name || 'राम भाई'}, {selectedBoxId ? `गड्ढा ${selectedBoxId}` : 'गड्ढा 1'} में मीथेन बढ़ रही है, कृपया कचरा घुमाएं।"
          </p>
        </div>

        {/* Dedicated Sensor-Triggered Alert Space */}
        <AlertBanner
          message="आज बैच का 14वां दिन है, नमी 35% हो गई है। तुरंत 2 बाल्टी पानी छिड़कें और कचरा पलटें।"
          severity="WARNING"
        />

        {/* 20+ Dynamic Action Cards Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              📋 आज के कार्य कार्ड (Action Cards)
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              नोड: {selectedNodeId || 'Node Alpha'}
            </span>
          </div>
          <ActionCardGrid />
        </div>

        {/* Massive Mark Done Button */}
        <div className="pt-2">
          <MarkDoneButton />
        </div>
      </main>

      {/* Bottom Sticky Navigation */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-2xl z-30 py-2.5 px-4 transition-colors">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
          <button
            onClick={() => navigate('/safai-mitra/dashboard')}
            className="py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-black text-xs flex flex-col items-center"
          >
            <span className="text-lg">🏠</span>
            <span>होम (Home)</span>
          </button>

          <button
            onClick={() => navigate('/safai-mitra/diary')}
            className="py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-black text-xs flex flex-col items-center"
          >
            <span className="text-lg">⚖️</span>
            <span>खाता (Diary)</span>
          </button>

          <button
            onClick={() => navigate('/safai-mitra/history')}
            className="py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-black text-xs flex flex-col items-center"
          >
            <span className="text-lg">📜</span>
            <span>इतिहास (History)</span>
          </button>
        </div>
      </nav>

      {/* Universal Floating AI Assistant Widget with Mic & TTS */}
      <UniversalAiAssistant userRole="SAFAI_MITRA" autoSpeak={true} />
    </div>
  );
};
