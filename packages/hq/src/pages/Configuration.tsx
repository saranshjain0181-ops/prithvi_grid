import React from 'react';
import { ThresholdConfigurator } from '../components/config/ThresholdConfigurator';

export const Configuration: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Master Engine Rule & AI Threshold Configurator
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Global operational parameters governing real-time telemetry anomaly detection, Sanjivani triggers, and labour verification.
        </p>
      </div>

      <ThresholdConfigurator />
    </div>
  );
};
export default Configuration;
