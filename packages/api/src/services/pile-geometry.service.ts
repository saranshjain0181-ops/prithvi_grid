import { IPileGeometryRecord, PileStructureType } from '../db/models/PileGeometry.js';

export interface PileGeometryEvaluation {
  heightMeters: number;
  widthMeters: number;
  lengthMeters: number;
  estimatedVolumeM3: number;
  volumeCubicMeters: number;
  isWithinDesignLimits: boolean;
  isChimneyAdequate: boolean;
  warnings: string[];
  recommendations: string[];
  recommendation: string;
}

export class PileGeometryService {
  /**
   * Deterministically evaluates pile geometry, aeration channels and chimney spacing
   */
  evaluateGeometry(params: {
    structureType?: PileStructureType;
    shape?: 'TRAPEZOIDAL_WINDROW' | 'RECTANGULAR_BAY' | 'CYLINDRICAL_DRUM' | 'IN_GROUND_PIT';
    heightMeters: number;
    widthMeters?: number;
    baseWidthMeters?: number;
    topWidthMeters?: number;
    lengthMeters: number;
    aerationChannelsClear?: boolean;
    aerationType?: 'PASSIVE_CHIMNEY' | 'FORCED_AERATION' | 'NATURAL_CONVECTION';
    chimneySpacingMeters?: number;
  }): PileGeometryEvaluation {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const baseWidth = params.baseWidthMeters ?? params.widthMeters ?? 2.0;
    const topWidth = params.topWidthMeters ?? (params.shape === 'TRAPEZOIDAL_WINDROW' ? 1.0 : baseWidth);
    const height = params.heightMeters;
    const length = params.lengthMeters;

    // Volume calculation
    let volumeCubicMeters: number;
    if (params.shape === 'TRAPEZOIDAL_WINDROW' || (params.topWidthMeters !== undefined && params.baseWidthMeters !== undefined)) {
      // Cross-sectional area of trapezoid = ((baseWidth + topWidth) / 2) * height
      const crossSectionArea = ((baseWidth + topWidth) / 2) * height;
      volumeCubicMeters = Math.round(crossSectionArea * length * 10) / 10;
    } else {
      const shapeFactor = params.structureType === 'WINDROW' ? 0.75 : 0.90;
      volumeCubicMeters = Math.round(height * baseWidth * length * shapeFactor * 10) / 10;
    }

    // Height rules
    if (height > 1.6) {
      const w = `[OVER-HEIGHT] ढेर की ऊंचाई ${height}m है (अनुशंसित अधिकतम: 1.5m)। कोर में दबाव से एनारोबिक मीथेन और बदबू का खतरा है। [NEEDS-NATIVE-REVIEW]`;
      warnings.push(w);
      recommendations.push(w);
    } else if (height < 0.8) {
      const w = `[UNDER-HEIGHT] ढेर बहुत नीचा (${height}m) है। सूक्ष्मजीवों की ऊष्मा रुक नहीं पाएगी और थर्मोफिलिक अवस्था नहीं बनेगी। [NEEDS-NATIVE-REVIEW]`;
      warnings.push(w);
      recommendations.push(w);
    }

    // Aeration channels
    if (params.aerationChannelsClear === false) {
      const w = '[AERATION-BLOCKED] नीचे की वेंटिलेशन पाइप या बांस के छेद बंद हैं। वायु संचार अवरुद्ध है। [NEEDS-NATIVE-REVIEW]';
      warnings.push(w);
      recommendations.push(w);
    }

    // Aeration Chimney spacing check
    let isChimneyAdequate = true;
    if (params.aerationType === 'PASSIVE_CHIMNEY' && params.chimneySpacingMeters !== undefined) {
      if (params.chimneySpacingMeters > 3.0) {
        isChimneyAdequate = false;
        const w = `चिमनियों के बीच की दूरी ${params.chimneySpacingMeters}m अधिक है (अधिकतम अनुशंसित: 3.0m)। अतिरिक्त वेंटिलेशन पाइप लगाएं। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]`;
        warnings.push(w);
        recommendations.push(w);
      }
    }

    const isWithinDesignLimits = warnings.length === 0;
    const recommendation = isWithinDesignLimits
      ? `ढेर की ज्यामिति (${height}m ऊँचाई, ${volumeCubicMeters}m³ आयतन) आदर्श है। [NEEDS-NATIVE-REVIEW]`
      : warnings.join(' ');

    return {
      heightMeters: height,
      widthMeters: baseWidth,
      lengthMeters: length,
      estimatedVolumeM3: volumeCubicMeters,
      volumeCubicMeters,
      isWithinDesignLimits,
      isChimneyAdequate,
      warnings,
      recommendations,
      recommendation,
    };
  }
}

export const pileGeometryService = new PileGeometryService();
