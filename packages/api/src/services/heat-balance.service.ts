import { CoolingActionType, ICoolingActionStep } from '../db/models/HeatBalancePlanner.js';

export interface HeatBalanceEvaluationResult {
  planId: string;
  triggerTempC: number;
  biologicalHeatGenWatts: number;
  evaporativeCoolingPotentialWatts: number;
  isFireRiskBranch: boolean;
  emergencyInstructions?: string;
  steps: ICoolingActionStep[];
  planStatus: 'ACTIVE' | 'RESOLVED' | 'ESCALATED_FIRE_RISK';
  reboundCheckHours: number;
}

export class HeatBalanceService {
  /**
   * Deterministically plans overheat response or escalates directly to fire emergency branch
   */
  evaluateHeatBalance(params: {
    pitId: string;
    pileMassKg: number;
    coreTempC: number;
    ambientTempC: number;
    moisturePct: number;
    isSmokeOrBurningReported?: boolean;
    pileHeightMeters?: number;
  }): HeatBalanceEvaluationResult {
    const planId = `HEAT-PLAN-${params.pitId}-${Date.now()}`;
    const triggerTempC = params.coreTempC;

    // 1. Safety Emergency Branch (Fire Risk: smoke, burning smell, or extreme dry heat > 72C)
    if (params.isSmokeOrBurningReported || (params.coreTempC > 72 && params.moisturePct < 35)) {
      return {
        planId,
        triggerTempC,
        biologicalHeatGenWatts: Math.round(params.pileMassKg * 0.6),
        evaporativeCoolingPotentialWatts: 0,
        isFireRiskBranch: true,
        emergencyInstructions:
          'आपातकालीन सुरक्षा चेतावनी: सुलगती आग का खतरा! ढेर के पास न जाएं। ढेर में फावड़ा या जेसीबी न चलाएं (ऑक्सीजन मिलने से सुलगती कोर भड़क सकती है)। तुरंत फायर सर्विस व आपातकालीन नंबर पर कॉल करें। [LEGAL-REVIEW] [NEEDS-NATIVE-REVIEW]',
        steps: [],
        planStatus: 'ESCALATED_FIRE_RISK',
        reboundCheckHours: 1,
      };
    }

    // 2. Lumped Heat Balance: ~0.4 Watts/kg biological heat generation
    const biologicalHeatGenWatts = Math.round(params.pileMassKg * 0.4);
    // Water evaporation absorbs ~2.5 MJ/kg H2O
    const evaporativeCoolingPotentialWatts = Math.round(params.pileMassKg * 0.8);

    const steps: ICoolingActionStep[] = [];
    let stepCount = 1;

    // Step 1: Open cover
    steps.push({
      stepNumber: stepCount++,
      actionType: 'LOOSEN_OR_REMOVE_COVER',
      instructionsHindi: 'ऊपर का तिरपाल या ढक्कन तुरंत हटाएं ताकि संवहन (convective heat loss) से भाप निकल सके। [NEEDS-NATIVE-REVIEW]',
      expectedTempDropC: 3.5,
      status: 'PENDING',
    });

    // Step 2: Top layer spread if pile is high
    if (params.pileHeightMeters && params.pileHeightMeters > 1.4) {
      steps.push({
        stepNumber: stepCount++,
        actionType: 'SPREAD_TOP_LAYER',
        instructionsHindi: 'ढेर के ऊपरी 30 सेमी हिस्से को साइड में फैलाएं ताकि कोर का दबाव घटे। [NEEDS-NATIVE-REVIEW]',
        expectedTempDropC: 4.0,
        status: 'PENDING',
      });
    }

    // Step 3: Measured step-watering if pile is drying (< 45% moisture)
    if (params.moisturePct < 45) {
      const waterLiters = Math.round((params.pileMassKg / 1000) * 40); // 40L per ton
      steps.push({
        stepNumber: stepCount++,
        actionType: 'MEASURED_STEP_WATERING',
        instructionsHindi: `${waterLiters} लीटर पानी सतह पर हल्का-हल्का छिड़कें। 2 घंटे बाद तापमान दोबारा जांचें। [NEEDS-NATIVE-REVIEW]`,
        expectedTempDropC: 5.0,
        waterQuantityLiters: waterLiters,
        status: 'PENDING',
      });
    } else {
      // If already wet, turn one section for aeration without adding water
      steps.push({
        stepNumber: stepCount++,
        actionType: 'MECHANICAL_AERATION_TURN',
        instructionsHindi: 'ढेर का आधा हिस्सा धीरे-धीरे पलटें ताकि फंसी हुई अतिरिक्त गर्मी निकल सके। [NEEDS-NATIVE-REVIEW]',
        expectedTempDropC: 6.0,
        status: 'PENDING',
      });
    }

    return {
      planId,
      triggerTempC,
      biologicalHeatGenWatts,
      evaporativeCoolingPotentialWatts,
      isFireRiskBranch: false,
      steps,
      planStatus: 'ACTIVE',
      reboundCheckHours: 4,
    };
  }
}

export const heatBalanceService = new HeatBalanceService();
