import mongoose, { Document, Schema } from 'mongoose';

export interface IMappingProbePoint {
  pointIndex: number;
  xMeters: number;
  yMeters: number;
  depthCm: number; // e.g. 30cm or 60cm
  observedTempC: number;
  isColdSpot: boolean;
  isHotCore: boolean;
}

export interface IPileMappingRoundRecord extends Document {
  roundId: string;
  facilityId: string;
  pitId: string;
  surveyDate: string; // YYYY-MM-DD
  points: IMappingProbePoint[];
  averageTempC: number;
  minTempC: number;
  maxTempC: number;
  evennessIndexCv: number; // Coefficient of Variation (CV)
  smartSpearReadingC?: number;
  representativenessOffsetC?: number; // T_spear - T_avg
  coldSpotCount: number;
  inspectorId: string;
  createdAt: Date;
}

const PileMappingRoundSchema = new Schema<IPileMappingRoundRecord>(
  {
    roundId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    pitId: { type: String, required: true, index: true },
    surveyDate: { type: String, required: true, index: true },
    points: [
      {
        pointIndex: { type: Number, required: true },
        xMeters: { type: Number, required: true },
        yMeters: { type: Number, required: true },
        depthCm: { type: Number, required: true },
        observedTempC: { type: Number, required: true },
        isColdSpot: { type: Boolean, default: false },
        isHotCore: { type: Boolean, default: false },
      },
    ],
    averageTempC: { type: Number, required: true },
    minTempC: { type: Number, required: true },
    maxTempC: { type: Number, required: true },
    evennessIndexCv: { type: Number, required: true },
    smartSpearReadingC: { type: Number },
    representativenessOffsetC: { type: Number },
    coldSpotCount: { type: Number, default: 0 },
    inspectorId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PileMappingRound = mongoose.model<IPileMappingRoundRecord>(
  'PileMappingRound',
  PileMappingRoundSchema
);
