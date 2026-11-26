import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const ManagerSubNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/manager/dashboard', label: 'डैशबोर्ड (Dashboard)', icon: '📊' },
    { path: '/manager/roster', label: 'ड्यूटी रोस्टर (Roster)', icon: '👥' },
    { path: '/manager/telemetry', label: 'टेलीमेट्री (Telemetry)', icon: '📈' },
    { path: '/manager/ledger', label: 'काम का सबूत (Ledger)', icon: '🛡️' },
    { path: '/manager/assets', label: 'गड्ढे व नोड्स (Assets)', icon: '📦' },
    { path: '/manager/alerts', label: 'संजीवनी अलर्ट्स (Alerts)', icon: '🚨' },
  ];

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-2 sticky top-[61px] z-30 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
export default ManagerSubNav;
