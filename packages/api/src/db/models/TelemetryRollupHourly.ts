import { Schema, model, Document, Types } from 'mongoose';
import { ITelemetryMetadata } from './LiveTelemetry';

export interface IMetricStat {
  min: number;
  max: number;
  avg: number;
  stdDev?: number;
}

export interface ITelemetryRollupHourly extends Document {
  bucketStart: Date;
  bucketEnd: Date;
  metadata: ITelemetryMetadata;
  count: number;
  temp: IMetricStat;
  moisture: IMetricStat;
  ph: IMetricStat;
  methane: IMetricStat;
  airPressure: IMetricStat;
  batteryMv: IMetricStat;
  quality: {
    validCount: number;
    anomalyCount: number;
  };
  pinned?: boolean;
}

const MetricStatSchema = new Schema<IMetricStat>(
  {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    avg: { type: Number, required: true },
    stdDev: { type: Number, default: 0 },
  },
  { _id: false }
);

const TelemetryRollupHourlySchema = new Schema<ITelemetryRollupHourly>(
  {
    bucketStart: { type: Date, required: true, index: true },
    bucketEnd: { type: Date, required: true },
    metadata: {
      nodeId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset', required: true, index: true },
      facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
      entityId: { type: Schema.Types.ObjectId, ref: 'GlobalEntity', required: true, index: true },
      boxId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset' },
    },
    count: { type: Number, required: true },
    temp: { type: MetricStatSchema, required: true },
    moisture: { type: MetricStatSchema, required: true },
    ph: { type: MetricStatSchema, required: true },
    methane: { type: MetricStatSchema, required: true },
    airPressure: { type: MetricStatSchema, required: true },
    batteryMv: { type: MetricStatSchema, required: true },
    quality: {
      validCount: { type: Number, default: 0 },
      anomalyCount: { type: Number, default: 0 },
    },
    pinned: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Compound queries for analytics
TelemetryRollupHourlySchema.index({ 'metadata.nodeId': 1, bucketStart: -1 });
TelemetryRollupHourlySchema.index({ 'metadata.facilityId': 1, bucketStart: -1 });
TelemetryRollupHourlySchema.index({ 'metadata.entityId': 1, bucketStart: -1 });

// Tiered Retention: 2-Year retention on hourly rollups
TelemetryRollupHourlySchema.index(
  { bucketStart: 1 },
  {
    expireAfterSeconds: 2 * 365 * 24 * 60 * 60,
    partialFilterExpression: { pinned: { $ne: true } },
  }
);

export const TelemetryRollupHourly = model<ITelemetryRollupHourly>(
  'TelemetryRollupHourly',
  TelemetryRollupHourlySchema
);
