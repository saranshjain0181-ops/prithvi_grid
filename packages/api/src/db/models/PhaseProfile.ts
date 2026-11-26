import mongoose, { Document, Schema } from 'mongoose';

export type CompostingPhase =
  | 'LOADING_INITIATION'
  | 'THERMOPHILIC'
  | 'COOLING_TRANSITION'
  | 'CURING_MATURATION'
  | 'STABLE_READY'
  | 'STORED';

export type PhaseExceptionState =
  | 'COLD_START_FAILURE'
  | 'ANAEROBIC'
  | 'OVERHEATED'
  | 'DORMANT_DRY';

export interface ITrajectoryEnvelope {
  dayNumber: number;
  minTempC: number;
  targetTempC: number;
  maxTempC: number;
  targetMoisturePct: number;
}

export interface IPhaseStateRecord extends Document {
  pitId: string;
  batchId: string;
  currentPhase: CompostingPhase;
  exceptionState?: PhaseExceptionState;
  daysInCurrentPhase: number;
  confidencePct: number;
  isOffTrajectory: boolean;
  offTrajectoryReasons: string[];
  evidencePayload: {
    coreTempC: number;
    ambientTempC: number;
    coolingSlopeCPerDay?: number;
    accumulatedDegreeHours: number;
    moisturePct?: number;
    phValue?: number;
  };
  reducedDisturbanceActive: boolean; // True during CURING_MATURATION
  lastUpdated: Date;
}

const PhaseStateSchema = new Schema<IPhaseStateRecord>(
  {
    pitId: { type: String, required: true, index: true },
    batchId: { type: String, required: true, index: true },
    currentPhase: {
      type: String,
      required: true,
      enum: [
        'LOADING_INITIATION',
        'THERMOPHILIC',
        'COOLING_TRANSITION',
        'CURING_MATURATION',
        'STABLE_READY',
        'STORED',
      ],
      default: 'LOADING_INITIATION',
    },
    exceptionState: {
      type: String,
      enum: ['COLD_START_FAILURE', 'ANAEROBIC', 'OVERHEATED', 'DORMANT_DRY'],
    },
    daysInCurrentPhase: { type: Number, default: 0 },
    confidencePct: { type: Number, default: 85 },
    isOffTrajectory: { type: Boolean, default: false },
    offTrajectoryReasons: [{ type: String }],
    evidencePayload: {
      coreTempC: { type: Number, required: true },
      ambientTempC: { type: Number, required: true },
      coolingSlopeCPerDay: { type: Number },
      accumulatedDegreeHours: { type: Number, default: 0 },
      moisturePct: { type: Number },
      phValue: { type: Number },
    },
    reducedDisturbanceActive: { type: Boolean, default: false },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const PhaseState = mongoose.model<IPhaseStateRecord>('PhaseState', PhaseStateSchema);
