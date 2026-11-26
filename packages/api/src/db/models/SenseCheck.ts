import mongoose, { Document, Schema } from 'mongoose';

export type SqueezeTestResult = 'WATER_DRIPS' | 'HOLDS_BALL_SHEEN' | 'CRUMBLES_DRY';
export type SmellTestResult = 'EARTHY_FOREST' | 'SOUR_VINEGAR' | 'ROTTEN_EGG' | 'AMMONIA' | 'NONE';
export type StickHeatResult = 'BURNING_HOT' | 'WARM_STEAMING' | 'TEPID' | 'COLD';
export type TextureResult = 'CRUMBLED' | 'SLUDGE_MATTED' | 'FIBROUS_CHUNKY';
export type ColorResult = 'DARK_BROWN_BLACK' | 'YELLOW_GREY' | 'PALE_GREEN';

export interface ISenseCheckObservations {
  squeezeTest: SqueezeTestResult;
  smellTest: SmellTestResult;
  stickHeat: StickHeatResult;
  colour: ColorResult;
  texture: TextureResult;
  bioSigns: string[]; // e.g. ['WHITE_ACTINOMYCETES', 'BSF_LARVAE', 'HOUSE_FLIES', 'WORMS', 'LEACHATE_POOLING']
}

export interface ISensorComparison {
  sensorCoreTempC?: number;
  sensorMoisturePct?: number;
  tempAgreement: boolean;
  moistureAgreement: boolean;
  driftWarning: boolean;
  notes?: string;
}

export interface ISenseCheck extends Document {
  checkId: string;
  entityId: string;
  facilityId: string;
  pitId: string;
  performedBy: string;
  timestamp: Date;
  observations: ISenseCheckObservations;
  sensorComparison: ISensorComparison;
  photoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SenseCheckSchema = new Schema<ISenseCheck>(
  {
    checkId: { type: String, required: true, unique: true, index: true },
    entityId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    pitId: { type: String, required: true, index: true },
    performedBy: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    observations: {
      squeezeTest: {
        type: String,
        required: true,
        enum: ['WATER_DRIPS', 'HOLDS_BALL_SHEEN', 'CRUMBLES_DRY'],
      },
      smellTest: {
        type: String,
        required: true,
        enum: ['EARTHY_FOREST', 'SOUR_VINEGAR', 'ROTTEN_EGG', 'AMMONIA', 'NONE'],
      },
      stickHeat: {
        type: String,
        required: true,
        enum: ['BURNING_HOT', 'WARM_STEAMING', 'TEPID', 'COLD'],
      },
      colour: {
        type: String,
        required: true,
        enum: ['DARK_BROWN_BLACK', 'YELLOW_GREY', 'PALE_GREEN'],
      },
      texture: {
        type: String,
        required: true,
        enum: ['CRUMBLED', 'SLUDGE_MATTED', 'FIBROUS_CHUNKY'],
      },
      bioSigns: [{ type: String }],
    },
    sensorComparison: {
      sensorCoreTempC: { type: Number },
      sensorMoisturePct: { type: Number },
      tempAgreement: { type: Boolean, default: true },
      moistureAgreement: { type: Boolean, default: true },
      driftWarning: { type: Boolean, default: false },
      notes: { type: String },
    },
    photoUrl: { type: String },
  },
  { timestamps: true }
);

SenseCheckSchema.index({ facilityId: 1, pitId: 1, timestamp: -1 });

export const SenseCheck = mongoose.model<ISenseCheck>('SenseCheck', SenseCheckSchema);
