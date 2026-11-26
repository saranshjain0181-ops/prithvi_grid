import { Schema, model, Document, Types } from 'mongoose';

export interface ISensorHealthMetrics {
  sensorType: 'TEMPERATURE' | 'MOISTURE' | 'PH' | 'METHANE' | 'PRESSURE';
  trustScore: number; // 0 to 100
  calibrationAgeDays: number;
  driftPpmOrUnit: number;
  stuckSignalFlag: boolean;
  noiseLevelPct: number;
  virtualSensorDivergencePct: number;
  status: 'HEALTHY' | 'DEGRADED' | 'FAILED' | 'REPLACED';
  actionRequired?: string;
}

export interface ITruckRollAvoidanceState {
  currentStage: 'STAGE_0_NORMAL' | 'STAGE_1_REMOTE_DIAGNOSTICS' | 'STAGE_2_REMOTE_SELF_CLEAN' | 'STAGE_3_GROUND_ASSIST' | 'STAGE_4_BATCHED_DISPATCH';
  lastStageTransitionAt: Date;
  diagnosticsBurstScheduledAt?: Date;
  buzzerPulseTriggeredAt?: Date;
  groundAssistPromptedAt?: Date;
  groundAssistAcknowledged?: boolean;
  technicianDispatchQueuedAt?: Date;
  resolvedWithoutDispatch: boolean;
  avoidanceLogNotes: string[];
}

export interface ISensorTrustRecord extends Document {
  nodeId: Types.ObjectId;
  pitId: Types.ObjectId;
  facilityId: Types.ObjectId;
  assessedAt: Date;
  overallNodeTrustScore: number; // 0 to 100
  sensorMetrics: ISensorHealthMetrics[];
  failureForecastDays?: number; // Estimated days until critical failure
  recommendedAction: 'NO_ACTION' | 'FORCE_READ' | 'REMOTE_CALIBRATION' | 'BUZZER_TEST' | 'DISPATCH_FIELD_VISIT';
  truckRollAvoidance: ITruckRollAvoidanceState;
}

const SensorHealthMetricsSchema = new Schema<ISensorHealthMetrics>({
  sensorType: {
    type: String,
    enum: ['TEMPERATURE', 'MOISTURE', 'PH', 'METHANE', 'PRESSURE'],
    required: true,
  },
  trustScore: { type: Number, required: true, min: 0, max: 100 },
  calibrationAgeDays: { type: Number, required: true, default: 0 },
  driftPpmOrUnit: { type: Number, default: 0 },
  stuckSignalFlag: { type: Boolean, default: false },
  noiseLevelPct: { type: Number, default: 0 },
  virtualSensorDivergencePct: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['HEALTHY', 'DEGRADED', 'FAILED', 'REPLACED'],
    default: 'HEALTHY',
  },
  actionRequired: { type: String },
}, { _id: false });

const TruckRollAvoidanceSchema = new Schema<ITruckRollAvoidanceState>({
  currentStage: {
    type: String,
    enum: [
      'STAGE_0_NORMAL',
      'STAGE_1_REMOTE_DIAGNOSTICS',
      'STAGE_2_REMOTE_SELF_CLEAN',
      'STAGE_3_GROUND_ASSIST',
      'STAGE_4_BATCHED_DISPATCH',
    ],
    default: 'STAGE_0_NORMAL',
  },
  lastStageTransitionAt: { type: Date, default: Date.now },
  diagnosticsBurstScheduledAt: { type: Date },
  buzzerPulseTriggeredAt: { type: Date },
  groundAssistPromptedAt: { type: Date },
  groundAssistAcknowledged: { type: Boolean, default: false },
  technicianDispatchQueuedAt: { type: Date },
  resolvedWithoutDispatch: { type: Boolean, default: false },
  avoidanceLogNotes: [{ type: String }],
}, { _id: false });

export const SensorTrustRecordSchema = new Schema<ISensorTrustRecord>({
  nodeId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset', required: true, index: true },
  pitId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset', required: true, index: true },
  facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
  assessedAt: { type: Date, default: Date.now, index: true },
  overallNodeTrustScore: { type: Number, required: true, min: 0, max: 100 },
  sensorMetrics: [SensorHealthMetricsSchema],
  failureForecastDays: { type: Number },
  recommendedAction: {
    type: String,
    enum: ['NO_ACTION', 'FORCE_READ', 'REMOTE_CALIBRATION', 'BUZZER_TEST', 'DISPATCH_FIELD_VISIT'],
    default: 'NO_ACTION',
  },
  truckRollAvoidance: {
    type: TruckRollAvoidanceSchema,
    default: () => ({
      currentStage: 'STAGE_0_NORMAL',
      lastStageTransitionAt: new Date(),
      resolvedWithoutDispatch: false,
      avoidanceLogNotes: ['Initialized in normal monitoring mode.'],
    }),
  },
}, { timestamps: true });

SensorTrustRecordSchema.index({ nodeId: 1, assessedAt: -1 });
SensorTrustRecordSchema.index({ facilityId: 1, overallNodeTrustScore: 1 });

export const SensorTrustRecord = model<ISensorTrustRecord>('SensorTrustRecord', SensorTrustRecordSchema);
