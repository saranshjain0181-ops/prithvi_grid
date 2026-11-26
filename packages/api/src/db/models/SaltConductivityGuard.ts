import mongoose, { Document, Schema } from 'mongoose';

export interface IConductivityBlendPlan {
  originalBatchId: string;
  measuredEcDsM: number;
  targetMaxEcDsM: number;
  dilutionBatchId?: string;
  blendingRatio: string; // e.g. "1:1 with low-salt garden compost"
  expectedBlendedEcDsM: number;
  isCompliantForAgriSales: boolean;
}

export interface ISaltConductivityRecord extends Document {
  readingId: string;
  facilityId: string;
  batchId: string;
  protocolDilutionRatio: string; // e.g. "1:5 deionised water"
  measuredEcDsM: number; // electrical conductivity in dS/m
  stageMeasured: 'THERMOPHILIC_END' | 'PRE_SCREENING' | 'PRE_SALE_FINAL';
  targetMaxEcDsM: number; // default 4.0 dS/m under FCO 1985
  isWithinProductBand: boolean;
  blendPlan?: IConductivityBlendPlan;
  meterCalibrationStatus: 'VERIFIED' | 'OVERDUE';
  testedBy: string;
  createdAt: Date;
}

const SaltConductivitySchema = new Schema<ISaltConductivityRecord>(
  {
    readingId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    batchId: { type: String, required: true, index: true },
    protocolDilutionRatio: { type: String, default: '1:5 sample:water' },
    measuredEcDsM: { type: Number, required: true },
    stageMeasured: {
      type: String,
      required: true,
      enum: ['THERMOPHILIC_END', 'PRE_SCREENING', 'PRE_SALE_FINAL'],
    },
    targetMaxEcDsM: { type: Number, default: 4.0 },
    isWithinProductBand: { type: Boolean, default: true },
    blendPlan: {
      originalBatchId: { type: String },
      measuredEcDsM: { type: Number },
      targetMaxEcDsM: { type: Number },
      dilutionBatchId: { type: String },
      blendingRatio: { type: String },
      expectedBlendedEcDsM: { type: Number },
      isCompliantForAgriSales: { type: Boolean },
    },
    meterCalibrationStatus: {
      type: String,
      required: true,
      enum: ['VERIFIED', 'OVERDUE'],
      default: 'VERIFIED',
    },
    testedBy: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const SaltConductivity = mongoose.model<ISaltConductivityRecord>(
  'SaltConductivity',
  SaltConductivitySchema
);
