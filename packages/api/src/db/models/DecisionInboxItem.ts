import { Schema, model, Document, Types } from 'mongoose';

export type DecisionType =
  | 'REORDER_BULKING'
  | 'PROBE_REPLACEMENT'
  | 'APPROVE_LABOUR_DISPUTE'
  | 'ACCEPT_THRESHOLD_CHANGE'
  | 'APPROVE_PAYOUT_POOL'
  | 'CAPACITY_EXPANSION'
  | 'WEATHER_EMERGENCY_COVER';

export interface IDecisionInboxItem extends Document {
  tenantId: Types.ObjectId;
  facilityId: Types.ObjectId;
  decisionType: DecisionType;
  title: string;
  summaryReason: string;
  recommendedOption: string;
  alternativeOptions: string[];
  estimatedCostInr?: number;
  deadline: Date;
  consequenceOfInaction: string;
  evidenceStrengthTier: 'STRONG' | 'MODERATE' | 'WEAK';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  resolutionRemark?: string;
}

export const DecisionInboxItemSchema = new Schema<IDecisionInboxItem>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'GlobalEntity', required: true, index: true },
  facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
  decisionType: {
    type: String,
    enum: [
      'REORDER_BULKING',
      'PROBE_REPLACEMENT',
      'APPROVE_LABOUR_DISPUTE',
      'ACCEPT_THRESHOLD_CHANGE',
      'APPROVE_PAYOUT_POOL',
      'CAPACITY_EXPANSION',
      'WEATHER_EMERGENCY_COVER',
    ],
    required: true,
  },
  title: { type: String, required: true },
  summaryReason: { type: String, required: true },
  recommendedOption: { type: String, required: true },
  alternativeOptions: [{ type: String }],
  estimatedCostInr: { type: Number },
  deadline: { type: Date, required: true },
  consequenceOfInaction: { type: String, required: true },
  evidenceStrengthTier: {
    type: String,
    enum: ['STRONG', 'MODERATE', 'WEAK'],
    default: 'STRONG',
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'],
    default: 'PENDING',
  },
  resolvedAt: { type: Date },
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster' },
  resolutionRemark: { type: String },
}, { timestamps: true });

DecisionInboxItemSchema.index({ facilityId: 1, status: 1, deadline: 1 });

export const DecisionInboxItem = model<IDecisionInboxItem>('DecisionInboxItem', DecisionInboxItemSchema);
