import mongoose, { Document, Schema } from 'mongoose';

export interface IThreeWayMatchRecord {
  poNumber: string;
  goodsReceiptId: string;
  invoiceNumber: string;
  poQuantityUnits: number;
  receivedScaleWeightUnits: number;
  invoicedQuantityUnits: number;
  poRateInr: number;
  invoicedRateInr: number;
  isMatchPassed: boolean;
  varianceNotes?: string;
}

export interface ISupplierScoreRecord extends Document {
  supplierId: string;
  supplierName: string;
  category: 'BULKING_MATERIAL' | 'BIOCHAR_ADDITIVES' | 'TARPAULINS_COVERS' | 'PPE_SAFETY' | 'EQUIPMENT_SPARES';
  totalDeliveriesCount: number;
  onTimeDeliveriesCount: number;
  onTimeDeliveryPct: number;
  qualityRejectionsCount: number;
  threeWayMatchPassPct: number;
  ratingTier: 'PREFERRED' | 'APPROVED' | 'PROBATIONARY';
  updatedAt: Date;
}

const SupplierScoreSchema = new Schema<ISupplierScoreRecord>(
  {
    supplierId: { type: String, required: true, unique: true, index: true },
    supplierName: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: ['BULKING_MATERIAL', 'BIOCHAR_ADDITIVES', 'TARPAULINS_COVERS', 'PPE_SAFETY', 'EQUIPMENT_SPARES'],
    },
    totalDeliveriesCount: { type: Number, default: 0 },
    onTimeDeliveriesCount: { type: Number, default: 0 },
    onTimeDeliveryPct: { type: Number, default: 100 },
    qualityRejectionsCount: { type: Number, default: 0 },
    threeWayMatchPassPct: { type: Number, default: 100 },
    ratingTier: {
      type: String,
      required: true,
      enum: ['PREFERRED', 'APPROVED', 'PROBATIONARY'],
      default: 'APPROVED',
    },
  },
  { timestamps: true }
);

export const SupplierScore = mongoose.model<ISupplierScoreRecord>(
  'SupplierScore',
  SupplierScoreSchema
);
