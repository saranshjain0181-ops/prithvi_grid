import { CoverMaterialType, CoverStateType } from '../db/models/CoverBiofilter.js';

export interface CoverEvaluation {
  coverState: CoverStateType;
  exposureMinutes: number;
  maxAllowedOpenMinutes: number;
  isExposureExceeded: boolean;
  actionRequired: boolean;
  alertMessage: string;
}

export interface MembraneCoverAssessment {
  coverType: string;
  surfaceAreaM2: number;
  daysInService: number;
  status: 'OPTIMAL' | 'MAINTENANCE_DUE' | 'REPLACEMENT_URGENT';
  actionRequired: string;
}

export interface BiofilterEvaluation {
  bedId: string;
  mediaType: string;
  bedHealth: 'OPTIMAL' | 'DRY_CHANNELS' | 'CHANNELING_OR_CLOGGED' | 'EXHAUSTED';
  moistureStatus: 'OPTIMAL' | 'TOO_DRY' | 'SATURATED';
  deltaPStatus: 'NORMAL' | 'HIGH_BACKPRESSURE';
  alerts: string[];
}

export class CoverBiofilterService {
  /**
   * Deterministically evaluates cover state and weather exposure rules
   */
  evaluateCoverStatus(params: {
    coverState: CoverStateType;
    exposureMinutes: number;
    rainForecastMm24h?: number;
    windSpeedKmh?: number;
    maxOpenLimitMinutes?: number; // default 120 mins
  }): CoverEvaluation {
    const maxAllowed = params.rainForecastMm24h && params.rainForecastMm24h > 15
      ? 15 // Only 15 mins allowed before heavy rain
      : params.maxOpenLimitMinutes || 120;

    const isExposureExceeded = params.coverState === 'OPEN' && params.exposureMinutes > maxAllowed;
    const actionRequired = isExposureExceeded || (params.coverState === 'OPEN' && !!params.rainForecastMm24h && params.rainForecastMm24h > 15);

    let alertMessage = '';
    if (params.rainForecastMm24h && params.rainForecastMm24h > 15 && params.coverState === 'OPEN') {
      alertMessage = '[WEATHER-ALERT] तेज बारिश का पूर्वानुमान है। गड्ढे को तुरंत तिरपाल से ढँकें ताकि पानी न भरे। [NEEDS-NATIVE-REVIEW]';
    } else if (isExposureExceeded) {
      alertMessage = `ढेर ${params.exposureMinutes} मिनट से खुला है (अधिकतम सीमा: ${maxAllowed} मिनट)। मक्खियों और गंध को रोकने के लिए ढक्कन बंद करें। [NEEDS-NATIVE-REVIEW]`;
    } else if (params.coverState === 'COVERED') {
      alertMessage = 'गड्ढा सुरक्षित रूप से ढँका हुआ है। [NEEDS-NATIVE-REVIEW]';
    } else {
      alertMessage = `गड्ढा खुला है (${params.exposureMinutes}/${maxAllowed} मिनट शेष)। [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      coverState: params.coverState,
      exposureMinutes: params.exposureMinutes,
      maxAllowedOpenMinutes: maxAllowed,
      isExposureExceeded,
      actionRequired,
      alertMessage,
    };
  }

  /**
   * Evaluates membrane/tarpaulin condition, lifespan and maintenance need
   */
  evaluateCover(params: {
    coverType: string;
    surfaceAreaM2: number;
    daysInService: number;
    inspectedTearsCount?: number;
  }): MembraneCoverAssessment {
    const tears = params.inspectedTearsCount || 0;
    let status: 'OPTIMAL' | 'MAINTENANCE_DUE' | 'REPLACEMENT_URGENT' = 'OPTIMAL';
    let actionRequired = 'कवर उत्कृष्ट स्थिति में है। [NEEDS-NATIVE-REVIEW]';

    if (params.daysInService > 500 || tears > 3) {
      status = 'REPLACEMENT_URGENT';
      actionRequired = 'कवर की कार्यशील आयु समाप्त या अत्यधिक फटन। तत्काल नया कवर लगाएं। [NEEDS-NATIVE-REVIEW]';
    } else if (params.daysInService > 365 || tears > 0) {
      status = 'MAINTENANCE_DUE';
      actionRequired = 'कवर में टूट-फूट अथवा 1 वर्ष से अधिक उपयोग। प्रतिस्थापन अथवा पैचिंग आवश्यक है। [NEEDS-NATIVE-REVIEW]';
    }

    return {
      coverType: params.coverType,
      surfaceAreaM2: params.surfaceAreaM2,
      daysInService: params.daysInService,
      status,
      actionRequired,
    };
  }

  /**
   * Evaluates biofilter bed moisture and backpressure
   */
  evaluateBiofilter(params: {
    bedId: string;
    mediaType: string;
    bedDepthMeters: number;
    moisturePct: number;
    differentialPressurePa: number;
  }): BiofilterEvaluation {
    const alerts: string[] = [];

    let moistureStatus: 'OPTIMAL' | 'TOO_DRY' | 'SATURATED' = 'OPTIMAL';
    if (params.moisturePct < 40) {
      moistureStatus = 'TOO_DRY';
      alerts.push('बायोफिल्टर बेड की नमी 40% से कम है। सूक्ष्मजीवों की गंध सोखने की क्षमता घटने से बचाने हेतु पानी छिड़कें। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]');
    } else if (params.moisturePct > 65) {
      moistureStatus = 'SATURATED';
      alerts.push('बायोफिल्टर बेड अत्यधिक गीला है (>65%)। जलभराव व दुर्गंध की जांच करें। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]');
    }

    let deltaPStatus: 'NORMAL' | 'HIGH_BACKPRESSURE' = 'NORMAL';
    if (params.differentialPressurePa > 500) {
      deltaPStatus = 'HIGH_BACKPRESSURE';
      alerts.push(`बायोफिल्टर बेड में दबाव (Backpressure) अधिक है (${params.differentialPressurePa} Pa)। मीडिया संकुचित या अवरुद्ध हो सकता है। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]`);
    }

    let bedHealth: 'OPTIMAL' | 'DRY_CHANNELS' | 'CHANNELING_OR_CLOGGED' | 'EXHAUSTED' = 'OPTIMAL';
    if (deltaPStatus === 'HIGH_BACKPRESSURE') {
      bedHealth = 'CHANNELING_OR_CLOGGED';
    } else if (moistureStatus === 'TOO_DRY') {
      bedHealth = 'DRY_CHANNELS';
    }

    return {
      bedId: params.bedId,
      mediaType: params.mediaType,
      bedHealth,
      moistureStatus,
      deltaPStatus,
      alerts,
    };
  }
}

export const coverBiofilterService = new CoverBiofilterService();
