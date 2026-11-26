import mongoose, { Document, Schema } from 'mongoose';

export type TimeMachineEventType =
  | 'TELEMETRY_SAMPLE'
  | 'LABOUR_TURNING'
  | 'LABOUR_WATERING'
  | 'FEEDSTOCK_LOAD'
  | 'SENSE_CHECK'
  | 'ALERT_TRIGGER'
  | 'CARE_ROUND'
  | 'LAB_ASSAY';

export interface ITimeMachineEvent {
  eventId: string;
  eventType: TimeMachineEventType;
  timestamp: Date;
  coreTempC?: number;
  moisturePct?: number;
  methanePpm?: number;
  actorId?: string;
  description: string;
  severity?: 'INFO' | 'WARN' | 'CRITICAL';
}

export interface IPitTimeMachineTimeline extends Document {
  timelineId: string;
  facilityId: string;
  pitId: string;
  batchId?: string;
  startDate: Date;
  endDate: Date;
  events: ITimeMachineEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const PitTimeMachineSchema = new Schema<IPitTimeMachineTimeline>(
  {
    timelineId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    pitId: { type: String, required: true, index: true },
    batchId: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    events: [
      {
        eventId: { type: String, required: true },
        eventType: {
          type: String,
          required: true,
          enum: [
            'TELEMETRY_SAMPLE',
            'LABOUR_TURNING',
            'LABOUR_WATERING',
            'FEEDSTOCK_LOAD',
            'SENSE_CHECK',
            'ALERT_TRIGGER',
            'CARE_ROUND',
            'LAB_ASSAY',
          ],
        },
        timestamp: { type: Date, required: true },
        coreTempC: { type: Number },
        moisturePct: { type: Number },
        methanePpm: { type: Number },
        actorId: { type: String },
        description: { type: String, required: true },
        severity: { type: String, enum: ['INFO', 'WARN', 'CRITICAL'], default: 'INFO' },
      },
    ],
  },
  { timestamps: true }
);

export const PitTimeMachine = mongoose.model<IPitTimeMachineTimeline>(
  'PitTimeMachine',
  PitTimeMachineSchema
);
