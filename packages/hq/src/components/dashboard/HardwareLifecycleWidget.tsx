import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Cpu, Wrench } from 'lucide-react';

const lifecycleData = [
  { name: 'Nominal & Healthy', value: 84, color: '#10b981' },
  { name: 'Calibration Scheduled', value: 10, color: '#f59e0b' },
  { name: 'Supercapacitor / Battery Service', value: 4, color: '#ef4444' },
  { name: 'Probe Cleaning Required', value: 2, color: '#8b5cf6' },
];

export const HardwareLifecycleWidget: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col h-[380px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-950/80 rounded-xl">
            <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
              IoT Sensor Fleet & Lifecycle Health
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              ESP32 + A7670C 4G modules & chemical probe degradation status
            </p>
          </div>
        </div>

        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          98.2% Uptime
        </span>
      </div>

      <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="w-full sm:w-1/2 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={lifecycleData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {lifecycleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-900 text-white p-2 rounded-xl text-xs border border-slate-700 shadow-xl">
                        <p className="font-bold">{payload[0].name}</p>
                        <p className="font-black" style={{ color: payload[0].payload.color }}>
                          {payload[0].value}% of Fleet
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="w-full sm:w-1/2 space-y-2 text-xs">
          {lifecycleData.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                  {item.name}
                </span>
              </div>
              <span className="font-black text-slate-900 dark:text-white font-mono">
                {item.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default HardwareLifecycleWidget;
