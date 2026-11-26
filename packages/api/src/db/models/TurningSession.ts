import mongoose, { Document, Schema } from 'mongoose';

export type TurningStepId =
  | 'OUTER_LAYER_PEELED'
  | 'CORE_EXPOSED'
  | 'CENTRE_EXCHANGED'
  | 'PILE_RESTACKED_CONICAL'
  | 'MOISTURE_INSPECTED';

export interface ITurningSession extends Document {
  sessionId: string;
  entityId: string;
  facilityId: string;
  pitId: string;
  workerId: string;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds: number;
  targetDurationSeconds: number;
  stepsCompleted: TurningStepId[];
  turningQualityScore: number; // 0 - 100
  qualityTier: 'EXCELLENT' | 'ADEQUATE' | 'INCOMPLETE';
  audioLanguage: 'hi' | 'hinglish' | 'en';
  telemetryDropConfirmed: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TurningSessionSchema = new Schema<ITurningSession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    entityId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    pitId: { type: String, required: true, index: true },
    workerId: { type: String, required: true, index: true },
    startedAt: { type: Date, required: true, default: Date.now },
    endedAt: { type: Date },
    durationSeconds: { type: Number, default: 0 },
    targetDurationSeconds: { type: Number, default: 900 }, // 15 min recommended target
    stepsCompleted: [{ type: String }],
    turningQualityScore: { type: Number, default: 0 },
    qualityTier: {
      type: String,
      required: true,
      enum: ['EXCELLENT', 'ADEQUATE', 'INCOMPLETE'],
      default: 'INCOMPLETE',
    },
    audioLanguage: { type: String, default: 'hi' },
    telemetryDropConfirmed: { type: Boolean, default: false },
    notes: { type: String },
  },
  { timestamps: true }
);

TurningSessionSchema.index({ facilityId: 1, pitId: 1, startedAt: -1 });

export const TurningSession = mongoose.model<ITurningSession>('TurningSession', TurningSessionSchema);
