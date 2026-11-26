import { Schema, model, Document, Types } from 'mongoose';

export type AssetType = 'COMPOST_BOX' | 'IOT_NODE' | 'SENSOR' | 'GATEWAY';
export type AssetStatus =
  | 'PROVISIONED'
  | 'ACTIVE'
  | 'DEGRADED'
  | 'OFFLINE'
  | 'MAINTENANCE'
  | 'DECOMMISSIONED';

export interface ISupercapacitorHealth {
  voltageMv: number;
  vDropBurstMv: number;
  tegDeltaTC: number;
  harvestEfficiencyPct: number;
  estimatedEsrMilliOhms: number;
  healthScorePct: number;
  brownoutRisk: 'LOW' | 'MODERATE' | 'CRITICAL';
  assessedAt: Date;
}

export interface ILifecycleLog {
  fromStatus: string;
  toStatus: string;
  reason: string;
  changedAt: Date;
  changedBy?: string;
}

export interface IPhysicalAsset extends Document {
  entityId: Types.ObjectId;
  facilityId: Types.ObjectId;
  type: AssetType;
  assetCode: string;
  serialNumber: string;
  name: string;
  status: AssetStatus;
  /** For IOT_NODE: hardware device key for API authentication */
  deviceKey?: string;
  deviceKeyHash?: string;
  hardwareRevision?: string;
  /** For COMPOST_BOX */
  capacityKg?: number;
  currentFillKg?: number;
  boxIndex?: number;
  /** For IOT_NODE: which box it monitors */
  parentBoxId?: Types.ObjectId;
  /** Firmware info for nodes */
  firmwareVersion?: string;
  lastSeenAt?: Date;
  ipAddress?: string;
  macAddress?: string;
  installDate?: Date;
  warrantyExpiry?: Date;
  qrCodeUrl?: string;
  /** Phase 5: Hardware Health & Predictive Maintenance */
  supercapacitorHealth?: ISupercapacitorHealth;
  lifecycleHistory?: ILifecycleLog[];
  /** Phase 5: OTA Firmware Lifecycle */
  otaTargetVersion?: string;
  otaLastStatus?: 'IDLE' | 'PENDING' | 'DOWNLOADING' | 'FLASHING' | 'SUCCESS' | 'FAILED_REVERTED';
  otaLastAttemptAt?: Date;
  otaFailureCount?: number;
  uptimeSeconds?: number;
  resetCount?: number;
  resetReason?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PhysicalAssetSchema = new Schema<IPhysicalAsset>(
  {
    entityId: { type: Schema.Types.ObjectId, ref: 'GlobalEntity', required: true, index: true },
    facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
    type: {
      type: String,
      enum: ['COMPOST_BOX', 'IOT_NODE', 'SENSOR', 'GATEWAY'],
      required: true,
    },
    assetCode: { type: String, required: true, trim: true },
    serialNumber: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['PROVISIONED', 'ACTIVE', 'DEGRADED', 'OFFLINE', 'MAINTENANCE', 'DECOMMISSIONED'],
      default: 'PROVISIONED',
    },
    deviceKey: { type: String, select: false },
    deviceKeyHash: { type: String, select: false },
    hardwareRevision: { type: String, default: 'REV_B_ESP32_A7670C' },
    capacityKg: { type: Number },
    currentFillKg: { type: Number, default: 0 },
    boxIndex: { type: Number },
    parentBoxId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset' },
    firmwareVersion: { type: String, default: 'v1.0.0' },
    lastSeenAt: { type: Date },
    ipAddress: { type: String },
    macAddress: { type: String },
    installDate: { type: Date },
    warrantyExpiry: { type: Date },
    qrCodeUrl: { type: String },
    supercapacitorHealth: {
      voltageMv: { type: Number, default: 5000 },
      vDropBurstMv: { type: Number, default: 150 },
      tegDeltaTC: { type: Number, default: 20 },
      harvestEfficiencyPct: { type: Number, default: 85 },
      estimatedEsrMilliOhms: { type: Number, default: 120 },
      healthScorePct: { type: Number, default: 95 },
      brownoutRisk: { type: String, enum: ['LOW', 'MODERATE', 'CRITICAL'], default: 'LOW' },
      assessedAt: { type: Date, default: Date.now },
    },
    lifecycleHistory: [
      {
        fromStatus: { type: String, required: true },
        toStatus: { type: String, required: true },
        reason: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: String },
      },
    ],
    otaTargetVersion: { type: String },
    otaLastStatus: {
      type: String,
      enum: ['IDLE', 'PENDING', 'DOWNLOADING', 'FLASHING', 'SUCCESS', 'FAILED_REVERTED'],
      default: 'IDLE',
    },
    otaLastAttemptAt: { type: Date },
    otaFailureCount: { type: Number, default: 0 },
    uptimeSeconds: { type: Number, default: 0 },
    resetCount: { type: Number, default: 0 },
    resetReason: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

PhysicalAssetSchema.index({ facilityId: 1, type: 1 });
PhysicalAssetSchema.index({ assetCode: 1, entityId: 1 }, { unique: true });
PhysicalAssetSchema.index({ serialNumber: 1 }, { unique: true });

export const PhysicalAsset = model<IPhysicalAsset>('PhysicalAsset', PhysicalAssetSchema);
