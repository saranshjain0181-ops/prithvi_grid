import React from 'react';

interface EntryTypeToggleProps {
  value: 'WASTE_IN' | 'FERTILIZER_OUT';
  onChange: (val: 'WASTE_IN' | 'FERTILIZER_OUT') => void;
}

export const EntryTypeToggle: React.FC<EntryTypeToggleProps> = ({ value, onChange }) => {
  return (
    <div className="grid grid-cols-2 gap-3 p-1.5 bg-gray-100 rounded-2xl">
      <button
        type="button"
        onClick={() => onChange('WASTE_IN')}
        className={`py-4 px-3 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-2 select-none shadow-sm ${
          value === 'WASTE_IN'
            ? 'bg-green-600 text-white shadow-md scale-[1.02]'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        <span className="text-2xl">➕</span>
        <span>कचरा डाला</span>
      </button>

      <button
        type="button"
        onClick={() => onChange('FERTILIZER_OUT')}
        className={`py-4 px-3 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-2 select-none shadow-sm ${
          value === 'FERTILIZER_OUT'
            ? 'bg-amber-600 text-white shadow-md scale-[1.02]'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        <span className="text-2xl">➖</span>
        <span>खाद निकाली</span>
      </button>
    </div>
  );
};
