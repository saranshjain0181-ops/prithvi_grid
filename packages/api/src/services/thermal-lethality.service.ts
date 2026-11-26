import { ThermalCriteriaResult } from '../db/models/ThermalLethality.js';

export interface LethalityEvaluationResult {
  criteriaResult: ThermalCriteriaResult;
  evidenceStrength: 'STRONG' | 'MODERATE' | 'WEAK';
  indicativeLogReductionRange: {
    lowEstimateLog: number;
    expectedEstimateLog: number;
    highEstimateLog: number;
  };
  isBatchClosed: boolean;
  isClosureViolated: boolean;
  statutoryStatementHindi: string;
  auditCaveat: string;
}

export class ThermalLethalityService {
  /**
   * Evaluates process time-and-temperature lethality criteria and computes conservative kinetic log reduction ranges
   */
  evaluateLethality(params: {
    consecutiveHoursAbove55C: number;
    totalTurningsInHotPhase: number;
    coldSpotAdjustmentC?: number; // e.g. -4.0C from mapping survey
    isMappingDataAvailable?: boolean;
    freshWasteAddedAfterClosure?: boolean;
  }): LethalityEvaluationResult {
    const isClosureViolated = !!params.freshWasteAddedAfterClosure;

    // 1. Batch closure violation reset
    if (isClosureViolated) {
      return {
        criteriaResult: 'CRITERIA_NOT_MET',
        evidenceStrength: 'WEAK',
        indicativeLogReductionRange: {
          lowEstimateLog: 0,
          expectedEstimateLog: 0,
          highEstimateLog: 0,
        },
        isBatchClosed: false,
        isClosureViolated: true,
        statutoryStatementHindi:
          'उल्लंघन दर्ज: बैच बंद होने के उपरांत कच्चा कचरा मिलाया गया। थर्मल सैनिटाइजेशन रिकॉर्ड रीसेट किया जाता है। [LEGAL-REVIEW] [NEEDS-NATIVE-REVIEW]',
        auditCaveat:
          'Batch closure rule violated. Fresh raw organic matter contaminated the sanitized mass. Thermal evidence voided. [LEGAL-REVIEW]',
      };
    }

    // 2. Criteria Evaluation: Standard WHO / SWM 2016 requires >= 72h >= 55°C with >= 2 turns
    let criteriaResult: ThermalCriteriaResult;
    if (params.consecutiveHoursAbove55C >= 72 && params.totalTurningsInHotPhase >= 2) {
      criteriaResult = 'CRITERIA_MET';
    } else if (params.consecutiveHoursAbove55C > 0) {
      criteriaResult = 'CRITERIA_NOT_MET';
    } else {
      criteriaResult = 'INSUFFICIENT_EVIDENCE';
    }

    // 3. Evidence Strength
    const coldOffset = Math.abs(params.coldSpotAdjustmentC || 0);
    let evidenceStrength: 'STRONG' | 'MODERATE' | 'WEAK' = 'MODERATE';
    if (params.isMappingDataAvailable && coldOffset < 3 && params.consecutiveHoursAbove55C >= 72) {
      evidenceStrength = 'STRONG';
    } else if (!params.isMappingDataAvailable || params.consecutiveHoursAbove55C < 48) {
      evidenceStrength = 'WEAK';
    }

    // 4. Kinetic Log Reduction Range (Configurable decimal reduction time D55 ~ 12 hours)
    // Low estimate accounts for cold spots on perimeter
    const coreD55 = 12; // hours per 10-fold reduction [EXPERT-REVIEW]
    const highEstimateLog = Math.round((params.consecutiveHoursAbove55C / coreD55) * 10) / 10;
    const expectedEstimateLog = Math.round((highEstimateLog * 0.85) * 10) / 10;
    // Cold spot penalty: each degree C drop doubles D-value
    const coldSpotPenalty = coldOffset > 0 ? Math.round((coldOffset * 0.4) * 10) / 10 : 0.8;
    const lowEstimateLog = Math.max(0, Math.round((expectedEstimateLog - coldSpotPenalty) * 10) / 10);

    const auditCaveat =
      'Process verification only: This document certifies sensor-observed thermal exposure. It DOES NOT confer legal immunity nor certify the material as pathogen-free. Final laboratory micro-biological culture remains the sole statutory reference. [LEGAL-REVIEW] [EXPERT-REVIEW]';

    const statutoryStatementHindi =
      criteriaResult === 'CRITERIA_MET'
        ? `थर्मल सैनिटाइजेशन मानक पूर्ण (Criteria Met): 55°C से अधिक तापमान पर लगातार ${params.consecutiveHoursAbove55C} घंटे एवं ${params.totalTurningsInHotPhase} पलटाइयां सत्यापित। रोगाणु निष्क्रियता सांकेतिक सीमा: ${lowEstimateLog} - ${highEstimateLog} log. [LEGAL-REVIEW] [NEEDS-NATIVE-REVIEW]`
        : `थर्मल सैनिटाइजेशन मानक अपूर्ण (Criteria Not Met): केवल ${params.consecutiveHoursAbove55C}/72 घंटे दर्ज। अतिरिक्त थर्मल एक्सपोजर आवश्यक। [NEEDS-NATIVE-REVIEW]`;

    return {
      criteriaResult,
      evidenceStrength,
      indicativeLogReductionRange: {
        lowEstimateLog,
        expectedEstimateLog,
        highEstimateLog,
      },
      isBatchClosed: criteriaResult === 'CRITERIA_MET',
      isClosureViolated: false,
      statutoryStatementHindi,
      auditCaveat,
    };
  }
}

export const thermalLethalityService = new ThermalLethalityService();
