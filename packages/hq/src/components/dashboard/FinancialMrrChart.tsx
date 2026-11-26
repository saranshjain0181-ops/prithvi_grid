import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, DollarSign } from 'lucide-react';

const mrrData = [
  { month: 'May 25', mrr: 45000, entities: 3 },
  { month: 'Jun 25', mrr: 62000, entities: 5 },
  { month: 'Jul 25', mrr: 78000, entities: 6 },
  { month: 'Aug 25', mrr: 95000, entities: 8 },
  { month: 'Sep 25', mrr: 115000, entities: 10 },
  { month: 'Oct 25', mrr: 140000, entities: 12 },
];

export const FinancialMrrChart: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col h-[380px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-950/80 rounded-xl">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
              Fleet Monthly Recurring Revenue (MRR Trajectory)
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              MoM Expansion across Bulk Waste Generator facilities (Indore IMC)
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
            ₹1,40,000<span className="text-[10px] text-slate-400 font-normal">/mo</span>
          </span>
          <p className="text-[10px] text-emerald-500 font-bold">+21.7% MoM Growth</p>
        </div>
      </div>

      <div className="flex-1 w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={mrrData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="#94a3b8"
              fontSize={11}
              fontWeight={600}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              fontWeight={600}
              tickFormatter={(v) => `₹${v / 1000}k`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl text-xs shadow-xl space-y-1">
                      <p className="font-bold">{label}</p>
                      <p className="text-emerald-400 font-black">
                        MRR: ₹{Number(payload[0].value).toLocaleString()}
                      </p>
                      <p className="text-slate-400 text-[10px]">
                        Active Orgs: {payload[0].payload.entities} Facilities
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="mrr"
              fill="#10b981"
              radius={[8, 8, 0, 0]}
              animationDuration={1200}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
export default FinancialMrrChart;
