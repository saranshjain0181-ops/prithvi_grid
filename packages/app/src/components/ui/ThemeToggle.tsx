import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle Light/Dark Theme"
      title={theme === 'dark' ? 'Switch to Light Mode ☀️' : 'Switch to Dark Mode 🌙'}
      className={`p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-center ${
        theme === 'dark'
          ? 'bg-slate-800/80 border-slate-700 text-yellow-400 hover:bg-slate-700 shadow-sm'
          : 'bg-white/90 border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
      } ${className}`}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-600 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
};
