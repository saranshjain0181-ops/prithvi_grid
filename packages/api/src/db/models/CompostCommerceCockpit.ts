import mongoose, { Document, Schema } from 'mongoose';

export type CommerceSignalType = 'OVERSTOCK_RISK' | 'STOCKOUT_RISK' | 'AGEING_LOT_RISK' | 'QUALITY_HOLD';

export interface ICommerceSignal {
  signalType: CommerceSignalType;
  severity: 'ROUTINE' | 'ELEVATED' | 'CRITICAL';
  lotOrBatchId?: string;
  recommendedActionHindi: string;
}

export interface ICompostCommerceRecord extends Document {
  snapshotId: string;
  facilityId: string;
  asOfDate: string; // YYYY-MM-DD
  readyCompostStockMt: number;
  gradeAStockMt: number;
  gradeBStockMt: number;
  bookedOrdersMt: number;
  forecastProduction8WeeksMt: number;
  realisedAveragePricePerKgInr: number;
  grossMarginPct: number;
  activeSignals: ICommerceSignal[];
  createdAt: Date;
}

const CompostCommerceSchema = new Schema<ICompostCommerceRecord>(
  {
    snapshotId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    asOfDate: { type: String, required: true, index: true },
    readyCompostStockMt: { type: Number, required: true },
    gradeAStockMt: { type: Number, required: true },
    gradeBStockMt: { type: Number, required: true },
    bookedOrdersMt: { type: Number, required: true },
    forecastProduction8WeeksMt: { type: Number, required: true },
    realisedAveragePricePerKgInr: { type: Number, required: true },
    grossMarginPct: { type: Number, required: true },
    activeSignals: [
      {
        signalType: { type: String, required: true },
        severity: { type: String, required: true },
        lotOrBatchId: { type: String },
        recommendedActionHindi: { type: String, required: true },
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const CompostCommerce = mongoose.model<ICompostCommerceRecord>(
  'CompostCommerce',
  CompostCommerceSchema
);
