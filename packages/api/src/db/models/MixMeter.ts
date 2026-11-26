import mongoose, { Document, Schema } from 'mongoose';

export interface ILayerInput {
  materialType: 'KITCHEN_WET_WASTE' | 'GARDEN_GREENS' | 'SAWDUST' | 'DRY_LEAVES' | 'COCOPEAT' | 'SHREDDED_CARTON';
  massKg: number;
  carbonNitrogenRatio: number;
  moisturePercent: number;
  bulkDensityKgPerM3: number;
}

export interface IMixRecipeResult {
  blendedCnRatio: number;
  blendedMoisturePercent: number;
  freeAirSpacePercent: number;
  isOptimal: boolean;
  recommendedBulkingKg: number;
  recommendedBucketsBulking: number; // 1 standard bucket ~ 10-15 litres
  warnings: string[];
}

export interface IMixMeterRecord extends Document {
  recordId: string;
  entityId: string;
  facilityId: string;
  pitId: string;
  performedBy: string;
  layers: ILayerInput[];
  recipeResult: IMixRecipeResult;
  createdAt: Date;
  updatedAt: Date;
}

const MixMeterSchema = new Schema<IMixMeterRecord>(
  {
    recordId: { type: String, required: true, unique: true, index: true },
    entityId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    pitId: { type: String, required: true, index: true },
    performedBy: { type: String, required: true },
    layers: [
      {
        materialType: { type: String, required: true },
        massKg: { type: Number, required: true },
        carbonNitrogenRatio: { type: Number, required: true },
        moisturePercent: { type: Number, required: true },
        bulkDensityKgPerM3: { type: Number, required: true },
      },
    ],
    recipeResult: {
      blendedCnRatio: { type: Number, required: true },
      blendedMoisturePercent: { type: Number, required: true },
      freeAirSpacePercent: { type: Number, required: true },
      isOptimal: { type: Boolean, default: false },
      recommendedBulkingKg: { type: Number, default: 0 },
      recommendedBucketsBulking: { type: Number, default: 0 },
      warnings: [{ type: String }],
    },
  },
  { timestamps: true }
);

MixMeterSchema.index({ facilityId: 1, pitId: 1, createdAt: -1 });

export const MixMeter = mongoose.model<IMixMeterRecord>('MixMeter', MixMeterSchema);
