import React from 'react';

interface VisualCalculatorProps {
  value: string;
  onChange: (val: string) => void;
  flowType: 'WASTE_IN' | 'FERTILIZER_OUT';
}

export const VisualCalculator: React.FC<VisualCalculatorProps> = ({
  value,
  onChange,
  flowType,
}) => {
  const handleDigit = (digit: string) => {
    if (digit === '.' && value.includes('.')) return;
    if (value === '0' && digit !== '.') {
      onChange(digit);
    } else {
      onChange(value + digit);
    }
  };

  const handleClear = () => {
    onChange('0');
  };

  const handleBackspace = () => {
    if (value.length <= 1) {
      onChange('0');
    } else {
      onChange(value.slice(0, -1));
    }
  };

  const handleAddPreset = (amount: number) => {
    const current = parseFloat(value) || 0;
    const next = Math.min(5000, current + amount);
    onChange(next.toString());
  };

  const numVal = parseFloat(value) || 0;
  const isOverLimit = numVal > 5000;

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-lg border border-slate-200 dark:border-slate-800 select-none transition-colors">
      {/* Big 48px Value Display */}
      <div
        className={`w-full py-5 px-6 rounded-2xl flex items-baseline justify-end gap-2 border-2 transition-colors ${
          flowType === 'WASTE_IN'
            ? 'bg-green-50 dark:bg-green-950/40 border-green-300 dark:border-green-800 text-green-900 dark:text-green-300'
            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300'
        }`}
      >
        <span className="text-5xl font-black font-mono tracking-tight">{value || '0'}</span>
        <span className="text-2xl font-bold opacity-75">किलो (kg)</span>
      </div>

      {/* Over Limit Warning */}
      {isOverLimit && (
        <div className="mt-2 py-1.5 px-3 bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs font-bold text-center">
          ⚠️ अधिकतम सीमा 5,000 किलो है (Single entry max limit: 5,000 kg)
        </div>
      )}

      {/* Traditional Indian Field Units (Workstream E5 / H1) */}
      <div className="mt-4">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 px-1 flex items-center justify-between">
          <span>पारंपरिक भारतीय इकाइयां (Field Presets)</span>
          <span className="text-slate-400 dark:text-slate-500 font-medium">1-टैप जोड़ें</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleAddPreset(15)}
            className="py-2.5 px-3 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 active:scale-95 rounded-xl font-bold text-xs flex items-center justify-between transition-all shadow-sm"
          >
            <span>🧺 +1 तगाड़ी</span>
            <span className="font-mono font-black">+15 kg</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddPreset(40)}
            className="py-2.5 px-3 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 active:scale-95 rounded-xl font-bold text-xs flex items-center justify-between transition-all shadow-sm"
          >
            <span>🌾 +1 बोरी (Bag)</span>
            <span className="font-mono font-black">+40 kg</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddPreset(100)}
            className="py-2.5 px-3 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 active:scale-95 rounded-xl font-bold text-xs flex items-center justify-between transition-all shadow-sm"
          >
            <span>🛢️ +1 ड्रम (Drum)</span>
            <span className="font-mono font-black">+100 kg</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddPreset(1500)}
            className="py-2.5 px-3 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 active:scale-95 rounded-xl font-bold text-xs flex items-center justify-between transition-all shadow-sm"
          >
            <span>🚜 +1 ट्रॉली (Trolley)</span>
            <span className="font-mono font-black">+1500 kg</span>
          </button>
        </div>
      </div>

      {/* Quick Add Metric Increment Presets */}
      <div className="grid grid-cols-4 gap-2 my-3">
        {[5, 10, 25, 50].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handleAddPreset(preset)}
            className="py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 rounded-xl font-black text-slate-800 dark:text-slate-200 text-sm transition-all shadow-sm"
          >
            +{preset}
          </button>
        ))}
      </div>

      {/* Tactile Keypad */}
      <div className="grid grid-cols-3 gap-2.5">
        {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleDigit(num)}
            className="h-14 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-2xl text-slate-900 dark:text-white shadow-sm transition-all"
          >
            {num}
          </button>
        ))}

        {/* Clear Button */}
        <button
          type="button"
          onClick={handleClear}
          className="h-14 bg-red-100 dark:bg-red-950/60 hover:bg-red-200 dark:hover:bg-red-900/60 active:scale-95 border border-red-200 dark:border-red-800 rounded-2xl font-black text-lg text-red-700 dark:text-red-300 shadow-sm transition-all"
        >
          साफ (C)
        </button>

        {/* Zero */}
        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="h-14 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-2xl text-slate-900 dark:text-white shadow-sm transition-all"
        >
          0
        </button>

        {/* Decimal / Dot */}
        <button
          type="button"
          onClick={() => handleDigit('.')}
          className="h-14 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-2xl text-slate-900 dark:text-white shadow-sm transition-all"
        >
          .
        </button>
      </div>

      {/* Backspace Button */}
      <button
        type="button"
        onClick={handleBackspace}
        className="w-full mt-2.5 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 active:scale-95 rounded-xl font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center justify-center gap-2 transition-all"
      >
        <span>⌫ पिछला अंक हटाएं (Delete)</span>
      </button>
    </div>
  );
};
