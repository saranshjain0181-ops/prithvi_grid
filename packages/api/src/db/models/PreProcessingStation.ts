import mongoose, { Document, Schema } from 'mongoose';

export type SizeCheckResult = 'ALL_UNDER_FIST_SIZE' | 'FEW_OVER_FIST_SIZE' | 'MANY_OVER_FIST_SIZE';

export interface IPreProcessingSessionRecord extends Document {
  sessionId: string;
  facilityId: string;
  stationType: 'SHREDDER' | 'DEWATERING_PRESS' | 'DEPACKAGING';
  inputMassKg: number;
  outputMassKg: number;
  liquidDrainedLiters: number;
  runtimeMinutes: number;
  operatorId: string;
  operatorCertified: boolean;
  sizeCheck: SizeCheckResult;
  isSizeCheckPassed: boolean;
  sessionNotes?: string;
  createdAt: Date;
}

const PreProcessingSessionSchema = new Schema<IPreProcessingSessionRecord>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    stationType: {
      type: String,
      required: true,
      enum: ['SHREDDER', 'DEWATERING_PRESS', 'DEPACKAGING'],
      default: 'SHREDDER',
    },
    inputMassKg: { type: Number, required: true },
    outputMassKg: { type: Number, required: true },
    liquidDrainedLiters: { type: Number, default: 0 },
    runtimeMinutes: { type: Number, required: true },
    operatorId: { type: String, required: true },
    operatorCertified: { type: Boolean, required: true },
    sizeCheck: {
      type: String,
      required: true,
      enum: ['ALL_UNDER_FIST_SIZE', 'FEW_OVER_FIST_SIZE', 'MANY_OVER_FIST_SIZE'],
      default: 'ALL_UNDER_FIST_SIZE',
    },
    isSizeCheckPassed: { type: Boolean, default: true },
    sessionNotes: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PreProcessingSession = mongoose.model<IPreProcessingSessionRecord>(
  'PreProcessingSession',
  PreProcessingSessionSchema
);
