import mongoose, { Document, Schema } from 'mongoose';

export interface IVermiBedRecord extends Document {
  bedId: string;
  facilityId: string;
  bedName: string;
  wormSpecies: 'EISENIA_FETIDA' | 'EUDRILUS_EUGENIAE' | 'PERIONYX_EXCAVATUS';
  bedAreaM2: number;
  bedTempC: number; // 18-30C optimal
  bedMoisturePct: number; // 60-75% optimal
  wormHealthScorePct: number; // 0-100
  feedReadinessStatus: 'FEED_READY' | 'HOT_OR_SOUR_FEED_REJECTED';
  activePrecompostSourcePitId?: string;
  cumulativeVermicompostHarvestKg: number;
  cumulativeVermiwashLiters: number;
  lastFedAt?: Date;
  lastHarvestAt?: Date;
  createdAt: Date;
}

const VermiBedSchema = new Schema<IVermiBedRecord>(
  {
    bedId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    bedName: { type: String, required: true },
    wormSpecies: {
      type: String,
      required: true,
      enum: ['EISENIA_FETIDA', 'EUDRILUS_EUGENIAE', 'PERIONYX_EXCAVATUS'],
      default: 'EISENIA_FETIDA',
    },
    bedAreaM2: { type: Number, required: true },
    bedTempC: { type: Number, required: true },
    bedMoisturePct: { type: Number, required: true },
    wormHealthScorePct: { type: Number, required: true },
    feedReadinessStatus: {
      type: String,
      required: true,
      enum: ['FEED_READY', 'HOT_OR_SOUR_FEED_REJECTED'],
      default: 'FEED_READY',
    },
    activePrecompostSourcePitId: { type: String },
    cumulativeVermicompostHarvestKg: { type: Number, default: 0 },
    cumulativeVermiwashLiters: { type: Number, default: 0 },
    lastFedAt: { type: Date },
    lastHarvestAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const VermiBed = mongoose.model<IVermiBedRecord>('VermiBed', VermiBedSchema);
