export interface NutrientRetentionEvaluationResult {
  inputNitrogenKg: number;
  outputNitrogenKg: number;
  nitrogenRetentionPct: number;
  estimatedFertilizerValueInr: number;
  claimsGateStatus: 'CLAIMS_LOCKED_PENDING_LAB' | 'CERTIFIED_CLAIMS_ALLOWED';
  isCommercialClaimPermitted: boolean;
  advisoryHindi: string;
}

export class NutrientRetentionService {
  /**
   * Deterministically calculates nitrogen mass balance retention and enforces statutory claims gate
   */
  evaluateNutrientRetention(params: {
    inputNitrogenKg: number;
    outputNitrogenKg: number;
    isOutputLabCertified: boolean;
    labCertificateNumber?: string;
    ratePerKgNitrogenEquivalentInr?: number; // default ~ ₹50/kg
  }): NutrientRetentionEvaluationResult {
    const inputN = Math.max(0.1, params.inputNitrogenKg);
    const outputN = Math.max(0, params.outputNitrogenKg);

    const nitrogenRetentionPct = Math.min(100, Math.round((outputN / inputN) * 100 * 10) / 10);

    const nPrice = params.ratePerKgNitrogenEquivalentInr || 50;
    const estimatedFertilizerValueInr = Math.round(outputN * nPrice);

    // Statutory Claims Gate: Under FCO regulations, commercial N-P-K nutrient labels
    // CANNOT be printed or sold without NABL / government lab certificate!
    const isCommercialClaimPermitted = params.isOutputLabCertified && !!params.labCertificateNumber;
    const claimsGateStatus: 'CLAIMS_LOCKED_PENDING_LAB' | 'CERTIFIED_CLAIMS_ALLOWED' =
      isCommercialClaimPermitted ? 'CERTIFIED_CLAIMS_ALLOWED' : 'CLAIMS_LOCKED_PENDING_LAB';

    let advisoryHindi = '';
    if (isCommercialClaimPermitted) {
      advisoryHindi = `प्रमाणित पोषक तत्व: ${nitrogenRetentionPct}% नाइट्रोजन अवधारण सत्यापित। लैब प्रमाणपत्र संख्या: ${params.labCertificateNumber}. बैग पर एन-पी-के लेबल मुद्रण अनुमत है। [LEGAL-REVIEW] [NEEDS-NATIVE-REVIEW]`;
    } else {
      advisoryHindi = `दावा गेट बंद (Claims Locked): नाइट्रोजन अवधारण ${nitrogenRetentionPct}% अनुमानित है। वाणिज्यिक बैग पर पोषक तत्वों का दावा करने हेतु लैब रिपोर्ट अनिवार्य है। [LEGAL-REVIEW] [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      inputNitrogenKg: inputN,
      outputNitrogenKg: outputN,
      nitrogenRetentionPct,
      estimatedFertilizerValueInr,
      claimsGateStatus,
      isCommercialClaimPermitted,
      advisoryHindi,
    };
  }
}

export const nutrientRetentionService = new NutrientRetentionService();
