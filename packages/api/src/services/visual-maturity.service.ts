import { IImageQualityGateResult } from '../db/models/VisualMaturity.js';

export interface VisualMaturityEvaluation {
  isUsable: boolean;
  rejectionReason?: string;
  calibratedMaturityIndex: number;
  confidencePct: number;
  moistureAdjustmentPenalty: number;
  captionHindi: string;
}

export class VisualMaturityService {
  /**
   * Deterministically evaluates image quality gates and applies moisture-compensated darkness normalisation
   */
  evaluateFrame(params: {
    blurScore: number; // 0 to 1, higher = blurry
    brightnessScore: number; // 0 to 1, <0.2 = too dark, >0.85 = washed out
    isFoggedOrFouled?: boolean;
    referencePatchDetected?: boolean;
    rawDarknessScore: number; // 0 to 100
    moisturePct?: number;
    daysSinceLoading?: number;
  }): VisualMaturityEvaluation {
    // 1. Quality Gates
    let isUsable = true;
    let rejectionReason: string | undefined;

    if (params.blurScore > 0.6) {
      isUsable = false;
      rejectionReason = 'IMAGE_BLURRED: Movement or optical vibration detected.';
    } else if (params.brightnessScore < 0.2) {
      isUsable = false;
      rejectionReason = 'IMAGE_UNDEREXPOSED: Enclosure lighting too dark.';
    } else if (params.brightnessScore > 0.85) {
      isUsable = false;
      rejectionReason = 'IMAGE_OVEREXPOSED: Direct solar flare or glare.';
    } else if (params.isFoggedOrFouled) {
      isUsable = false;
      rejectionReason = 'LENS_FOULED_OR_FOGGED: Optical lens fouling or condensation.';
    } else if (params.referencePatchDetected === false) {
      isUsable = false;
      rejectionReason = 'REFERENCE_PATCH_OBSTRUCTED: Color calibration reference tile hidden.';
    }

    if (!isUsable) {
      return {
        isUsable: false,
        rejectionReason,
        calibratedMaturityIndex: 0,
        confidencePct: 0,
        moistureAdjustmentPenalty: 0,
        captionHindi: 'चित्र गुणवत्ता अस्वीकृत (Quality Gate Failed) — टाइम-लैप्स से हटाया गया। [NEEDS-NATIVE-REVIEW]',
      };
    }

    // 2. Moisture Compensation: High moisture (>40%) artificially darkens surface organic material
    const moisture = params.moisturePct || 45;
    const moistureAdjustmentPenalty = moisture > 40 ? Math.round((moisture - 40) * 0.5 * 10) / 10 : 0;
    const calibratedMaturityIndex = Math.max(
      0,
      Math.min(100, Math.round(params.rawDarknessScore - moistureAdjustmentPenalty))
    );

    const confidencePct = params.referencePatchDetected !== false ? 88 : 65;

    let captionHindi = '';
    if (calibratedMaturityIndex >= 80) {
      captionHindi = 'गहरा भूरा-काला ह्यूमस (Mature Humus): बनावट बारीक व एकसमान। [NEEDS-NATIVE-REVIEW]';
    } else if (calibratedMaturityIndex >= 50) {
      captionHindi = 'मध्यम परिपक्वता: रंग भूरा हो रहा है, कुछ रेशे शेष। [NEEDS-NATIVE-REVIEW]';
    } else {
      captionHindi = 'प्रारंभिक कच्चा कचरा: अभी अपघटन जारी है। [NEEDS-NATIVE-REVIEW]';
    }

    return {
      isUsable: true,
      calibratedMaturityIndex,
      confidencePct,
      moistureAdjustmentPenalty,
      captionHindi,
    };
  }
}

export const visualMaturityService = new VisualMaturityService();
