import { Schema, model, Document, Types } from 'mongoose';

export type BanquetEventType = 'WEDDING' | 'CORPORATE_CONFERENCE' | 'COCKTAIL_DINNER' | 'BUFFET_LUNCH';

export interface IBanquetEventPlan extends Document {
  facilityId: Types.ObjectId;
  eventName: string;
  eventType: BanquetEventType;
  eventDate: Date;
  guestCount: number;
  isVegetarianMajority: boolean;
  forecastWasteKg: number;
  wasteCharacter: 'HIGH_GREASE_OILY' | 'BALANCED' | 'DRY_BAKERY';
  allocatedPitIds: Types.ObjectId[];
  stagedBulkingMaterialKg: number;
  extraLabourHoursRequired: number;
  actualWasteRecordedKg?: number;
  forecastVariancePct?: number;
}

export const BanquetEventPlanSchema = new Schema<IBanquetEventPlan>({
  facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
  eventName: { type: String, required: true },
  eventType: {
    type: String,
    enum: ['WEDDING', 'CORPORATE_CONFERENCE', 'COCKTAIL_DINNER', 'BUFFET_LUNCH'],
    required: true,
  },
  eventDate: { type: Date, required: true, index: true },
  guestCount: { type: Number, required: true, min: 1 },
  isVegetarianMajority: { type: Boolean, default: false },
  forecastWasteKg: { type: Number, required: true },
  wasteCharacter: {
    type: String,
    enum: ['HIGH_GREASE_OILY', 'BALANCED', 'DRY_BAKERY'],
    default: 'HIGH_GREASE_OILY',
  },
  allocatedPitIds: [{ type: Schema.Types.ObjectId, ref: 'PhysicalAsset' }],
  stagedBulkingMaterialKg: { type: Number, required: true },
  extraLabourHoursRequired: { type: Number, required: true, default: 2 },
  actualWasteRecordedKg: { type: Number },
  forecastVariancePct: { type: Number },
}, { timestamps: true });

export const BanquetEventPlan = model<IBanquetEventPlan>('BanquetEventPlan', BanquetEventPlanSchema);
