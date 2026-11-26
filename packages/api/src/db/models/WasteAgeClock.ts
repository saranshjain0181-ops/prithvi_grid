import mongoose, { Document, Schema } from 'mongoose';

export type FreshnessGrade = 'FRESH' | 'FERMENTING' | 'SOUR_CRITICAL';

export interface IWasteAgeClock extends Document {
  batchId: string;
  entityId: string;
  facilityId: string;
  sourceZone: 'MAIN_KITCHEN' | 'BANQUET_HALL' | 'HOSPITAL_DIETETICS' | 'GUEST_ROOM_FLOORS' | 'TOWNSHIP_WARD';
  generatedAt: Date;
  collectedAt?: Date;
  loadedAt?: Date;
  holdingBinId?: string;
  loadedToPitId?: string;
  ageHoursAtLoading: number;
  freshnessGrade: FreshnessGrade;
  bufferingRecommended: boolean;
  woodAshGramsRecommended: number;
  dryBulkingKgRecommended: number;
  status: 'COLLECTED' | 'HOLDING' | 'LOADED' | 'DISCARDED';
  createdAt: Date;
  updatedAt: Date;
}

const WasteAgeClockSchema = new Schema<IWasteAgeClock>(
  {
    batchId: { type: String, required: true, unique: true, index: true },
    entityId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    sourceZone: {
      type: String,
      required: true,
      enum: ['MAIN_KITCHEN', 'BANQUET_HALL', 'HOSPITAL_DIETETICS', 'GUEST_ROOM_FLOORS', 'TOWNSHIP_WARD'],
    },
    generatedAt: { type: Date, required: true },
    collectedAt: { type: Date },
    loadedAt: { type: Date },
    holdingBinId: { type: String },
    loadedToPitId: { type: String, index: true },
    ageHoursAtLoading: { type: Number, default: 0 },
    freshnessGrade: {
      type: String,
      required: true,
      enum: ['FRESH', 'FERMENTING', 'SOUR_CRITICAL'],
      default: 'FRESH',
    },
    bufferingRecommended: { type: Boolean, default: false },
    woodAshGramsRecommended: { type: Number, default: 0 },
    dryBulkingKgRecommended: { type: Number, default: 0 },
    status: {
      type: String,
      required: true,
      enum: ['COLLECTED', 'HOLDING', 'LOADED', 'DISCARDED'],
      default: 'COLLECTED',
      index: true,
    },
  },
  { timestamps: true }
);

WasteAgeClockSchema.index({ facilityId: 1, freshnessGrade: 1 });

export const WasteAgeClock = mongoose.model<IWasteAgeClock>('WasteAgeClock', WasteAgeClockSchema);
