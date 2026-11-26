import mongoose, { Document, Schema } from 'mongoose';

export interface ICaseRecord extends Document {
  caseId: string;
  facilityId: string;
  incidentType: 'ACID_CRASH' | 'OVERHEATING_FIRE_RISK' | 'COLD_STALL' | 'HIGH_SALINITY' | 'BIOFILTER_BACKPRESSURE';
  title: string;
  pitArchetype: string;
  symptoms: string[];
  rootCauseAnalysis: string;
  recoveryActionsTaken: string[];
  recoveryDurationHours: number;
  totalDirectLossInr: number;
  isValidatedByAgronomist: boolean;
  validatedBy?: string;
  keyLessonLearnedHindi: string;
  createdAt: Date;
}

const CaseRecordSchema = new Schema<ICaseRecord>(
  {
    caseId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    incidentType: {
      type: String,
      required: true,
      enum: ['ACID_CRASH', 'OVERHEATING_FIRE_RISK', 'COLD_STALL', 'HIGH_SALINITY', 'BIOFILTER_BACKPRESSURE'],
    },
    title: { type: String, required: true },
    pitArchetype: { type: String, required: true },
    symptoms: [{ type: String }],
    rootCauseAnalysis: { type: String, required: true },
    recoveryActionsTaken: [{ type: String }],
    recoveryDurationHours: { type: Number, required: true },
    totalDirectLossInr: { type: Number, required: true },
    isValidatedByAgronomist: { type: Boolean, default: false },
    validatedBy: { type: String },
    keyLessonLearnedHindi: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const CaseRecord = mongoose.model<ICaseRecord>('CaseRecord', CaseRecordSchema);
