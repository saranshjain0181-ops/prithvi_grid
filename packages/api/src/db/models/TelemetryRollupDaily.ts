import { Schema, model, Document, Types } from 'mongoose';
import { ITelemetryMetadata } from './LiveTelemetry';
import { IMetricStat } from './TelemetryRollupHourly';

export interface ITelemetryRollupDaily extends Document {
  bucketDate: Date; // Midnight UTC
  metadata: ITelemetryMetadata;
  totalPackets: number;
  thermophilicHours: number; // Hours where temp >= 55°C
  aerobicHours: number;      // Hours where methane < 300 PPM
  temp: IMetricStat;
  moisture: IMetricStat;
  ph: IMetricStat;
  methane: IMetricStat;
  airPressure: IMetricStat;
  batteryMv: IMetricStat;
  complianceScore: number;   // 0 - 100 SWM-2026 daily compliance index
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

const TelemetryRollupDailySchema = new Schema<ITelemetryRollupDaily>(
  {
    bucketDate: { type: Date, required: true, index: true },
    metadata: {
      nodeId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset', required: true, index: true },
      facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
      entityId: { type: Schema.Types.ObjectId, ref: 'GlobalEntity', required: true, index: true },
      boxId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset' },
    },
    totalPackets: { type: Number, required: true },
    thermophilicHours: { type: Number, default: 0 },
    aerobicHours: { type: Number, default: 0 },
    temp: { type: MetricStatSchema, required: true },
    moisture: { type: MetricStatSchema, required: true },
    ph: { type: MetricStatSchema, required: true },
    methane: { type: MetricStatSchema, required: true },
    airPressure: { type: MetricStatSchema, required: true },
    batteryMv: { type: MetricStatSchema, required: true },
    complianceScore: { type: Number, default: 100 },
    pinned: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Compound queries for long-term municipal compliance inspection
TelemetryRollupDailySchema.index({ 'metadata.nodeId': 1, bucketDate: -1 });
TelemetryRollupDailySchema.index({ 'metadata.facilityId': 1, bucketDate: -1 });
TelemetryRollupDailySchema.index({ 'metadata.entityId': 1, bucketDate: -1 });
// NOTE: Daily rollups have NO TTL expire index — preserved indefinitely for municipal SWM audit records.

export const TelemetryRollupDaily = model<ITelemetryRollupDaily>(
  'TelemetryRollupDaily',
  TelemetryRollupDailySchema
);
