import React from 'react';
import type { OnboardingFormData } from '../../types';

interface Step5Props {
  data: OnboardingFormData;
  onChange: (field: keyof OnboardingFormData, value: unknown) => void;
  generatedQrCodes?: Array<{ name: string; type: string; qrUrl: string }>;
}

export const Step5Personnel: React.FC<Step5Props> = ({
  data,
  onChange,
  generatedQrCodes = [],
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-black text-white">Step 5: Facility Personnel & Manager Setup</h3>
        <p className="text-xs text-hq-muted">
          Authorize the primary BWG Manager via Phone OTP and generate asset QR tracking codes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-hq-muted uppercase mb-1">
            Manager Full Name:
          </label>
          <input
            type="text"
            required
            value={(data as any).managerName || ''}
            onChange={(e) => onChange('managerName' as any, e.target.value)}
            placeholder="e.g. Vikram Sharma"
            className="w-full p-3 bg-hq-surface border border-hq-border rounded-xl text-white font-bold text-sm focus:outline-none focus:border-green-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-hq-muted uppercase mb-1">
            Manager Phone Number (OTP Target):
          </label>
          <input
            type="tel"
            required
            maxLength={10}
            value={(data as any).managerPhone || ''}
            onChange={(e) => onChange('managerPhone' as any, e.target.value.replace(/\D/g, ''))}
            placeholder="9826011223"
            className="w-full p-3 bg-hq-surface border border-hq-border rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-green-500"
          />
        </div>
      </div>

      <div className="p-4 bg-hq-surface border border-hq-border rounded-2xl space-y-2">
        <h4 className="text-xs font-bold text-green-400 uppercase tracking-wider">
          Asset Tracking Auto-Generation Ready
        </h4>
        <p className="text-xs text-hq-muted">
          Upon submitting this onboarding wizard, unique high-density QR codes will be
          automatically generated and registered in the Physical_Assets lake for every Compost Box
          and IoT Node.
        </p>
      </div>

      {generatedQrCodes.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="text-sm font-black text-white">Generated Asset QR Codes</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {generatedQrCodes.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-hq-surface border border-hq-border rounded-xl text-center space-y-2"
              >
                <img
                  src={item.qrUrl}
                  alt={item.name}
                  className="w-24 h-24 mx-auto rounded-lg bg-white p-1"
                />
                <div className="text-xs font-bold text-white truncate">{item.name}</div>
                <div className="text-[10px] text-green-400 font-mono">{item.type}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default Step5Personnel;
