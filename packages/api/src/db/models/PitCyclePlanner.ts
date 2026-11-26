import mongoose, { Document, Schema } from 'mongoose';

export interface IPitCycleAllocation {
  pitId: string;
  batchId?: string;
  status: 'FILLING_ACCEPTING' | 'CLOSED_THERMOPHILIC' | 'CLOSED_CURING' | 'EMPTY_CLEAN';
  currentFillKg: number;
  maxCapacityKg: number;
  availableCapacityKg: number;
  expectedClosureDate?: string;
  expectedHarvestDate?: string;
}

export interface IPitCyclePlannerRecord extends Document {
  planId: string;
  facilityId: string;
  asOfDate: string; // YYYY-MM-DD
  forecastDailyIntakeKg: number;
  capacityRunwayDays: number;
  yardUtilisationPct: number;
  allocations: IPitCycleAllocation[];
  overflowRiskDetected: boolean;
  recommendedMitigationHindi?: string;
  createdAt: Date;
}

const PitCyclePlannerSchema = new Schema<IPitCyclePlannerRecord>(
  {
    planId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    asOfDate: { type: String, required: true, index: true },
    forecastDailyIntakeKg: { type: Number, required: true },
    capacityRunwayDays: { type: Number, required: true },
    yardUtilisationPct: { type: Number, required: true },
    allocations: [
      {
        pitId: { type: String, required: true },
        batchId: { type: String },
        status: { type: String, required: true },
        currentFillKg: { type: Number, required: true },
        maxCapacityKg: { type: Number, required: true },
        availableCapacityKg: { type: Number, required: true },
        expectedClosureDate: { type: String },
        expectedHarvestDate: { type: String },
      },
    ],
    overflowRiskDetected: { type: Boolean, default: false },
    recommendedMitigationHindi: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PitCyclePlanner = mongoose.model<IPitCyclePlannerRecord>(
  'PitCyclePlanner',
  PitCyclePlannerSchema
);
