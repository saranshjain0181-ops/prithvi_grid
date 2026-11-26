import mongoose, { Document, Schema } from 'mongoose';

export interface INutrientBreakdown {
  nitrogenKg: number;
  phosphorusKg: number;
  potassiumKg: number;
  organicCarbonKg: number;
}

export interface INutrientRetentionRecord extends Document {
  recordId: string;
  facilityId: string;
  batchId: string;
  inputNutrients: INutrientBreakdown;
  outputNutrients: INutrientBreakdown;
  isOutputLabCertified: boolean;
  labCertificateNumber?: string;
  estimatedLossPathways: {
    volatilizationAmmoniaKg: number;
    leachateRunoffKg: number;
    storageLossKg: number;
  };
  nitrogenRetentionPct: number; // 0 to 100
  estimatedFertilizerValueInr: number;
  claimsGateStatus: 'CLAIMS_LOCKED_PENDING_LAB' | 'CERTIFIED_CLAIMS_ALLOWED';
  createdAt: Date;
}

const NutrientRetentionSchema = new Schema<INutrientRetentionRecord>(
  {
    recordId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    batchId: { type: String, required: true, index: true },
    inputNutrients: {
      nitrogenKg: { type: Number, required: true },
      phosphorusKg: { type: Number, required: true },
      potassiumKg: { type: Number, required: true },
      organicCarbonKg: { type: Number, required: true },
    },
    outputNutrients: {
      nitrogenKg: { type: Number, required: true },
      phosphorusKg: { type: Number, required: true },
      potassiumKg: { type: Number, required: true },
      organicCarbonKg: { type: Number, required: true },
    },
    isOutputLabCertified: { type: Boolean, default: false },
    labCertificateNumber: { type: String },
    estimatedLossPathways: {
      volatilizationAmmoniaKg: { type: Number, default: 0 },
      leachateRunoffKg: { type: Number, default: 0 },
      storageLossKg: { type: Number, default: 0 },
    },
    nitrogenRetentionPct: { type: Number, required: true },
    estimatedFertilizerValueInr: { type: Number, required: true },
    claimsGateStatus: {
      type: String,
      required: true,
      enum: ['CLAIMS_LOCKED_PENDING_LAB', 'CERTIFIED_CLAIMS_ALLOWED'],
      default: 'CLAIMS_LOCKED_PENDING_LAB',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const NutrientRetention = mongoose.model<INutrientRetentionRecord>(
  'NutrientRetention',
  NutrientRetentionSchema
);
