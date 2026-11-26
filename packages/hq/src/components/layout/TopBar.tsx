import React from 'react';
import { useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/auth.store';
import { ThemeToggle } from './ThemeToggle';
import { HQHierarchicalSelector } from './HQHierarchicalSelector';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Mission Dashboard',
  '/data-lake': 'Data Lake',
  '/onboard': 'Onboard Client',
  '/fleet': 'Fleet Management',
  '/compliance': 'SWM Compliance',
  '/configuration': 'Configuration',
};

export default function TopBar() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const title = PAGE_TITLES[location.pathname] ?? 'Supreme Command';

  return (
    <header className="min-h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between px-6 py-3 md:py-0 gap-3 flex-shrink-0 transition-colors duration-200 shadow-xs">
      {/* Title & Date */}
      <div className="flex items-center gap-4 self-start md:self-auto">
        <div>
          <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            {title}
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 font-bold border border-emerald-300 dark:border-emerald-800">
              NOC
            </span>
          </h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
            {format(new Date(), 'EEEE, dd MMM yyyy — HH:mm')} • Indore Command
          </p>
        </div>
      </div>

      {/* Middle: Hierarchical Context Selector */}
      <div className="w-full md:w-auto overflow-x-auto no-scrollbar py-1">
        <HQHierarchicalSelector />
      </div>

      {/* Right Controls: Theme Toggle, Live Status, Profile */}
      <div className="flex items-center gap-3 self-end md:self-auto">
        {/* Global Theme Toggle */}
        <ThemeToggle />

        {/* Live indicator */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
            ONLINE
          </span>
        </div>

        {/* Avatar */}
        <div
          title={user?.name || 'Supreme Head'}
          className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-700 flex items-center justify-center text-xs font-black text-purple-700 dark:text-purple-300 shadow-xs cursor-pointer"
        >
          👑
        </div>
      </div>
    </header>
  );
}
