import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { useUiStore } from '../../store/ui.store';
import { ThemeToggle } from '../ui/ThemeToggle';
import { HierarchicalContextSelector } from './HierarchicalContextSelector';
import { LogOut, Globe } from 'lucide-react';

interface AppTopBarProps {
  roleMode: 'SAFAI_MITRA' | 'BWG_MANAGER';
}

export const AppTopBar: React.FC<AppTopBarProps> = ({ roleMode }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { locale, setLocale } = useUiStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-4 py-3 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & User info */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-lg text-white font-bold shadow-md shadow-emerald-600/20">
              🌱
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                  पृथ्वी ग्रिड • Prithvi Grid
                </span>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    roleMode === 'SAFAI_MITRA'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                  }`}
                >
                  {roleMode === 'SAFAI_MITRA' ? 'सफाई मित्र' : 'BWG Manager'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {user?.name || (roleMode === 'SAFAI_MITRA' ? 'सफाई मित्र' : 'Manager')}
              </p>
            </div>
          </div>

          {/* Mobile Right Controls */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-500 hover:text-red-500 bg-slate-100 dark:bg-slate-800"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Hierarchical Context Selector */}
        <div className="w-full md:w-auto overflow-x-auto no-scrollbar flex justify-center py-1">
          <HierarchicalContextSelector isCompact={roleMode === 'SAFAI_MITRA'} />
        </div>

        {/* Desktop Right Controls: Theme, Language, Logout */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* Language Switcher */}
          <button
            onClick={() => setLocale(locale === 'hi' ? 'en' : 'hi')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-emerald-500 transition-all"
            title="भाषा बदलें / Change Language"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>{locale === 'hi' ? 'हिंदी' : 'English'}</span>
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="लॉगआउट (Sign Out)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 text-xs font-bold transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
export default AppTopBar;
