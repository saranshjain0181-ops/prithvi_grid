import { AdditiveType } from '../db/models/InoculantAdditive.js';

export interface InoculantDosageRecommendation {
  additiveType: AdditiveType;
  recommendedDosageGramsPerTon: number;
  totalCalculatedGrams: number;
  activationInstructions: string;
  isActivationAdequate: boolean;
  warnings: string[];
}

export interface InoculantTrialEvaluation {
  treatedPeakTempC: number;
  controlPeakTempC: number;
  deltaPeakTempC: number;
  hoursToThermophilicTreated: number;
  hoursToThermophilicControl: number;
  timeSavingsHours: number;
  verdict: 'HIGH_EFFICACY' | 'MODERATE_EFFICACY' | 'NEGLIGIBLE_IMPACT';
  agronomicSummary: string;
}

export class InoculantAdditiveService {
  /**
   * Calculates required dosage and verifies microbiological activation timing
   */
  calculateDosage(params: {
    additiveType: AdditiveType;
    pileMassTons: number;
    activationHoursPrior?: number;
  }): InoculantDosageRecommendation {
    const mass = Math.max(0.1, params.pileMassTons);
    let dosagePerTon = 1000; // grams
    let instructions = '';
    let minActivationHours = 0;
    const warnings: string[] = [];

    switch (params.additiveType) {
      case 'EM1_MICROBIAL':
        dosagePerTon = 1000;
        minActivationHours = 48;
        instructions = 'गुड़ और पानी के साथ 1:1:20 के अनुपात में 48 घंटे किण्वन (ferment) करें। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]';
        break;
      case 'TRICHODERMA_HARZIANUM':
        dosagePerTon = 500;
        minActivationHours = 24;
        instructions = 'गोबर की खाद अथवा नम चोकर में मिलाकर 24 घंटे छांव में रखें ताकि बीजाणु अंकुरित हो सकें। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]';
        break;
      case 'COW_DUNG_STARTER':
        dosagePerTon = 5000;
        minActivationHours = 12;
        instructions = 'ताजा गोबर का घोल बनाएं (1:5 पानी) और समान रूप से छिड़कें। [NEEDS-NATIVE-REVIEW]';
        break;
      case 'AGRICULTURAL_LIME':
        dosagePerTon = 2000;
        minActivationHours = 0;
        instructions = 'अम्लता (pH < 5.5) नियंत्रित करने हेतु परतों में सूखा बुरकें। नाइट्रोजन उड़ने से बचाने हेतु अतिप्रयोग न करें। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]';
        break;
      case 'BIOCHAR':
        dosagePerTon = 10000; // 10kg per ton
        minActivationHours = 12;
        instructions = 'कंपोस्ट चाय अथवा गोमूत्र से पहले सक्रिय (charge) करें, फिर ढेर में मिलाएं। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]';
        break;
      case 'WOOD_ASH':
        dosagePerTon = 1500;
        minActivationHours = 0;
        instructions = 'पोटैशियम वृद्धि हेतु हल्की परत डालें। [NEEDS-NATIVE-REVIEW]';
        break;
    }

    const totalCalculatedGrams = Math.round(mass * dosagePerTon);
    const activationPrior = params.activationHoursPrior || 0;
    const isActivationAdequate = activationPrior >= minActivationHours;

    if (!isActivationAdequate && minActivationHours > 0) {
      warnings.push(`कम किण्वन अवधि: आवश्यक न्यूनतम ${minActivationHours} घंटे हैं जबकि दर्ज केवल ${activationPrior} घंटे हैं। प्रभावशीलता घट सकती है। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]`);
    }

    return {
      additiveType: params.additiveType,
      recommendedDosageGramsPerTon: dosagePerTon,
      totalCalculatedGrams,
      activationInstructions: instructions,
      isActivationAdequate,
      warnings,
    };
  }

  /**
   * Compares A/B trial data between treated windrow and control windrow
   */
  evaluateTrial(params: {
    treatedPeakTempC: number;
    controlPeakTempC: number;
    hoursToThermophilicTreated: number;
    hoursToThermophilicControl: number;
  }): InoculantTrialEvaluation {
    const deltaPeakTempC = Math.round((params.treatedPeakTempC - params.controlPeakTempC) * 10) / 10;
    const timeSavingsHours = Math.round((params.hoursToThermophilicControl - params.hoursToThermophilicTreated) * 10) / 10;

    let verdict: 'HIGH_EFFICACY' | 'MODERATE_EFFICACY' | 'NEGLIGIBLE_IMPACT';
    let agronomicSummary = '';

    if (timeSavingsHours >= 24 && deltaPeakTempC >= 3) {
      verdict = 'HIGH_EFFICACY';
      agronomicSummary = `उपचारित ढेर ने ${timeSavingsHours} घंटे पूर्व थर्मोफिलिक अवस्था प्राप्त की और अधिकतम तापमान ${deltaPeakTempC}°C अधिक रहा। जीवाणु संवर्धन अत्यंत प्रभावी है। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]`;
    } else if (timeSavingsHours > 0 || deltaPeakTempC > 0) {
      verdict = 'MODERATE_EFFICACY';
      agronomicSummary = `हल्का सकारात्मक प्रभाव: थर्मोफिलिक गति में ${timeSavingsHours} घंटे का सुधार। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]`;
    } else {
      verdict = 'NEGLIGIBLE_IMPACT';
      agronomicSummary = `नियंत्रण ढेर की तुलना में कोई उल्लेखनीय अंतर नहीं देखा गया। खुराक अथवा सक्रियण प्रक्रिया की समीक्षा करें। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      treatedPeakTempC: params.treatedPeakTempC,
      controlPeakTempC: params.controlPeakTempC,
      deltaPeakTempC,
      hoursToThermophilicTreated: params.hoursToThermophilicTreated,
      hoursToThermophilicControl: params.hoursToThermophilicControl,
      timeSavingsHours,
      verdict,
      agronomicSummary,
    };
  }
}

export const inoculantAdditiveService = new InoculantAdditiveService();
