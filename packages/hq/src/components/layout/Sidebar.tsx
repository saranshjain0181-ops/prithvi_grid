import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { LogOut } from 'lucide-react';

interface NavItem {
  to: string;
  icon: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/data-lake', icon: '🗄️', label: 'Data Lake' },
  { to: '/onboard', icon: '✨', label: 'Onboard Client' },
  { to: '/fleet', icon: '🚛', label: 'Fleet Management' },
  { to: '/compliance', icon: '📋', label: 'SWM Compliance' },
  { to: '/configuration', icon: '⚙️', label: 'Configuration' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-shrink-0 transition-colors duration-200 shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-200 dark:border-slate-800">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-xl font-bold shadow-md shadow-emerald-600/20 text-white">
          🌱
        </div>
        <div>
          <p className="text-slate-900 dark:text-white font-black text-sm leading-tight tracking-tight">
            Prithvi Grid
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold">
            HQ Supreme Command
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                isActive
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950 border border-purple-300 dark:border-purple-700 flex items-center justify-center text-xs font-bold text-purple-700 dark:text-purple-300">
            👑
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {user?.name ?? 'Supreme Head Admin'}
            </p>
            <p className="text-[10px] text-slate-400 font-mono truncate">{user?.role ?? 'SUPREME_HEAD'}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors py-2 px-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 border border-slate-200 dark:border-slate-700"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out of HQ
        </button>
      </div>
    </aside>
  );
}
