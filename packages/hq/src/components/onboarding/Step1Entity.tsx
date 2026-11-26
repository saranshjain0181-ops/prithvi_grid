import type { OnboardingFormData, OrgType } from '@/types';

interface Step1Props {
  data: OnboardingFormData;
  onChange: (field: keyof OnboardingFormData, value: unknown) => void;
}

const ORG_TYPES: OrgType[] = ['RWA', 'School', 'Hospital', 'Market', 'Other'];
const IMC_ZONES = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'];

export default function Step1Entity({ data, onChange }: Step1Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-hq-text">Entity Information</h2>
        <p className="text-sm text-hq-muted mt-1">Basic client and organisation details</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Name */}
        <div>
          <label className="hq-label">Client Name *</label>
          <input
            className="hq-input"
            value={data.clientName}
            onChange={(e) => onChange('clientName', e.target.value)}
            placeholder="e.g. Vijay Nagar RWA"
          />
        </div>

        {/* Org Type */}
        <div>
          <label className="hq-label">Organisation Type *</label>
          <select
            className="hq-select"
            value={data.orgType}
            onChange={(e) => onChange('orgType', e.target.value as OrgType)}
          >
            {ORG_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Phone */}
        <div>
          <label className="hq-label">Phone *</label>
          <input
            className="hq-input"
            value={data.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            placeholder="+91 98765 43210"
            type="tel"
          />
        </div>

        {/* Email */}
        <div>
          <label className="hq-label">Email *</label>
          <input
            className="hq-input"
            value={data.email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="admin@entity.org"
            type="email"
          />
        </div>

        {/* SWM Reg No */}
        <div>
          <label className="hq-label">SWM Registration No.</label>
          <input
            className="hq-input"
            value={data.swmRegNo}
            onChange={(e) => onChange('swmRegNo', e.target.value)}
            placeholder="SWM/IND/2024/xxxxx"
          />
        </div>

        {/* IMC Zone */}
        <div>
          <label className="hq-label">IMC Zone</label>
          <select
            className="hq-select"
            value={data.imcZone}
            onChange={(e) => onChange('imcZone', e.target.value)}
          >
            <option value="">— Select Zone —</option>
            {IMC_ZONES.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>

        {/* IMC Ward */}
        <div>
          <label className="hq-label">IMC Ward No.</label>
          <input
            className="hq-input"
            value={data.imcWard}
            onChange={(e) => onChange('imcWard', e.target.value)}
            placeholder="Ward 42"
          />
        </div>
      </div>

      {/* Billing Address */}
      <div>
        <label className="hq-label">Billing Address</label>
        <textarea
          className="hq-input resize-none"
          rows={3}
          value={data.billingAddress}
          onChange={(e) => onChange('billingAddress', e.target.value)}
          placeholder="Full postal address..."
        />
      </div>
    </div>
  );
}
