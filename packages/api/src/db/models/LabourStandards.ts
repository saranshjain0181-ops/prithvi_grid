import mongoose, { Document, Schema } from 'mongoose';

export interface IStandardTaskRate {
  taskCode: string;
  taskName: string;
  unit: string; // e.g. 'PER_TON', 'PER_BAG', 'PER_PIT'
  standardMinutes: number;
  fatigueAllowancePct: number; // e.g. 15%
}

export interface IWorkforceSizingRecord extends Document {
  sizingId: string;
  facilityId: string;
  forecastDate: string; // YYYY-MM-DD
  projectedDailyWetWasteTons: number;
  activePitsCount: number;
  requiredFteSweepers: number;
  requiredFteOperators: number;
  requiredFteSupervisors: number;
  totalRequiredStaffHours: number;
  scheduledHeadcount: number;
  varianceFte: number; // scheduled - required
  fatigueIndexWarning: boolean;
  notes?: string;
  createdAt: Date;
}

const WorkforceSizingSchema = new Schema<IWorkforceSizingRecord>(
  {
    sizingId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    forecastDate: { type: String, required: true, index: true },
    projectedDailyWetWasteTons: { type: Number, required: true },
    activePitsCount: { type: Number, required: true },
    requiredFteSweepers: { type: Number, required: true },
    requiredFteOperators: { type: Number, required: true },
    requiredFteSupervisors: { type: Number, required: true },
    totalRequiredStaffHours: { type: Number, required: true },
    scheduledHeadcount: { type: Number, required: true },
    varianceFte: { type: Number, required: true },
    fatigueIndexWarning: { type: Boolean, default: false },
    notes: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const WorkforceSizing = mongoose.model<IWorkforceSizingRecord>(
  'WorkforceSizing',
  WorkforceSizingSchema
);
