import mongoose, { Document, Schema } from 'mongoose';

export type EquipmentCategory =
  | 'WEIGHING_SCALE'
  | 'SHREDDER'
  | 'MOISTURE_METER'
  | 'SIEVE_SCREEN'
  | 'WATER_PUMP'
  | 'FORK_TOOL'
  | 'TARPAULIN'
  | 'SAFETY_PPE';

export type EquipmentStatus =
  | 'ACTIVE'
  | 'OUT_OF_SERVICE'
  | 'MAINTENANCE_REQUIRED'
  | 'STANDBY';

export interface IEquipmentAsset extends Document {
  equipmentId: string;
  entityId: string;
  facilityId: string;
  name: string;
  category: EquipmentCategory;
  serialNumber?: string;
  modelName?: string;
  capacityKg?: number;
  divisionGrams?: number;
  maxToleranceGrams: number;
  tareWeightKg?: number;
  calibrationCertDate?: Date;
  calibrationCertExpiry?: Date;
  dailyCheckRequired: boolean;
  status: EquipmentStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EquipmentAssetSchema = new Schema<IEquipmentAsset>(
  {
    equipmentId: { type: String, required: true, unique: true, index: true },
    entityId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: [
        'WEIGHING_SCALE',
        'SHREDDER',
        'MOISTURE_METER',
        'SIEVE_SCREEN',
        'WATER_PUMP',
        'FORK_TOOL',
        'TARPAULIN',
        'SAFETY_PPE',
      ],
      index: true,
    },
    serialNumber: { type: String },
    modelName: { type: String },
    capacityKg: { type: Number },
    divisionGrams: { type: Number },
    maxToleranceGrams: { type: Number, default: 50 }, // default 50g tolerance for platform scales
    tareWeightKg: { type: Number, default: 0 },
    calibrationCertDate: { type: Date },
    calibrationCertExpiry: { type: Date },
    dailyCheckRequired: { type: Boolean, default: true },
    status: {
      type: String,
      required: true,
      enum: ['ACTIVE', 'OUT_OF_SERVICE', 'MAINTENANCE_REQUIRED', 'STANDBY'],
      default: 'ACTIVE',
      index: true,
    },
    notes: { type: String },
  },
  { timestamps: true }
);

EquipmentAssetSchema.index({ facilityId: 1, category: 1, status: 1 });

export const EquipmentAsset = mongoose.model<IEquipmentAsset>(
  'EquipmentAsset',
  EquipmentAssetSchema
);
