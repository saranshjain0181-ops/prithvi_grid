import { Types } from 'mongoose';
import { WeatherPlaybook, IWeatherPlaybook, WeatherTriggerType } from '../db/models/WeatherPlaybook';

export interface WeatherForecastData {
  rainMmNext24h: number;
  maxAmbientTempC: number;
  minAmbientTempC: number;
  windSpeedKmph: number;
  humidityPct: number;
}

export interface PlaybookTriggerResult {
  triggered: boolean;
  triggerType?: WeatherTriggerType;
  headlineEn?: string;
  headlineHi?: string;
  recommendedActions: Array<{
    actionType: string;
    actionTitleEn: string;
    actionTitleHi: string;
    leadTimeHours: number;
  }>;
}

export class WeatherPlaybookService {
  /**
   * Evaluates current microclimate forecast against facility playbooks (Feature 10).
   */
  public evaluateForecast(forecast: WeatherForecastData): PlaybookTriggerResult {
    // 1. Heavy Rain Trigger
    if (forecast.rainMmNext24h >= 25.0) {
      return {
        triggered: true,
        triggerType: 'HEAVY_RAIN',
        headlineEn: `Heavy rain predicted (${forecast.rainMmNext24h} mm in 24h). Protect open pits from waterlogging.`,
        headlineHi: `कल भारी बारिश (${forecast.rainMmNext24h} mm) का अंदेशा है, कम्पोस्ट गड्ढों को ढकें।`,
        recommendedActions: [
          { actionType: 'COVER_PIT', actionTitleEn: 'Cover open pit with waterproof tarpaulin', actionTitleHi: 'पिट को तिरपाल से ढक दें', leadTimeHours: 6 },
          { actionType: 'ADD_DRY_BULKING', actionTitleEn: 'Add dry sawdust or coco peat as moisture buffer', actionTitleHi: 'सूखा भूसा या कोकोपीट मिलाएं', leadTimeHours: 8 },
          { actionType: 'CLEAR_DRAINAGE', actionTitleEn: 'Clear leachate drain pipes to prevent stagnation', actionTitleHi: 'नाली और ड्रेनेज पाइप साफ करें', leadTimeHours: 12 },
        ],
      };
    }

    // 2. Heatwave Trigger
    if (forecast.maxAmbientTempC >= 42.0) {
      return {
        triggered: true,
        triggerType: 'HEATWAVE',
        headlineEn: `Severe heatwave expected (${forecast.maxAmbientTempC}°C). Pits will desiccate rapidly.`,
        headlineHi: `तेज गर्मी (${forecast.maxAmbientTempC}°C) का अनुमान है, कम्पोस्ट सूखने से बचाएं।`,
        recommendedActions: [
          { actionType: 'INCREASE_WATERING', actionTitleEn: 'Double routine water spray volume', actionTitleHi: 'पानी के छिड़काव की मात्रा दोगुनी करें', leadTimeHours: 4 },
        ],
      };
    }

    // 3. Stagnant Humid Air (Odor Hazard)
    if (forecast.windSpeedKmph <= 4.0 && forecast.humidityPct >= 85.0) {
      return {
        triggered: true,
        triggerType: 'STILL_HUMID_ODOR_RISK',
        headlineEn: 'Stagnant humid air with low wind. Extreme localized odor accumulation risk.',
        headlineHi: 'हवा शांत और नमी ज्यादा है, बदबू फैलने का खतरा अधिक है।',
        recommendedActions: [
          { actionType: 'DELAY_TURNING', actionTitleEn: 'Delay turning until afternoon wind increases', actionTitleHi: 'कचरा पलटना दोपहर तक टालें जब हवा चले', leadTimeHours: 2 },
        ],
      };
    }

    return {
      triggered: false,
      recommendedActions: [],
    };
  }
}

export const weatherPlaybookService = new WeatherPlaybookService();
