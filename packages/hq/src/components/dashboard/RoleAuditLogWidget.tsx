import React from 'react';
import { Users, ShieldCheck, Key } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  name: string;
  phone: string;
  role: 'SUPREME_HEAD' | 'BWG_MANAGER' | 'SAFAI_MITRA';
  action: string;
  ip: string;
  time: string;
  status: 'SUCCESS' | 'ALERT';
}

const auditLogs: AuditLogEntry[] = [
  {
    id: 'log-1',
    name: 'Supreme Head Admin',
    phone: '1234567890',
    role: 'SUPREME_HEAD',
    action: 'OTP_LOGIN_SUPREME_ACCESS',
    ip: '127.0.0.1 (NOC Local)',
    time: '2 mins ago',
    status: 'SUCCESS',
  },
  {
    id: 'log-2',
    name: 'Rajesh Sharma (BWG Manager)',
    phone: '9876543210',
    role: 'BWG_MANAGER',
    action: 'DUTY_ROSTER_DUTY_ASSIGNMENT',
    ip: '122.168.42.11 (Airtel Broadband)',
    time: '8 mins ago',
    status: 'SUCCESS',
  },
  {
    id: 'log-3',
    name: 'Ram Singh (Safai Mitra)',
    phone: '9123456780',
    role: 'SAFAI_MITRA',
    action: 'TASK_DONE_KACHRA_GHUMAYA',
    ip: '106.195.12.98 (Jio 4G Mobile)',
    time: '18 mins ago',
    status: 'SUCCESS',
  },
  {
    id: 'log-4',
    name: 'Vikram Sharma',
    phone: '9826011223',
    role: 'BWG_MANAGER',
    action: 'REMOTE_ALARM_RESET_SILENCED',
    ip: '122.168.40.85 (Indore)',
    time: '34 mins ago',
    status: 'SUCCESS',
  },
  {
    id: 'log-5',
    name: 'Unregistered Request',
    phone: '9826999999',
    role: 'SAFAI_MITRA',
    action: 'AUTH_REJECT_UNREGISTERED_PHONE',
    ip: '49.36.128.5 (Indore)',
    time: '1 hr ago',
    status: 'ALERT',
  },
];

export const RoleAuditLogWidget: React.FC = () => {
  const roleBadge = (role: AuditLogEntry['role']) => {
    switch (role) {
      case 'SUPREME_HEAD':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            👑 SUPREME
          </span>
        );
      case 'BWG_MANAGER':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            🏢 MANAGER
          </span>
        );
      case 'SAFAI_MITRA':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            👷 MITRA
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col h-[380px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-100 dark:bg-purple-950/80 rounded-xl">
            <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
              Active User Sessions & RBAC Security Log
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Real-time audit ledger across Supreme Admin, BWG Managers, and Ground Labour
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
          5 Recent Events
        </span>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto pt-2">
        <table className="w-full text-left text-xs">
          <thead className="text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="py-2.5 px-3">Authority / User</th>
              <th className="py-2.5 px-3">Role</th>
              <th className="py-2.5 px-3">Action Event</th>
              <th className="py-2.5 px-3">IP Address</th>
              <th className="py-2.5 px-3 text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
            {auditLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 px-3">
                  <div className="font-bold text-slate-900 dark:text-white">{log.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{log.phone}</div>
                </td>
                <td className="py-2.5 px-3">{roleBadge(log.role)}</td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                  {log.action}
                </td>
                <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">{log.ip}</td>
                <td className="py-2.5 px-3 text-right text-slate-400 text-[10px] whitespace-nowrap">
                  {log.time}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default RoleAuditLogWidget;
