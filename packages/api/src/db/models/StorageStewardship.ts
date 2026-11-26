import mongoose, { Document, Schema } from 'mongoose';

export type StorageForm = 'BAGS' | 'LOOSE_PILE' | 'COVERED_SHED';

export interface IStorageCheckRecord {
  checkDate: Date;
  observedMoisturePct: number;
  observedTempC: number;
  smellScaleAmmonia: 'NONE' | 'FAINT' | 'SHARP';
  pestsOrMoldDetected: boolean;
  notes?: string;
}

export interface IStorageStewardshipRecord extends Document {
  lotId: string;
  facilityId: string;
  batchId: string;
  storageForm: StorageForm;
  quantityTons: number;
  storedSince: Date;
  daysInStorage: number;
  targetMoistureMinPct: number; // e.g. 15%
  targetMoistureMaxPct: number; // e.g. 25%
  latestCheck?: IStorageCheckRecord;
  nitrogenLossRiskScore: number; // 0-100
  reheatingAndMoldRiskScore: number; // 0-100
  overallRiskTier: 'LOW' | 'MEDIUM' | 'HIGH';
  isRetestRequired: boolean; // if stored > 60 days
  recommendedActionHindi: string;
  updatedAt: Date;
}

const StorageStewardshipSchema = new Schema<IStorageStewardshipRecord>(
  {
    lotId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    batchId: { type: String, required: true, index: true },
    storageForm: {
      type: String,
      required: true,
      enum: ['BAGS', 'LOOSE_PILE', 'COVERED_SHED'],
      default: 'BAGS',
    },
    quantityTons: { type: Number, required: true },
    storedSince: { type: Date, required: true },
    daysInStorage: { type: Number, default: 0 },
    targetMoistureMinPct: { type: Number, default: 15 },
    targetMoistureMaxPct: { type: Number, default: 25 },
    latestCheck: {
      checkDate: { type: Date },
      observedMoisturePct: { type: Number },
      observedTempC: { type: Number },
      smellScaleAmmonia: { type: String, enum: ['NONE', 'FAINT', 'SHARP'] },
      pestsOrMoldDetected: { type: Boolean, default: false },
      notes: { type: String },
    },
    nitrogenLossRiskScore: { type: Number, default: 0 },
    reheatingAndMoldRiskScore: { type: Number, default: 0 },
    overallRiskTier: {
      type: String,
      required: true,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'LOW',
    },
    isRetestRequired: { type: Boolean, default: false },
    recommendedActionHindi: { type: String, required: true },
  },
  { timestamps: true }
);

export const StorageStewardship = mongoose.model<IStorageStewardshipRecord>(
  'StorageStewardship',
  StorageStewardshipSchema
);
