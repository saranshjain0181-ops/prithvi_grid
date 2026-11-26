import { Schema, model, Document, Types } from 'mongoose';

export type PitArchetype = 'HOTEL_KITCHEN' | 'HOSPITAL_CANTEEN' | 'COMMUNITY_GARDEN' | 'MARKET_YARD';

export interface IPitPersonalityProfile extends Document {
  pitId: Types.ObjectId;
  facilityId: Types.ObjectId;
  archetype: PitArchetype;
  // Learned response coefficients
  moistureGainPerLiterWater: number; // % moisture gained per litre of water added (scaled to 1,000 kg pile)
  tempReboundHours: number; // Hours required for core temperature to rebound after turning
  phShiftPerKgAdditive: number; // pH shift per kg of alkaline additive (wood ash / lime)
  methaneDecayHalfLifeHours: number; // Half-life in hours for methane decay post-aeration turning
  dailyHeatingRateC: number; // °C heating per day after loading fresh waste
  thermalInertiaCoeff: number; // Resistance coefficient (0.0 to 1.0) against ambient weather fluctuations
  odorLagHours: number; // Hours lag between sub-surface methane rise and ground-level odor emergence
  // Bayesian partial pooling & sample depth
  observedInterventionsCount: number;
  confidencePct: number;
  status: 'EXPERIMENTAL' | 'MATURE' | 'DRIFT_DETECTED';
  // Dynamic normal bands for this pit
  normalBands: {
    targetTempMin: number;
    targetTempMax: number;
    targetMoistureMin: number;
    targetMoistureMax: number;
    nominalMethaneMax: number;
  };
  lastDriftDetectedAt?: Date;
  driftExplanation?: string;
  lastUpdated: Date;
}

export const PitPersonalityProfileSchema = new Schema<IPitPersonalityProfile>({
  pitId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset', required: true, unique: true, index: true },
  facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
  archetype: {
    type: String,
    enum: ['HOTEL_KITCHEN', 'HOSPITAL_CANTEEN', 'COMMUNITY_GARDEN', 'MARKET_YARD'],
    default: 'HOTEL_KITCHEN',
  },
  moistureGainPerLiterWater: { type: Number, required: true, default: 0.12 },
  tempReboundHours: { type: Number, required: true, default: 14.5 },
  phShiftPerKgAdditive: { type: Number, required: true, default: 0.18 },
  methaneDecayHalfLifeHours: { type: Number, required: true, default: 4.8 },
  dailyHeatingRateC: { type: Number, required: true, default: 3.2 },
  thermalInertiaCoeff: { type: Number, required: true, default: 0.72 },
  odorLagHours: { type: Number, required: true, default: 3.5 },
  observedInterventionsCount: { type: Number, default: 0 },
  confidencePct: { type: Number, default: 50 },
  status: {
    type: String,
    enum: ['EXPERIMENTAL', 'MATURE', 'DRIFT_DETECTED'],
    default: 'EXPERIMENTAL',
  },
  normalBands: {
    targetTempMin: { type: Number, default: 52 },
    targetTempMax: { type: Number, default: 65 },
    targetMoistureMin: { type: Number, default: 45 },
    targetMoistureMax: { type: Number, default: 60 },
    nominalMethaneMax: { type: Number, default: 220 },
  },
  lastDriftDetectedAt: { type: Date },
  driftExplanation: { type: String },
  lastUpdated: { type: Date, default: Date.now },
}, { timestamps: true });

export const PitPersonalityProfile = model<IPitPersonalityProfile>('PitPersonalityProfile', PitPersonalityProfileSchema);
