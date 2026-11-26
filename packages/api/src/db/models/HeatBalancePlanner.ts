import mongoose, { Document, Schema } from 'mongoose';

export type CoolingActionType =
  | 'LOOSEN_OR_REMOVE_COVER'
  | 'SPREAD_TOP_LAYER'
  | 'MECHANICAL_AERATION_TURN'
  | 'MEASURED_STEP_WATERING'
  | 'ADD_BULKY_CARBON'
  | 'WAIT_AND_RECHECK';

export interface ICoolingActionStep {
  stepNumber: number;
  actionType: CoolingActionType;
  instructionsHindi: string;
  expectedTempDropC: number;
  waterQuantityLiters?: number;
  status: 'PENDING' | 'EXECUTED' | 'VERIFIED' | 'SKIPPED';
  executedAt?: Date;
  verifiedTempC?: number;
}

export interface IHeatBalanceRecord extends Document {
  planId: string;
  pitId: string;
  batchId: string;
  triggerTempC: number;
  biologicalHeatGenWatts: number;
  evaporativeCoolingPotentialWatts: number;
  isFireRiskBranch: boolean;
  emergencyInstructions?: string;
  steps: ICoolingActionStep[];
  planStatus: 'ACTIVE' | 'RESOLVED' | 'ESCALATED_FIRE_RISK';
  reboundCheckDueAt?: Date;
  createdAt: Date;
}

const HeatBalanceSchema = new Schema<IHeatBalanceRecord>(
  {
    planId: { type: String, required: true, unique: true, index: true },
    pitId: { type: String, required: true, index: true },
    batchId: { type: String, required: true, index: true },
    triggerTempC: { type: Number, required: true },
    biologicalHeatGenWatts: { type: Number, required: true },
    evaporativeCoolingPotentialWatts: { type: Number, required: true },
    isFireRiskBranch: { type: Boolean, default: false },
    emergencyInstructions: { type: String },
    steps: [
      {
        stepNumber: { type: Number, required: true },
        actionType: { type: String, required: true },
        instructionsHindi: { type: String, required: true },
        expectedTempDropC: { type: Number, required: true },
        waterQuantityLiters: { type: Number },
        status: {
          type: String,
          required: true,
          enum: ['PENDING', 'EXECUTED', 'VERIFIED', 'SKIPPED'],
          default: 'PENDING',
        },
        executedAt: { type: Date },
        verifiedTempC: { type: Number },
      },
    ],
    planStatus: {
      type: String,
      required: true,
      enum: ['ACTIVE', 'RESOLVED', 'ESCALATED_FIRE_RISK'],
      default: 'ACTIVE',
    },
    reboundCheckDueAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const HeatBalancePlan = mongoose.model<IHeatBalanceRecord>('HeatBalancePlan', HeatBalanceSchema);
