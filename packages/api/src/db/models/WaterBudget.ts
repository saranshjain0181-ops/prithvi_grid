import mongoose, { Document, Schema } from 'mongoose';

export interface IDoseStage {
  stageNumber: number;
  liters: number;
  durationSeconds: number;
  restMinutesBeforeNext: number;
}

export interface IWaterBudgetRecord extends Document {
  budgetId: string;
  entityId: string;
  facilityId: string;
  pitId: string;
  currentMoisturePct: number;
  targetMoisturePct: number;
  pileMassKg: number;
  calculatedWaterLiters: number;
  hoseFlowRateLpm: number;
  stages: IDoseStage[];
  status: 'PLANNED' | 'APPLIED' | 'CANCELLED';
  appliedBy?: string;
  appliedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WaterBudgetSchema = new Schema<IWaterBudgetRecord>(
  {
    budgetId: { type: String, required: true, unique: true, index: true },
    entityId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    pitId: { type: String, required: true, index: true },
    currentMoisturePct: { type: Number, required: true },
    targetMoisturePct: { type: Number, required: true, default: 55 },
    pileMassKg: { type: Number, required: true },
    calculatedWaterLiters: { type: Number, required: true },
    hoseFlowRateLpm: { type: Number, default: 15 },
    stages: [
      {
        stageNumber: { type: Number, required: true },
        liters: { type: Number, required: true },
        durationSeconds: { type: Number, required: true },
        restMinutesBeforeNext: { type: Number, default: 10 },
      },
    ],
    status: {
      type: String,
      required: true,
      enum: ['PLANNED', 'APPLIED', 'CANCELLED'],
      default: 'PLANNED',
      index: true,
    },
    appliedBy: { type: String },
    appliedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

WaterBudgetSchema.index({ facilityId: 1, pitId: 1, createdAt: -1 });

export const WaterBudget = mongoose.model<IWaterBudgetRecord>('WaterBudget', WaterBudgetSchema);
