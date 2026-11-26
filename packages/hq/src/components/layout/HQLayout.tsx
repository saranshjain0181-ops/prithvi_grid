import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import UniversalAiAssistant from '../ai/UniversalAiAssistant';

interface HQLayoutProps {
  children?: React.ReactNode;
}

export const HQLayout: React.FC<HQLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-950/90 transition-colors">
          {children ? children : <Outlet />}
        </main>
      </div>

      {/* Floating Universal AI Assistant */}
      <UniversalAiAssistant />
    </div>
  );
};
export default HQLayout;
