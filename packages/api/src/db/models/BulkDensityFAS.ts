import mongoose, { Document, Schema } from 'mongoose';

export interface IBulkDensityRecord extends Document {
  testId: string;
  facilityId: string;
  pitId: string;
  mixName: string;
  containerVolumeLiters: number;
  sampleNetMassKg: number;
  bulkDensityKgPerM3: number;
  estimatedMoisturePct: number;
  freeAirSpacePct: number; // FAS %
  isFasInOptimalBand: boolean; // 50% to 65% optimal
  settlementDropCm?: number;
  bulkingAdjustmentNeededKg?: number;
  testedBy: string;
  createdAt: Date;
}

const BulkDensitySchema = new Schema<IBulkDensityRecord>(
  {
    testId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    pitId: { type: String, required: true, index: true },
    mixName: { type: String, required: true },
    containerVolumeLiters: { type: Number, required: true },
    sampleNetMassKg: { type: Number, required: true },
    bulkDensityKgPerM3: { type: Number, required: true },
    estimatedMoisturePct: { type: Number, required: true },
    freeAirSpacePct: { type: Number, required: true },
    isFasInOptimalBand: { type: Boolean, default: true },
    settlementDropCm: { type: Number },
    bulkingAdjustmentNeededKg: { type: Number },
    testedBy: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const BulkDensity = mongoose.model<IBulkDensityRecord>('BulkDensity', BulkDensitySchema);
