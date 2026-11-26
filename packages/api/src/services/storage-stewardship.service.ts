import { StorageForm } from '../db/models/StorageStewardship.js';

export interface StorageRiskEvaluation {
  nitrogenLossRiskScore: number;
  reheatingAndMoldRiskScore: number;
  overallRiskTier: 'LOW' | 'MEDIUM' | 'HIGH';
  isRetestRequired: boolean;
  isMoistureInBand: boolean;
  recommendedActionHindi: string;
}

export class StorageStewardshipService {
  /**
   * Deterministically evaluates stored compost degradation risks (ammonia volatilization vs reheating mold)
   */
  evaluateStorageRisk(params: {
    storageForm: StorageForm;
    daysInStorage: number;
    observedMoisturePct: number;
    observedTempC: number;
    ambientTempC: number;
    smellAmmonia?: 'NONE' | 'FAINT' | 'SHARP';
    isCovered?: boolean;
    isPestDetected?: boolean;
  }): StorageRiskEvaluation {
    const isMoistureInBand = params.observedMoisturePct >= 15 && params.observedMoisturePct <= 25;
    let nLossScore = 10;
    let reheatScore = 10;

    // 1. Nitrogen Volatilization Risk Drivers: Low moisture + High Heat + Uncovered
    if (params.observedMoisturePct < 15) {
      nLossScore += 35; // Bone dry compost loses ammonium rapidly
    }
    if (params.ambientTempC > 32) {
      nLossScore += 25;
    }
    if (params.isCovered === false) {
      nLossScore += 20;
    }
    if (params.smellAmmonia === 'SHARP') {
      nLossScore += 30;
    } else if (params.smellAmmonia === 'FAINT') {
      nLossScore += 15;
    }

    const nitrogenLossRiskScore = Math.min(100, nLossScore);

    // 2. Reheating and Mold Risk Drivers: Wet material + Elevated core temp in bags
    if (params.observedMoisturePct > 26) {
      reheatScore += 40;
    }
    if (params.observedTempC > 42) {
      reheatScore += 35;
    }
    if (params.storageForm === 'BAGS' && params.observedMoisturePct > 24) {
      reheatScore += 20; // anaerobic fermentation in sealed plastic
    }
    if (params.isPestDetected) {
      reheatScore += 15;
    }

    const reheatingAndMoldRiskScore = Math.min(100, reheatScore);

    // Overall Risk Tier
    const maxScore = Math.max(nitrogenLossRiskScore, reheatingAndMoldRiskScore);
    let overallRiskTier: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (maxScore >= 65) {
      overallRiskTier = 'HIGH';
    } else if (maxScore >= 40) {
      overallRiskTier = 'MEDIUM';
    }

    // Retest required if stored for > 60 days
    const isRetestRequired = params.daysInStorage > 60;

    let recommendedActionHindi = '';
    if (nitrogenLossRiskScore > 60) {
      recommendedActionHindi = 'अमोनिया नाइट्रोजन उड़ने का जोखिम: खाद बहुत सूखी व गर्म है। हल्का पानी छिड़कें और छायादार शेड में ढक कर रखें। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]';
    } else if (reheatingAndMoldRiskScore > 60) {
      recommendedActionHindi = 'पुनः तपने व फफूंद का जोखिम: बैग में नमी अधिक है। बैग का मुंह खोलें और हवा लगने दें। [NEEDS-NATIVE-REVIEW]';
    } else if (isRetestRequired) {
      recommendedActionHindi = 'भंडारण अवधि 60 दिन से अधिक: बिक्री से पूर्व नमी व गुणवत्ता की पुनः जांच (Retest) अनिवार्य है। [LEGAL-REVIEW] [NEEDS-NATIVE-REVIEW]';
    } else {
      recommendedActionHindi = 'भंडारित खाद सुरक्षित स्थिति में है। पहले आया-पहले जाएगा (FIFO) नियम का पालन करें। [NEEDS-NATIVE-REVIEW]';
    }

    return {
      nitrogenLossRiskScore,
      reheatingAndMoldRiskScore,
      overallRiskTier,
      isRetestRequired,
      isMoistureInBand,
      recommendedActionHindi,
    };
  }
}

export const storageStewardshipService = new StorageStewardshipService();
