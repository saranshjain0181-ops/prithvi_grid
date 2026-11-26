import {
  IMappingProbePoint,
  IPileMappingRoundRecord,
  PileMappingRound,
} from '../db/models/PileMappingRound.js';

export interface PileMappingEvaluation {
  averageTempC: number;
  minTempC: number;
  maxTempC: number;
  evennessIndexCv: number; // CV = (stdDev / mean)
  coldSpotCount: number;
  hotCoreCount: number;
  representativenessOffsetC?: number;
  verdict: 'HOMOGENEOUS' | 'MODERATE_VARIANCE' | 'HIGH_VARIANCE_CHANNELS';
  recommendations: string[];
}

export class PileMappingService {
  /**
   * Evaluates manual multi-point temperature survey of a compost heap
   */
  evaluateRound(params: {
    points: Array<{
      pointIndex: number;
      xMeters: number;
      yMeters: number;
      depthCm: number;
      observedTempC: number;
    }>;
    smartSpearReadingC?: number;
    targetStage?: 'THERMOPHILIC' | 'MESOPHILIC' | 'CURING';
  }): PileMappingEvaluation {
    const temps = params.points.map((p) => p.observedTempC);
    if (temps.length === 0) {
      throw new Error('At least one probe point is required for pile mapping.');
    }

    const n = temps.length;
    const sum = temps.reduce((acc, t) => acc + t, 0);
    const averageTempC = Math.round((sum / n) * 10) / 10;
    const minTempC = Math.min(...temps);
    const maxTempC = Math.max(...temps);

    // Standard deviation and Coefficient of Variation (CV)
    const variance = temps.reduce((acc, t) => acc + Math.pow(t - averageTempC, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const evennessIndexCv = averageTempC > 0 ? Math.round((stdDev / averageTempC) * 100) / 100 : 0;

    // Thresholds: Cold spot is < 45°C during thermophilic, hot core is > 65°C
    const coldThreshold = params.targetStage === 'CURING' ? 30 : 45;
    const hotThreshold = 65;

    let coldSpotCount = 0;
    let hotCoreCount = 0;

    params.points.forEach((p) => {
      if (p.observedTempC < coldThreshold) coldSpotCount++;
      if (p.observedTempC > hotThreshold) hotCoreCount++;
    });

    let representativenessOffsetC: number | undefined;
    if (params.smartSpearReadingC !== undefined) {
      representativenessOffsetC = Math.round((params.smartSpearReadingC - averageTempC) * 10) / 10;
    }

    // Verdict based on CV (evenness)
    let verdict: 'HOMOGENEOUS' | 'MODERATE_VARIANCE' | 'HIGH_VARIANCE_CHANNELS';
    const recommendations: string[] = [];

    if (evennessIndexCv < 0.15) {
      verdict = 'HOMOGENEOUS';
      recommendations.push('ढेर में तापमान एकसमान है (Uniform aeration & moisture). किसी विशेष हस्तक्षेप की आवश्यकता नहीं है। [NEEDS-NATIVE-REVIEW]');
    } else if (evennessIndexCv <= 0.3) {
      verdict = 'MODERATE_VARIANCE';
      recommendations.push('मध्यम भिन्नता (Moderate variance). अगली पलटाई (turning) में बाहरी सूखी परतों को केंद्र में डालें। [NEEDS-NATIVE-REVIEW]');
    } else {
      verdict = 'HIGH_VARIANCE_CHANNELS';
      recommendations.push('गंभीर विषमता व हवा की नालियां (Channeling detected). ढेर को तुरंत पूरी तरह पलटें (Full mechanical turning required). [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]');
    }

    if (coldSpotCount > 0 && params.targetStage !== 'CURING') {
      recommendations.push(`${coldSpotCount} ठंडे बिंदु (Cold spots < 45°C) पाए गए। रोगाणु निष्क्रियता (pathogen kill) सुनिश्चित करने हेतु किनारों को अंदर करें। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]`);
    }

    if (representativenessOffsetC !== undefined && Math.abs(representativenessOffsetC) > 5) {
      recommendations.push(`स्मार्ट स्पीयर तापमान वास्तविक औसत से ${Math.abs(representativenessOffsetC)}°C अलग है। स्पीयर को मध्य कोर की ओर पुनर्स्थापित करें। [NEEDS-NATIVE-REVIEW]`);
    }

    return {
      averageTempC,
      minTempC,
      maxTempC,
      evennessIndexCv,
      coldSpotCount,
      hotCoreCount,
      representativenessOffsetC,
      verdict,
      recommendations,
    };
  }

  /**
   * Formats probed points with classification flags
   */
  classifyPoints(points: Array<{
    pointIndex: number;
    xMeters: number;
    yMeters: number;
    depthCm: number;
    observedTempC: number;
  }>): IMappingProbePoint[] {
    return points.map((p) => ({
      ...p,
      isColdSpot: p.observedTempC < 45,
      isHotCore: p.observedTempC > 65,
    }));
  }
}

export const pileMappingService = new PileMappingService();
