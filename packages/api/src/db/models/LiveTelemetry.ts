import { Schema, model, Document, Types } from 'mongoose';

export type SensorQualityStatus = 'VALID' | 'SPIKE_SUPPRESSED' | 'OUT_OF_BOUNDS' | 'SENSOR_FROZEN';

export interface ITelemetryMetadata {
  nodeId: Types.ObjectId;
  facilityId: Types.ObjectId;
  entityId: Types.ObjectId;
  boxId?: Types.ObjectId;
}

export interface ITelemetryQuality {
  status: SensorQualityStatus;
  issues?: string[];
  rawTempC?: number;
  rawMoisturePct?: number;
  rawPh?: number;
  rawMethanePpm?: number;
  rawPressureHpa?: number;
}

export interface ILiveTelemetry extends Document {
  metadata: ITelemetryMetadata;
  nodeId: Types.ObjectId;
  facilityId: Types.ObjectId;
  entityId: Types.ObjectId;
  boxId?: Types.ObjectId;
  timestamp: Date;
  tempC: number;
  moisturePct: number;
  ph: number;
  methanePpm: number;
  airPressureHpa: number;
  batteryMv: number;
  signalRssi: number;
  quality?: ITelemetryQuality;
  rawEncrypted?: string;
  flagged?: boolean;
  flagReason?: string;
  pinned?: boolean; // Pinned telemetry exempted from TTL for SWM-2026 compliance audits
}

const TelemetryMetadataSchema = new Schema<ITelemetryMetadata>(
  {
    nodeId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset', required: true, index: true },
    facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
    entityId: { type: Schema.Types.ObjectId, ref: 'GlobalEntity', required: true, index: true },
    boxId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset' },
  },
  { _id: false }
);

const TelemetryQualitySchema = new Schema<ITelemetryQuality>(
  {
    status: {
      type: String,
      enum: ['VALID', 'SPIKE_SUPPRESSED', 'OUT_OF_BOUNDS', 'SENSOR_FROZEN'],
      default: 'VALID',
    },
    issues: [{ type: String }],
    rawTempC: { type: Number },
    rawMoisturePct: { type: Number },
    rawPh: { type: Number },
    rawMethanePpm: { type: Number },
    rawPressureHpa: { type: Number },
  },
  { _id: false }
);

const LiveTelemetrySchema = new Schema<ILiveTelemetry>(
  {
    metadata: { type: TelemetryMetadataSchema },
    // Direct fields preserved for clean backward compatibility
    nodeId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset', required: true, index: true },
    facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
    entityId: { type: Schema.Types.ObjectId, ref: 'GlobalEntity', required: true, index: true },
    boxId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset', index: true },
    timestamp: { type: Date, required: true, default: Date.now },
    tempC: { type: Number, required: true },
    moisturePct: { type: Number, required: true },
    ph: { type: Number, required: true },
    methanePpm: { type: Number, required: true },
    airPressureHpa: { type: Number, required: true },
    batteryMv: { type: Number, required: true },
    signalRssi: { type: Number, required: true },
    quality: { type: TelemetryQualitySchema, default: () => ({ status: 'VALID' }) },
    rawEncrypted: { type: String },
    flagged: { type: Boolean, default: false },
    flagReason: { type: String },
    pinned: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: false,
    timeseries: {
      timeField: 'timestamp',
      metaField: 'metadata',
      granularity: 'minutes',
    },
  }
);

// Populate metadata automatically before save if direct fields are provided
LiveTelemetrySchema.pre('save', function (next) {
  if (!this.metadata) {
    this.metadata = {
      nodeId: this.nodeId,
      facilityId: this.facilityId,
      entityId: this.entityId,
      boxId: this.boxId,
    };
  }
  next();
});

// Primary compound indexes for fast time-range queries
LiveTelemetrySchema.index({ nodeId: 1, timestamp: -1 });
LiveTelemetrySchema.index({ facilityId: 1, timestamp: -1 });
LiveTelemetrySchema.index({ entityId: 1, timestamp: -1 });
LiveTelemetrySchema.index({ 'metadata.nodeId': 1, timestamp: -1 });

// Tiered Retention: 90 days for raw telemetry, exempting pinned compliance audit packets
LiveTelemetrySchema.index(
  { timestamp: 1 },
  {
    expireAfterSeconds: 90 * 24 * 60 * 60,
    partialFilterExpression: { pinned: { $ne: true } },
  }
);

export const LiveTelemetry = model<ILiveTelemetry>('LiveTelemetry', LiveTelemetrySchema);
