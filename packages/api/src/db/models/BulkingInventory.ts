import { Schema, model, Document, Types } from 'mongoose';

export type BulkingMaterialType = 'SAWDUST' | 'DRY_LEAVES' | 'COCOPEAT' | 'PADDY_STRAW' | 'WOOD_ASH';

export interface IBulkingInventoryItem extends Document {
  facilityId: Types.ObjectId;
  materialType: BulkingMaterialType;
  currentStockKg: number;
  unit: 'KG' | 'BAGS' | 'TROLLEYS';
  reorderPointKg: number;
  daysOfCover: number;
  preferredSupplier: {
    supplierName: string;
    phone: string;
    ratePerKgInr: number;
    leadTimeDays: number;
  };
  allowedSubstitutes: BulkingMaterialType[];
  lastRestockedAt?: Date;
  status: 'OPTIMAL' | 'REORDER_DUE' | 'CRITICALLY_LOW';
}

export const BulkingInventorySchema = new Schema<IBulkingInventoryItem>({
  facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
  materialType: {
    type: String,
    enum: ['SAWDUST', 'DRY_LEAVES', 'COCOPEAT', 'PADDY_STRAW', 'WOOD_ASH'],
    required: true,
  },
  currentStockKg: { type: Number, required: true, min: 0 },
  unit: { type: String, enum: ['KG', 'BAGS', 'TROLLEYS'], default: 'KG' },
  reorderPointKg: { type: Number, required: true, default: 200 },
  daysOfCover: { type: Number, required: true, default: 14 },
  preferredSupplier: {
    supplierName: { type: String, required: true },
    phone: { type: String, required: true },
    ratePerKgInr: { type: Number, required: true, default: 4.5 },
    leadTimeDays: { type: Number, required: true, default: 2 },
  },
  allowedSubstitutes: [{
    type: String,
    enum: ['SAWDUST', 'DRY_LEAVES', 'COCOPEAT', 'PADDY_STRAW', 'WOOD_ASH'],
  }],
  lastRestockedAt: { type: Date },
  status: {
    type: String,
    enum: ['OPTIMAL', 'REORDER_DUE', 'CRITICALLY_LOW'],
    default: 'OPTIMAL',
  },
}, { timestamps: true });

BulkingInventorySchema.index({ facilityId: 1, materialType: 1 }, { unique: true });

export const BulkingInventory = model<IBulkingInventoryItem>('BulkingInventory', BulkingInventorySchema);
