import mongoose, { Document, Schema } from 'mongoose';

export interface IContractorSlaMetrics {
  billedManDays: number;
  observedManDays: number;
  billedTurnsCount: number;
  verifiedTurnsCount: number;
  turnCompliancePct: number;
  unexplainedVarianceManDays: number;
  recommendedAdjustmentInr: number;
}

export interface IContractorDisputeItem {
  disputeId: string;
  pitId?: string;
  claimedDate: string;
  description: string;
  claimedAmountInr: number;
  adjustedAmountInr: number;
  resolutionStatus: 'OPEN' | 'RESOLVED_ACCEPTED' | 'RESOLVED_REJECTED';
  resolvedBy?: string;
}

export interface IContractorReconciliationRecord extends Document {
  reconciliationId: string;
  facilityId: string;
  contractorId: string;
  contractorName: string;
  billingPeriodMonth: string; // YYYY-MM
  ratePerManDayInr: number;
  metrics: IContractorSlaMetrics;
  disputes: IContractorDisputeItem[];
  finalApprovedAmountInr: number;
  status: 'DRAFT' | 'DISPUTED' | 'APPROVED' | 'PAID';
  approvedBy?: string;
  createdAt: Date;
}

const ContractorReconciliationSchema = new Schema<IContractorReconciliationRecord>(
  {
    reconciliationId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    contractorId: { type: String, required: true, index: true },
    contractorName: { type: String, required: true },
    billingPeriodMonth: { type: String, required: true, index: true },
    ratePerManDayInr: { type: Number, required: true },
    metrics: {
      billedManDays: { type: Number, required: true },
      observedManDays: { type: Number, required: true },
      billedTurnsCount: { type: Number, required: true },
      verifiedTurnsCount: { type: Number, required: true },
      turnCompliancePct: { type: Number, required: true },
      unexplainedVarianceManDays: { type: Number, required: true },
      recommendedAdjustmentInr: { type: Number, required: true },
    },
    disputes: [
      {
        disputeId: { type: String, required: true },
        pitId: { type: String },
        claimedDate: { type: String, required: true },
        description: { type: String, required: true },
        claimedAmountInr: { type: Number, required: true },
        adjustedAmountInr: { type: Number, required: true },
        resolutionStatus: {
          type: String,
          required: true,
          enum: ['OPEN', 'RESOLVED_ACCEPTED', 'RESOLVED_REJECTED'],
          default: 'OPEN',
        },
        resolvedBy: { type: String },
      },
    ],
    finalApprovedAmountInr: { type: Number, required: true },
    status: {
      type: String,
      required: true,
      enum: ['DRAFT', 'DISPUTED', 'APPROVED', 'PAID'],
      default: 'DRAFT',
    },
    approvedBy: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ContractorReconciliation = mongoose.model<IContractorReconciliationRecord>(
  'ContractorReconciliation',
  ContractorReconciliationSchema
);
