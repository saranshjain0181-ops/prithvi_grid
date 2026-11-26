import mongoose, { Document, Schema } from 'mongoose';

export type BuyerCategory = 'NURSERY' | 'FARMER_COOPERATIVE' | 'HOTEL_LANDSCAPE_INTERNAL' | 'MUNICIPAL_PARKS' | 'RETAIL_DIRECT';

export interface IOfftakeCommitment {
  buyerName: string;
  category: BuyerCategory;
  requestedQuantityKg: number;
  agreedPricePerKgInr: number;
  deliveryDate: string; // YYYY-MM-DD
  status: 'COMMITTED' | 'DISPATCHED' | 'CANCELLED';
}

export interface IOfftakePlan extends Document {
  planId: string;
  entityId: string;
  facilityId: string;
  planningMonth: string; // YYYY-MM
  availableStockKg: number;
  forecastedProductionKg: number;
  totalAvailableKg: number;
  commitments: IOfftakeCommitment[];
  totalCommittedKg: number;
  uncommittedSurplusKg: number;
  projectedRevenueInr: number;
  status: 'DRAFT' | 'ACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const OfftakePlanSchema = new Schema<IOfftakePlan>(
  {
    planId: { type: String, required: true, unique: true, index: true },
    entityId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    planningMonth: { type: String, required: true, index: true },
    availableStockKg: { type: Number, required: true },
    forecastedProductionKg: { type: Number, required: true },
    totalAvailableKg: { type: Number, required: true },
    commitments: [
      {
        buyerName: { type: String, required: true },
        category: {
          type: String,
          required: true,
          enum: ['NURSERY', 'FARMER_COOPERATIVE', 'HOTEL_LANDSCAPE_INTERNAL', 'MUNICIPAL_PARKS', 'RETAIL_DIRECT'],
        },
        requestedQuantityKg: { type: Number, required: true },
        agreedPricePerKgInr: { type: Number, required: true },
        deliveryDate: { type: String, required: true },
        status: {
          type: String,
          required: true,
          enum: ['COMMITTED', 'DISPATCHED', 'CANCELLED'],
          default: 'COMMITTED',
        },
      },
    ],
    totalCommittedKg: { type: Number, required: true },
    uncommittedSurplusKg: { type: Number, required: true },
    projectedRevenueInr: { type: Number, required: true },
    status: {
      type: String,
      required: true,
      enum: ['DRAFT', 'ACTIVE'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

OfftakePlanSchema.index({ facilityId: 1, planningMonth: 1 });

export const OfftakePlan = mongoose.model<IOfftakePlan>('OfftakePlan', OfftakePlanSchema);
