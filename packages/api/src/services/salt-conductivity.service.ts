import { IConductivityBlendPlan } from '../db/models/SaltConductivityGuard.js';

export interface SaltConductivityEvaluationResult {
  measuredEcDsM: number;
  targetMaxEcDsM: number;
  isWithinProductBand: boolean;
  statusHindi: string;
  blendPlan?: IConductivityBlendPlan;
  kitchenAlertRequired: boolean;
  feedbackCardHindi?: string;
}

export class SaltConductivityService {
  /**
   * Deterministically evaluates electrical conductivity against FCO limits and computes blending ratios
   */
  evaluateConductivity(params: {
    batchId: string;
    measuredEcDsM: number;
    targetMaxEcDsM?: number; // default 4.0 dS/m
    sourceKitchenDepartment?: string;
  }): SaltConductivityEvaluationResult {
    const targetMax = params.targetMaxEcDsM || 4.0;
    const isWithinProductBand = params.measuredEcDsM <= targetMax;

    if (isWithinProductBand) {
      return {
        measuredEcDsM: params.measuredEcDsM,
        targetMaxEcDsM: targetMax,
        isWithinProductBand: true,
        statusHindi: `विद्युत चालकता (EC: ${params.measuredEcDsM} dS/m) मानक सीमा (<= ${targetMax} dS/m) के अंदर है। [NEEDS-NATIVE-REVIEW]`,
        kitchenAlertRequired: false,
      };
    }

    // High salinity detected: compute blending plan with low-salt garden compost (assumed EC ~ 1.5 dS/m)
    const lowSaltEc = 1.5;
    // Ratio R = (EC_measured - EC_target) / (EC_target - EC_low)
    const ratioVal = Math.ceil(((params.measuredEcDsM - targetMax) / (targetMax - lowSaltEc)) * 10) / 10;
    const partsLowSalt = Math.max(1, Math.round(ratioVal));

    const expectedBlendedEc = Math.round(
      ((params.measuredEcDsM + lowSaltEc * partsLowSalt) / (1 + partsLowSalt)) * 10
    ) / 10;

    const blendPlan: IConductivityBlendPlan = {
      originalBatchId: params.batchId,
      measuredEcDsM: params.measuredEcDsM,
      targetMaxEcDsM: targetMax,
      blendingRatio: `1 भाग उच्च लवण बैच : ${partsLowSalt} भाग कम लवण वाली पत्ती खाद`,
      expectedBlendedEcDsM: expectedBlendedEc,
      isCompliantForAgriSales: expectedBlendedEc <= targetMax,
    };

    const feedbackCardHindi = params.sourceKitchenDepartment
      ? `नमस्ते ${params.sourceKitchenDepartment} टीम, आज के कचरे से खाद में नमक की मात्रा अधिक (EC ${params.measuredEcDsM} dS/m) पाई गई है। कृपया आचार का खारा पानी (brine) व बचा नमकीन घोल नाली में बहाने से पहले अलग करें। [NEEDS-NATIVE-REVIEW]`
      : undefined;

    return {
      measuredEcDsM: params.measuredEcDsM,
      targetMaxEcDsM: targetMax,
      isWithinProductBand: false,
      statusHindi: `सावधान: उच्च लवणता (EC: ${params.measuredEcDsM} dS/m > ${targetMax} dS/m). सीधे कृषि उपयोग से पौधों की जड़ें जल सकती हैं। ब्लेंडिंग अनिवार्य है। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]`,
      blendPlan,
      kitchenAlertRequired: true,
      feedbackCardHindi,
    };
  }
}

export const saltConductivityService = new SaltConductivityService();
