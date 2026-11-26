import mongoose, { Document, Schema } from 'mongoose';

export type GateDecision = 'ACCEPT' | 'ACCEPT_AFTER_SORTING' | 'REJECT';
export type ContaminantType = 'PLASTIC' | 'CUTLERY_METAL' | 'GLASS' | 'LARGE_BONES' | 'EXCESS_OIL' | 'SUSPECTED_BIOMEDICAL';

export interface IGateInspectionRecord extends Document {
  inspectionId: string;
  facilityId: string;
  containerId: string;
  sourceDepartment: string; // e.g. 'MAIN_KITCHEN', 'BANQUET_HALL', 'WARD_4'
  contaminationLevel: 'NONE' | 'MINOR' | 'MAJOR';
  contaminantsFound: ContaminantType[];
  decision: GateDecision;
  sortingDurationMinutes: number;
  contaminantWeightKg: number;
  isBiomedicalAlert: boolean;
  feedbackCardSent: boolean;
  feedbackMessage?: string;
  inspectedBy: string;
  inspectedAt: Date;
}

const GateInspectionSchema = new Schema<IGateInspectionRecord>(
  {
    inspectionId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    containerId: { type: String, required: true, index: true },
    sourceDepartment: { type: String, required: true, index: true },
    contaminationLevel: {
      type: String,
      required: true,
      enum: ['NONE', 'MINOR', 'MAJOR'],
      default: 'NONE',
    },
    contaminantsFound: [{ type: String }],
    decision: {
      type: String,
      required: true,
      enum: ['ACCEPT', 'ACCEPT_AFTER_SORTING', 'REJECT'],
      default: 'ACCEPT',
    },
    sortingDurationMinutes: { type: Number, default: 0 },
    contaminantWeightKg: { type: Number, default: 0 },
    isBiomedicalAlert: { type: Boolean, default: false, index: true },
    feedbackCardSent: { type: Boolean, default: false },
    feedbackMessage: { type: String },
    inspectedBy: { type: String, required: true },
    inspectedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

GateInspectionSchema.index({ facilityId: 1, sourceDepartment: 1 });

export const GateInspection = mongoose.model<IGateInspectionRecord>('GateInspection', GateInspectionSchema);
