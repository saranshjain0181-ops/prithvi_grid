import React, { useState } from 'react';

export interface SanjivaniAlertItem {
  _id: string;
  alertType: string;
  severity: 'WARNING' | 'CRITICAL';
  triggerValues: {
    ph?: number;
    tempC?: number;
    moisturePct?: number;
    methanePpm?: number;
  };
  recipeCard?: {
    titleHi: string;
    titleEn: string;
    instructionsHi: string[];
    instructionsEn: string[];
    immediateAction?: string;
  };
  createdAt: string;
  acknowledged: boolean;
}

interface SanjivaniAlertsProps {
  alerts?: SanjivaniAlertItem[];
  onAcknowledge?: (alertId: string) => Promise<void>;
}

export const SanjivaniAlerts: React.FC<SanjivaniAlertsProps> = ({ alerts = [], onAcknowledge }) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);
  const [lang, setLang] = useState<'hi' | 'en'>('hi');

  const playVoiceRecipe = (item: SanjivaniAlertItem) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('Speech synthesis not supported in this browser');
      return;
    }

    window.speechSynthesis.cancel();
    setIsPlayingAudio(item._id);

    const recipe = item.recipeCard;
    const textToSpeak =
      lang === 'hi'
        ? `${recipe?.titleHi}। ${recipe?.instructionsHi.join('। ')}`
        : `${recipe?.titleEn}. ${recipe?.instructionsEn.join('. ')}`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
    utterance.rate = 0.9;

    utterance.onend = () => setIsPlayingAudio(null);
    utterance.onerror = () => setIsPlayingAudio(null);

    window.speechSynthesis.speak(utterance);
  };

  const stopAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(null);
    }
  };

  const activeAlerts = alerts.filter((a) => !a.acknowledged);

  if (activeAlerts.length === 0) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3">
        <span className="text-2xl">🌱</span>
        <div>
          <h4 className="text-sm font-bold text-green-900">
            सभी कंपोस्ट गड्ढे सामान्य जैविक संतुलन में हैं
          </h4>
          <p className="text-xs text-green-700">कोई आपातकालीन संजीवनी अलर्ट सक्रिय नहीं है।</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activeAlerts.map((alert) => (
        <div
          key={alert._id}
          className="p-5 rounded-3xl bg-red-50 border-2 border-red-300 shadow-lg relative overflow-hidden"
        >
          {/* Top header badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="animate-ping inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
              <span className="text-xs font-black uppercase tracking-wider text-red-800 bg-red-200 px-2.5 py-0.5 rounded-full">
                🚨 संजीवनी आपातकालीन अलर्ट (Sanjivani Emergency)
              </span>
            </div>

            {/* Language toggle */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-red-200 text-xs font-bold">
              <button
                onClick={() => setLang('hi')}
                className={`px-2 py-0.5 rounded ${lang === 'hi' ? 'bg-red-600 text-white' : 'text-slate-600'}`}
              >
                हिन्दी
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2 py-0.5 rounded ${lang === 'en' ? 'bg-red-600 text-white' : 'text-slate-600'}`}
              >
                English
              </button>
            </div>
          </div>

          {/* Trigger readings */}
          <div className="mt-3 flex items-center gap-4 text-xs font-mono font-bold text-red-900">
            <span>pH: {alert.triggerValues.ph ?? '—'}</span>
            <span>तापमान: {alert.triggerValues.tempC ?? '—'}°C</span>
            <span>नमी: {alert.triggerValues.moisturePct ?? '—'}%</span>
          </div>

          {/* Recipe Instructions */}
          <div className="mt-3 bg-white p-4 rounded-2xl border border-red-100 shadow-sm space-y-2">
            <h4 className="font-extrabold text-sm text-slate-900">
              {lang === 'hi' ? alert.recipeCard?.titleHi : alert.recipeCard?.titleEn}
            </h4>

            <ul className="text-xs space-y-1.5 text-slate-700 font-medium list-disc list-inside">
              {(lang === 'hi'
                ? alert.recipeCard?.instructionsHi
                : alert.recipeCard?.instructionsEn
              )?.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ul>
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex items-center gap-2">
            {isPlayingAudio === alert._id ? (
              <button
                onClick={stopAudio}
                className="py-2 px-4 bg-red-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <span>⏹️ ऑडियो रोकें (Stop)</span>
              </button>
            ) : (
              <button
                onClick={() => playVoiceRecipe(alert)}
                className="py-2 px-4 bg-white hover:bg-gray-50 border border-red-200 text-red-700 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm"
              >
                <span>🔊 बोलकर सुनाएं (Play Audio)</span>
              </button>
            )}

            {onAcknowledge && (
              <button
                onClick={() => onAcknowledge(alert._id)}
                className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm ml-auto"
              >
                हल किया / स्वीकार करें (Acknowledge)
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
