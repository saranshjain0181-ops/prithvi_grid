import mongoose, { Document, Schema } from 'mongoose';

export interface IStatutoryBreachRecord {
  ruleCode: string; // e.g. 'SWM_2016_THERMAL_KILL', 'LEACHATE_ZERO_DISCHARGE'
  standardDescription: string;
  observedValue: string;
  thresholdLimit: string;
  isBreached: boolean;
  legalExposure: 'LOW' | 'MEDIUM' | 'HIGH' | 'STATUTORY_SHUTDOWN';
}

export interface IComplianceRiskRecord extends Document {
  recordId: string;
  facilityId: string;
  auditPeriodMonth: string; // YYYY-MM
  overallComplianceScorePct: number;
  breaches: IStatutoryBreachRecord[];
  isAuditPackSealed: boolean;
  auditPackDigitalHash?: string;
  certifiedByLegalAuditorId?: string;
  createdAt: Date;
}

const ComplianceRiskSchema = new Schema<IComplianceRiskRecord>(
  {
    recordId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    auditPeriodMonth: { type: String, required: true, index: true },
    overallComplianceScorePct: { type: Number, required: true },
    breaches: [
      {
        ruleCode: { type: String, required: true },
        standardDescription: { type: String, required: true },
        observedValue: { type: String, required: true },
        thresholdLimit: { type: String, required: true },
        isBreached: { type: Boolean, required: true },
        legalExposure: {
          type: String,
          required: true,
          enum: ['LOW', 'MEDIUM', 'HIGH', 'STATUTORY_SHUTDOWN'],
        },
      },
    ],
    isAuditPackSealed: { type: Boolean, default: false },
    auditPackDigitalHash: { type: String },
    certifiedByLegalAuditorId: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ComplianceRisk = mongoose.model<IComplianceRiskRecord>(
  'ComplianceRisk',
  ComplianceRiskSchema
);
