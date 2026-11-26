import mongoose, { Document, Schema } from 'mongoose';

export type CuringStatus = 'CURING' | 'MATURE' | 'OVER_CURED';

export interface IScreeningYield {
  screeningDate: Date;
  rawMassKg: number;
  fineCompostYieldKg: number; // passed through 4mm or 8mm sieve
  oversizeRejectsKg: number;  // recycled as carbon bulking
  yieldPercentage: number;
  moistureAtScreeningPct: number;
}

export interface IBaggingBatch {
  lotNumber: string;
  bagSizeKg: number;
  bagsCount: number;
  totalMassKg: number;
  storageZoneId: string;
  baggedAt: Date;
}

export interface ICurePile extends Document {
  curePileId: string;
  entityId: string;
  facilityId: string;
  sourcePitId: string;
  sourceBatchId: string;
  initialMassKg: number;
  currentMassKg: number;
  startDate: Date;
  targetMaturityDate: Date;
  maturityStatus: CuringStatus;
  screeningYield?: IScreeningYield;
  baggingBatches: IBaggingBatch[];
  createdAt: Date;
  updatedAt: Date;
}

const CurePileSchema = new Schema<ICurePile>(
  {
    curePileId: { type: String, required: true, unique: true, index: true },
    entityId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    sourcePitId: { type: String, required: true, index: true },
    sourceBatchId: { type: String, required: true },
    initialMassKg: { type: Number, required: true },
    currentMassKg: { type: Number, required: true },
    startDate: { type: Date, required: true },
    targetMaturityDate: { type: Date, required: true },
    maturityStatus: {
      type: String,
      required: true,
      enum: ['CURING', 'MATURE', 'OVER_CURED'],
      default: 'CURING',
      index: true,
    },
    screeningYield: {
      screeningDate: { type: Date },
      rawMassKg: { type: Number },
      fineCompostYieldKg: { type: Number },
      oversizeRejectsKg: { type: Number },
      yieldPercentage: { type: Number },
      moistureAtScreeningPct: { type: Number },
    },
    baggingBatches: [
      {
        lotNumber: { type: String, required: true },
        bagSizeKg: { type: Number, required: true },
        bagsCount: { type: Number, required: true },
        totalMassKg: { type: Number, required: true },
        storageZoneId: { type: String, required: true },
        baggedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

CurePileSchema.index({ facilityId: 1, maturityStatus: 1 });

export const CurePile = mongoose.model<ICurePile>('CurePile', CurePileSchema);
