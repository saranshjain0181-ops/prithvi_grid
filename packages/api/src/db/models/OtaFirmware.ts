import { Schema, model, Document, Types } from 'mongoose';

export type OtaRolloutStatus =
  | 'DRAFT'
  | 'CANARY'
  | 'GENERAL_AVAILABILITY'
  | 'PAUSED'
  | 'ROLLED_BACK'
  | 'DEPRECATED';

export interface IOtaFirmwareMetrics {
  stagedCount: number;
  downloadedCount: number;
  successCount: number;
  failedRollbackCount: number;
  failureRatePct: number;
}

export interface IOtaFirmware extends Document {
  version: string;
  hardwareRevision: string;
  binaryUrl: string;
  sha256: string;
  fileSizeBytes: number;
  minSupercapVoltageMv: number;
  minRssiDbm: number;
  rolloutStatus: OtaRolloutStatus;
  canaryPercentage: number;
  canaryNodeIds: Types.ObjectId[];
  metrics: IOtaFirmwareMetrics;
  autoRollbackThresholdPct: number;
  isCircuitBreakerTripped: boolean;
  circuitBreakerTrippedAt?: Date;
  circuitBreakerReason?: string;
  releaseNotes: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OtaFirmwareSchema = new Schema<IOtaFirmware>(
  {
    version: { type: String, required: true, trim: true },
    hardwareRevision: { type: String, required: true, trim: true, default: 'REV_B_ESP32_A7670C' },
    binaryUrl: { type: String, required: true },
    sha256: { type: String, required: true, trim: true },
    fileSizeBytes: { type: Number, required: true },
    minSupercapVoltageMv: { type: Number, default: 4800 },
    minRssiDbm: { type: Number, default: -85 },
    rolloutStatus: {
      type: String,
      enum: ['DRAFT', 'CANARY', 'GENERAL_AVAILABILITY', 'PAUSED', 'ROLLED_BACK', 'DEPRECATED'],
      default: 'DRAFT',
      index: true,
    },
    canaryPercentage: { type: Number, default: 5, min: 0, max: 100 },
    canaryNodeIds: [{ type: Schema.Types.ObjectId, ref: 'PhysicalAsset' }],
    metrics: {
      stagedCount: { type: Number, default: 0 },
      downloadedCount: { type: Number, default: 0 },
      successCount: { type: Number, default: 0 },
      failedRollbackCount: { type: Number, default: 0 },
      failureRatePct: { type: Number, default: 0 },
    },
    autoRollbackThresholdPct: { type: Number, default: 2.0 },
    isCircuitBreakerTripped: { type: Boolean, default: false },
    circuitBreakerTrippedAt: { type: Date },
    circuitBreakerReason: { type: String },
    releaseNotes: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster' },
  },
  { timestamps: true }
);

OtaFirmwareSchema.index({ version: 1, hardwareRevision: 1 }, { unique: true });

export const OtaFirmware = model<IOtaFirmware>('OtaFirmware', OtaFirmwareSchema);
