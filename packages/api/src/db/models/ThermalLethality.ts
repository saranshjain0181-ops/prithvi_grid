import mongoose, { Document, Schema } from 'mongoose';

export type ThermalCriteriaResult = 'CRITERIA_MET' | 'CRITERIA_NOT_MET' | 'INSUFFICIENT_EVIDENCE';

export interface IThermalLethalityRecord extends Document {
  recordId: string;
  batchId: string;
  facilityId: string;
  consecutiveHoursAbove55C: number;
  totalTurningsInHotPhase: number;
  criteriaResult: ThermalCriteriaResult;
  evidenceStrength: 'STRONG' | 'MODERATE' | 'WEAK';
  coldSpotAdjustmentC: number; // e.g. -4.5C from mapping round
  indicativeLogReductionRange: {
    lowEstimateLog: number;
    expectedEstimateLog: number;
    highEstimateLog: number;
  };
  isBatchClosed: boolean;
  closureDate?: Date;
  closureViolationsCount: number;
  auditCaveat: string;
  createdAt: Date;
}

const ThermalLethalitySchema = new Schema<IThermalLethalityRecord>(
  {
    recordId: { type: String, required: true, unique: true, index: true },
    batchId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    consecutiveHoursAbove55C: { type: Number, required: true },
    totalTurningsInHotPhase: { type: Number, required: true },
    criteriaResult: {
      type: String,
      required: true,
      enum: ['CRITERIA_MET', 'CRITERIA_NOT_MET', 'INSUFFICIENT_EVIDENCE'],
    },
    evidenceStrength: {
      type: String,
      required: true,
      enum: ['STRONG', 'MODERATE', 'WEAK'],
      default: 'MODERATE',
    },
    coldSpotAdjustmentC: { type: Number, default: 0 },
    indicativeLogReductionRange: {
      lowEstimateLog: { type: Number, required: true },
      expectedEstimateLog: { type: Number, required: true },
      highEstimateLog: { type: Number, required: true },
    },
    isBatchClosed: { type: Boolean, default: false },
    closureDate: { type: Date },
    closureViolationsCount: { type: Number, default: 0 },
    auditCaveat: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ThermalLethality = mongoose.model<IThermalLethalityRecord>(
  'ThermalLethality',
  ThermalLethalitySchema
);
