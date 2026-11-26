import { Schema, model, Document, Types } from 'mongoose';

export type WeatherTriggerType = 'HEAVY_RAIN' | 'HEATWAVE' | 'COLD_SNAP' | 'STILL_HUMID_ODOR_RISK';

export interface IWeatherPlaybook extends Document {
  facilityId: Types.ObjectId;
  triggerType: WeatherTriggerType;
  isActive: boolean;
  thresholds: {
    rainMmNext24h?: number; // e.g. >= 25 mm
    maxAmbientTempC?: number; // e.g. >= 42°C
    minAmbientTempC?: number; // e.g. <= 10°C
    windSpeedKmphMax?: number; // e.g. <= 4 km/h for stagnant air
    humidityPctMin?: number; // e.g. >= 85%
  };
  recommendedActions: Array<{
    actionType: 'COVER_PIT' | 'ADD_DRY_BULKING' | 'CLEAR_DRAINAGE' | 'INCREASE_WATERING' | 'DELAY_TURNING';
    actionTitleEn: string;
    actionTitleHi: string;
    leadTimeHours: number;
    expectedOutcome: string;
  }>;
  executionHistory: Array<{
    triggeredAt: Date;
    forecastValues: Record<string, number>;
    pitIdsAffected: Types.ObjectId[];
    preventedExcursion: boolean;
    actualMoistureDelta?: number;
  }>;
}

export const WeatherPlaybookSchema = new Schema<IWeatherPlaybook>({
  facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
  triggerType: {
    type: String,
    enum: ['HEAVY_RAIN', 'HEATWAVE', 'COLD_SNAP', 'STILL_HUMID_ODOR_RISK'],
    required: true,
  },
  isActive: { type: Boolean, default: true },
  thresholds: {
    rainMmNext24h: { type: Number },
    maxAmbientTempC: { type: Number },
    minAmbientTempC: { type: Number },
    windSpeedKmphMax: { type: Number },
    humidityPctMin: { type: Number },
  },
  recommendedActions: [{
    actionType: {
      type: String,
      enum: ['COVER_PIT', 'ADD_DRY_BULKING', 'CLEAR_DRAINAGE', 'INCREASE_WATERING', 'DELAY_TURNING'],
      required: true,
    },
    actionTitleEn: { type: String, required: true },
    actionTitleHi: { type: String, required: true },
    leadTimeHours: { type: Number, default: 12 },
    expectedOutcome: { type: String, required: true },
    _id: false,
  }],
  executionHistory: [{
    triggeredAt: { type: Date, default: Date.now },
    forecastValues: { type: Schema.Types.Mixed },
    pitIdsAffected: [{ type: Schema.Types.ObjectId, ref: 'PhysicalAsset' }],
    preventedExcursion: { type: Boolean, default: true },
    actualMoistureDelta: { type: Number },
    _id: false,
  }],
}, { timestamps: true });

export const WeatherPlaybook = model<IWeatherPlaybook>('WeatherPlaybook', WeatherPlaybookSchema);
