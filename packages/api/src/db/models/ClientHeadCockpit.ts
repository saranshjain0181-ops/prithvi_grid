import mongoose, { Document, Schema } from 'mongoose';

export interface IClientHeadSectionSummary {
  section: 'OUTCOMES' | 'MONEY' | 'RISK_COMPLIANCE' | 'PEOPLE_OPERATIONS' | 'QUALITY_PRODUCT' | 'REPUTATION';
  status: 'GREEN' | 'AMBER' | 'RED';
  headlineMetric: string;
  subtext: string;
}

export interface IClientHeadCockpitRecord extends Document {
  cockpitId: string;
  tenantId: string;
  facilityId: string;
  sections: IClientHeadSectionSummary[];
  decisionsWaitingCount: number;
  decisionsWaitingEstimatedCostInr: number;
  greenBadgeTier: string;
  updatedAt: Date;
}

const ClientHeadCockpitSchema = new Schema<IClientHeadCockpitRecord>(
  {
    cockpitId: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    sections: [
      {
        section: {
          type: String,
          required: true,
          enum: ['OUTCOMES', 'MONEY', 'RISK_COMPLIANCE', 'PEOPLE_OPERATIONS', 'QUALITY_PRODUCT', 'REPUTATION'],
        },
        status: { type: String, required: true, enum: ['GREEN', 'AMBER', 'RED'] },
        headlineMetric: { type: String, required: true },
        subtext: { type: String, required: true },
      },
    ],
    decisionsWaitingCount: { type: Number, default: 0 },
    decisionsWaitingEstimatedCostInr: { type: Number, default: 0 },
    greenBadgeTier: { type: String, default: 'PLATINUM' },
  },
  { timestamps: true }
);

export const ClientHeadCockpit = mongoose.model<IClientHeadCockpitRecord>(
  'ClientHeadCockpit',
  ClientHeadCockpitSchema
);
