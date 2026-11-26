import mongoose, { Document, Schema } from 'mongoose';

export type HeatStressCategory = 'LOW' | 'CAUTION' | 'EXTREME_CAUTION' | 'DANGER';

export interface IErgonomicShiftSummary extends Document {
  recordId: string;
  entityId: string;
  facilityId: string;
  workerId: string;
  shiftDate: string; // YYYY-MM-DD
  physicalLoadUnits: number; // Sum of task effort points
  maxLoadThreshold: number;  // typically 120 PLU/shift
  ambientTempC: number;
  relativeHumidityPct: number;
  heatStressIndex: number;
  heatCategory: HeatStressCategory;
  mandatoryRestMinutes: number;
  hydrationPromptsSent: number;
  workSuspensionMandated: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ErgonomicGuardSchema = new Schema<IErgonomicShiftSummary>(
  {
    recordId: { type: String, required: true, unique: true, index: true },
    entityId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    workerId: { type: String, required: true, index: true },
    shiftDate: { type: String, required: true, index: true },
    physicalLoadUnits: { type: Number, required: true },
    maxLoadThreshold: { type: Number, default: 120 },
    ambientTempC: { type: Number, required: true },
    relativeHumidityPct: { type: Number, required: true },
    heatStressIndex: { type: Number, required: true },
    heatCategory: {
      type: String,
      required: true,
      enum: ['LOW', 'CAUTION', 'EXTREME_CAUTION', 'DANGER'],
      default: 'LOW',
    },
    mandatoryRestMinutes: { type: Number, default: 0 },
    hydrationPromptsSent: { type: Number, default: 0 },
    workSuspensionMandated: { type: Boolean, default: false },
    notes: { type: String },
  },
  { timestamps: true }
);

ErgonomicGuardSchema.index({ facilityId: 1, shiftDate: 1, workerId: 1 });

export const ErgonomicGuard = mongoose.model<IErgonomicShiftSummary>(
  'ErgonomicGuard',
  ErgonomicGuardSchema
);
