import React from 'react';
import { OnboardingWizard } from '../components/onboarding/OnboardingWizard';

export const OnboardClient: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Client & Facility Mega Onboarding Wizard
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Provision new Bulk Waste Generator entities, pin GPS facility locations, allocate boxes, and link A7670C hardware modules.
        </p>
      </div>

      <OnboardingWizard />
    </div>
  );
};
export default OnboardClient;
