export interface BulkDensityEvaluationResult {
  bulkDensityKgPerM3: number;
  freeAirSpacePct: number;
  isFasInOptimalBand: boolean;
  statusHindi: string;
  recommendedBulkingKgPerTon: number;
  advisoryHindi: string;
}

export class BulkDensityFasService {
  /**
   * Deterministically evaluates bulk density and Free Air Space (FAS %) from calibrated bucket test
   */
  evaluateBulkDensityAndFas(params: {
    containerVolumeLiters: number;
    sampleNetMassKg: number;
    estimatedMoisturePct: number;
    particleDensityKgPerM3?: number; // default ~1400 kg/m3 for organic matter
  }): BulkDensityEvaluationResult {
    if (params.containerVolumeLiters <= 0) {
      throw new Error('Container volume must be positive.');
    }

    const volumeM3 = params.containerVolumeLiters / 1000;
    const bulkDensityKgPerM3 = Math.round((params.sampleNetMassKg / volumeM3) * 10) / 10;

    const particleDensity = params.particleDensityKgPerM3 || 1400;
    const moistureFraction = (params.estimatedMoisturePct || 50) / 100;

    // Standard Free Air Space (FAS) equation:
    // Solid Fraction = bulkDensity / particleDensity
    // Water Fraction = (bulkDensity * moistureFraction) / waterDensity (1000 kg/m3)
    // FAS = (1 - Solid Fraction - Water Fraction) * 100
    const solidFraction = bulkDensityKgPerM3 / particleDensity;
    const waterFraction = (bulkDensityKgPerM3 * moistureFraction) / 1000;
    const fasFraction = Math.max(0, 1 - solidFraction - waterFraction);
    const freeAirSpacePct = Math.round(fasFraction * 100 * 10) / 10;

    // Optimal FAS is 50% to 65% for aerobic composting
    const isFasInOptimalBand = freeAirSpacePct >= 48 && freeAirSpacePct <= 68;

    let recommendedBulkingKgPerTon = 0;
    let statusHindi = '';
    let advisoryHindi = '';

    if (freeAirSpacePct < 48) {
      statusHindi = 'अत्यधिक संकुचित (Dense / Low Air Space)';
      // Deficit calculation: ~15kg dry sawdust per 5% FAS deficit per ton
      const fasDeficit = 55 - freeAirSpacePct;
      recommendedBulkingKgPerTon = Math.max(20, Math.round(fasDeficit * 3));
      advisoryHindi = `मुक्त वायु स्थान (FAS: ${freeAirSpacePct}%) कम है। हवा अवरुद्ध होने से मीथेन व दुर्गंध का खतरा। प्रति टन कचरे में ${recommendedBulkingKgPerTon}kg सूखा भूसा/पत्तियां मिलाएं। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]`;
    } else if (freeAirSpacePct > 68) {
      statusHindi = 'अत्यधिक हल्का (Very Loose / Low Moisture)';
      advisoryHindi = `मुक्त वायु स्थान बहुत अधिक (${freeAirSpacePct}%) है। ढेर ढीला होने से नमी व गर्मी उड़ सकती है। हल्का पानी छिड़कें। [NEEDS-NATIVE-REVIEW]`;
    } else {
      statusHindi = 'इष्टतम वायु संचार (Optimal FAS)';
      advisoryHindi = `घनत्व (${bulkDensityKgPerM3} kg/m³) और मुक्त वायु स्थान (${freeAirSpacePct}%) आदर्श हैं। वायु संचार उत्कृष्ट बना रहेगा। [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      bulkDensityKgPerM3,
      freeAirSpacePct,
      isFasInOptimalBand,
      statusHindi,
      recommendedBulkingKgPerTon,
      advisoryHindi,
    };
  }
}

export const bulkDensityFasService = new BulkDensityFasService();
