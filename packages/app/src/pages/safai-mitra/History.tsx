import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TaskHistoryList } from '../../components/safai-mitra/TaskHistoryList';
import { AppTopBar } from '../../components/layout/AppTopBar';
import { UniversalAiAssistant } from '../../components/ai/UniversalAiAssistant';
import { ArrowLeft } from 'lucide-react';

export const SafaiMitraHistory: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col pb-24 transition-colors duration-200">
      <AppTopBar roleMode="SAFAI_MITRA" />

      {/* Subheader with back link */}
      <div className="bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/safai-mitra/dashboard')}
            className="py-1.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>डैशबोर्ड</span>
          </button>
          <span className="font-black text-sm text-slate-800 dark:text-white">
            मेरे पिछले काम (Work History)
          </span>
          <div className="w-12"></div>
        </div>
      </div>

      <main className="max-w-md w-full mx-auto p-4 flex-1 space-y-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
          <h2 className="text-base font-black text-slate-900 dark:text-white mb-3">
            पिछले किए गए प्रमाणित कार्य
          </h2>
          <TaskHistoryList />
        </div>
      </main>

      {/* Bottom Sticky Navigation */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-2xl z-30 py-2.5 px-4 transition-colors">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
          <button
            onClick={() => navigate('/safai-mitra/dashboard')}
            className="py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-black text-xs flex flex-col items-center"
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
            className="py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-black text-xs flex flex-col items-center"
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
