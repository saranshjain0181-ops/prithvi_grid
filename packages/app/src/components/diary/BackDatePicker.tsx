import React, { useState } from 'react';
import { format } from 'date-fns';

interface BackDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

export const BackDatePicker: React.FC<BackDatePickerProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Convert Date to ISO string format for HTML datetime-local input
  const formatForInput = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      onChange(new Date(e.target.value));
    }
  };

  const setPresetHoursAgo = (hours: number) => {
    const target = new Date(Date.now() - hours * 60 * 60 * 1000);
    onChange(target);
    setIsOpen(false);
  };

  const isCurrent = Math.abs(Date.now() - value.getTime()) < 5 * 60 * 1000;

  return (
    <div className="w-full bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
            प्रविष्टि समय (Entry Timing)
          </span>
          <span className="text-base font-black text-gray-800">
            {isCurrent ? '⚡ अभी (Current Time)' : format(value, 'dd MMM yyyy, hh:mm a')}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-800 rounded-xl font-bold text-sm flex items-center gap-1.5 transition-all shadow-sm"
        >
          <span>🕒 समय और तारीख चुनें</span>
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          <label className="block text-xs font-bold text-gray-600">
            कैलेंडर व घड़ी से समय चुनें:
          </label>
          <input
            type="datetime-local"
            value={formatForInput(value)}
            onChange={handleInputChange}
            max={formatForInput(new Date())}
            className="w-full p-3 border-2 border-green-500 rounded-xl font-mono text-base font-bold bg-white focus:outline-none"
          />

          {/* Quick presets for ground workers */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-gray-500 font-semibold">त्वरित चयन:</span>
            <button
              type="button"
              onClick={() => onChange(new Date())}
              className="py-1 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-700"
            >
              अभी
            </button>
            <button
              type="button"
              onClick={() => setPresetHoursAgo(2)}
              className="py-1 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-700"
            >
              2 घंटे पहले
            </button>
            <button
              type="button"
              onClick={() => setPresetHoursAgo(6)}
              className="py-1 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-700"
            >
              सुबह
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
