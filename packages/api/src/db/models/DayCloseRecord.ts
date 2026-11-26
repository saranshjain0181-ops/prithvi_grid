import mongoose, { Document, Schema } from 'mongoose';

export type ShiftType = 'MORNING' | 'EVENING' | 'NIGHT';
export type DayCloseStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED_CLOSED' | 'VARIANCE_FLAGGED';

export interface IDayCloseChecklist {
  allPitsCovered: boolean; // Tarpaulins/lids secured
  toolsReturnedAndLocked: boolean;
  waterTapsLocked: boolean;
  leachateSumpChecked: boolean;
  scaleCalibrationVerified: boolean;
  totalIntakeMassKg: number;
  unverifiedTasksCount: number;
}

export interface IDayCloseRecord extends Document {
  closeId: string;
  entityId: string;
  facilityId: string;
  shiftDate: string; // YYYY-MM-DD
  shiftType: ShiftType;
  submittedBy: string; // Shift Lead
  approvedBy?: string; // Facility Manager
  submittedAt: Date;
  approvedAt?: Date;
  checklist: IDayCloseChecklist;
  varianceNotes?: string;
  status: DayCloseStatus;
  createdAt: Date;
  updatedAt: Date;
}

const DayCloseSchema = new Schema<IDayCloseRecord>(
  {
    closeId: { type: String, required: true, unique: true, index: true },
    entityId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    shiftDate: { type: String, required: true, index: true },
    shiftType: {
      type: String,
      required: true,
      enum: ['MORNING', 'EVENING', 'NIGHT'],
      default: 'MORNING',
    },
    submittedBy: { type: String, required: true },
    approvedBy: { type: String },
    submittedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date },
    checklist: {
      allPitsCovered: { type: Boolean, default: false },
      toolsReturnedAndLocked: { type: Boolean, default: false },
      waterTapsLocked: { type: Boolean, default: false },
      leachateSumpChecked: { type: Boolean, default: false },
      scaleCalibrationVerified: { type: Boolean, default: false },
      totalIntakeMassKg: { type: Number, default: 0 },
      unverifiedTasksCount: { type: Number, default: 0 },
    },
    varianceNotes: { type: String },
    status: {
      type: String,
      required: true,
      enum: ['DRAFT', 'SUBMITTED', 'APPROVED_CLOSED', 'VARIANCE_FLAGGED'],
      default: 'DRAFT',
      index: true,
    },
  },
  { timestamps: true }
);

DayCloseSchema.index({ facilityId: 1, shiftDate: 1, shiftType: 1 });

export const DayCloseRecord = mongoose.model<IDayCloseRecord>('DayCloseRecord', DayCloseSchema);
