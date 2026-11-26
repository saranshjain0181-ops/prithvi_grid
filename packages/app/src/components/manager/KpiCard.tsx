import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  highlightColor?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  highlightColor = 'bg-white',
}) => {
  return (
    <div className={`p-6 rounded-2xl border border-gray-100 shadow-sm ${highlightColor} transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <h3 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">{value}</h3>
        {trend && (
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              trend.isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1.5 text-xs text-slate-400 font-medium">{subtitle}</p>}
    </div>
  );
};
