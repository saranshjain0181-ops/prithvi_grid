import React from 'react';
import KpiGrid from '../components/kpi/KpiGrid';
import IndoreNOCMap from '../components/map/IndoreNOCMap';
import MapLegend from '../components/map/MapLegend';
import AnomalyFeedWidget from '../components/dashboard/AnomalyFeedWidget';
import FinancialMrrChart from '../components/dashboard/FinancialMrrChart';
import HardwareLifecycleWidget from '../components/dashboard/HardwareLifecycleWidget';
import RoleAuditLogWidget from '../components/dashboard/RoleAuditLogWidget';

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 1. KPI Cards Grid */}
      <KpiGrid />

      {/* 2. City-Wide NOC Map Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Indore City-Wide Compost NOC Command Map (IMC Zone Overview)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Live 6-state geospatial telemetry tracking all Bulk Waste Generator pits across Indore wards.
            </p>
          </div>

          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            NOC LIVE TELEMETRY STREAMING
          </span>
        </div>

        {/* Leaflet Map with 6 Status Markers */}
        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative h-[450px]">
          <IndoreNOCMap />
          <MapLegend />
        </div>
      </div>

      {/* 3. High-Density Enterprise Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global System Health & Anomaly Feed */}
        <AnomalyFeedWidget />

        {/* Financial MRR Trend Graph */}
        <FinancialMrrChart />

        {/* Hardware Lifecycle & Sensor Replacements */}
        <HardwareLifecycleWidget />

        {/* Active User Sessions & Role Audit Log */}
        <RoleAuditLogWidget />
      </div>
    </div>
  );
};
export default Dashboard;
