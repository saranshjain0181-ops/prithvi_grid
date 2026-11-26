import mongoose, { Document, Schema } from 'mongoose';

export type ScaleCheckStatus = 'PASS' | 'FAIL' | 'WARN';

export interface IScaleCalibrationCheck extends Document {
  checkId: string;
  entityId: string;
  facilityId: string;
  equipmentId: string;
  checkDate: string; // YYYY-MM-DD
  performedBy: string;
  referenceWeightGrams: number; // e.g. 10000g calibration block
  observedWeightGrams: number;
  errorGrams: number;
  toleranceAllowedGrams: number;
  status: ScaleCheckStatus;
  photoProofUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ScaleCalibrationCheckSchema = new Schema<IScaleCalibrationCheck>(
  {
    checkId: { type: String, required: true, unique: true, index: true },
    entityId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    equipmentId: { type: String, required: true, index: true },
    checkDate: { type: String, required: true, index: true },
    performedBy: { type: String, required: true },
    referenceWeightGrams: { type: Number, required: true },
    observedWeightGrams: { type: Number, required: true },
    errorGrams: { type: Number, required: true },
    toleranceAllowedGrams: { type: Number, required: true },
    status: {
      type: String,
      required: true,
      enum: ['PASS', 'FAIL', 'WARN'],
      index: true,
    },
    photoProofUrl: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

ScaleCalibrationCheckSchema.index({ facilityId: 1, checkDate: 1, equipmentId: 1 });

export const ScaleCalibrationCheck = mongoose.model<IScaleCalibrationCheck>(
  'ScaleCalibrationCheck',
  ScaleCalibrationCheckSchema
);
