import { CompostingPhase, PhaseExceptionState } from '../db/models/PhaseProfile.js';

export interface PhaseEvaluationResult {
  currentPhase: CompostingPhase;
  exceptionState?: PhaseExceptionState;
  isOffTrajectory: boolean;
  offTrajectoryReasons: string[];
  reducedDisturbanceActive: boolean;
  confidencePct: number;
  stageNameHindi: string;
  stageIcon: string;
  actionRecommendationHindi: string;
}

export class PhaseEngineService {
  /**
   * Deterministically evaluates bioprocess composting phase based on sensor telemetry & heap age
   */
  evaluatePhase(params: {
    daysSinceLoading: number;
    coreTempC: number;
    ambientTempC: number;
    accumulatedDegreeHours: number;
    previousPhase?: CompostingPhase;
    moisturePct?: number;
    phValue?: number;
    odorIndex?: number;
  }): PhaseEvaluationResult {
    let currentPhase: CompostingPhase = params.previousPhase || 'LOADING_INITIATION';
    let exceptionState: PhaseExceptionState | undefined;
    const offTrajectoryReasons: string[] = [];
    let reducedDisturbanceActive = false;

    // 1. Exception Checks: Overheating (> 65°C) & Anaerobic
    if (params.coreTempC > 65) {
      exceptionState = 'OVERHEATED';
      offTrajectoryReasons.push('तापमान 65°C से अधिक: उपयोगी रोगाणु नष्ट होने और नाइट्रोजन वाष्पीकरण का खतरा। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]');
    } else if (params.phValue && params.phValue < 5.2 && params.coreTempC < 45) {
      exceptionState = 'ANAEROBIC';
      offTrajectoryReasons.push('अम्लीय क्रैश व एनारोबिक अवस्था: pH 5.2 से कम। चूना/राख व वायुसंचार आवश्यक। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]');
    }

    // 2. Cold Start Failure check (Day >= 3 and temp not rising above ambient + 5)
    if (params.daysSinceLoading >= 3 && params.coreTempC <= params.ambientTempC + 5 && currentPhase === 'LOADING_INITIATION') {
      exceptionState = 'COLD_START_FAILURE';
      offTrajectoryReasons.push('प्रारंभिक प्रज्वलन विफलता (Cold Start): 3 दिन बाद भी तापमान नहीं बढ़ा। नमी कम अथवा नाइट्रोजन की कमी हो सकती है। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]');
    }

    // 3. Phase State Transitions
    if (params.coreTempC >= 52) {
      currentPhase = 'THERMOPHILIC';
    } else if (currentPhase === 'THERMOPHILIC' && params.coreTempC < 50 && params.daysSinceLoading >= 10) {
      currentPhase = 'COOLING_TRANSITION';
    } else if ((currentPhase === 'COOLING_TRANSITION' || currentPhase === 'THERMOPHILIC') && params.daysSinceLoading >= 20 && params.coreTempC <= 42) {
      currentPhase = 'CURING_MATURATION';
      reducedDisturbanceActive = true; // Protect fungal mycelium during curing
    } else if (params.daysSinceLoading >= 40 && params.coreTempC <= params.ambientTempC + 3) {
      currentPhase = 'STABLE_READY';
      reducedDisturbanceActive = true;
    }

    // Disturbance rule for Curing
    if (currentPhase === 'CURING_MATURATION') {
      reducedDisturbanceActive = true;
    }

    const isOffTrajectory = offTrajectoryReasons.length > 0;
    const confidencePct = isOffTrajectory ? 75 : 92;

    // Localized Hindi metadata
    let stageNameHindi = '';
    let stageIcon = '🌱';
    let actionRecommendationHindi = '';

    switch (currentPhase) {
      case 'LOADING_INITIATION':
        stageNameHindi = 'प्रारंभिक मेसोफिलिक अवस्था (Loading & Mesophilic Ignition)';
        stageIcon = '🌱';
        actionRecommendationHindi = 'सामग्री को अच्छी तरह मिलाएं और 48-72 घंटे में ताप वृद्धि का निरीक्षण करें। [NEEDS-NATIVE-REVIEW]';
        break;
      case 'THERMOPHILIC':
        stageNameHindi = 'थर्मोफिलिक ताप अवस्था (Thermophilic Sanitization)';
        stageIcon = '🔥';
        actionRecommendationHindi = 'गर्मी बढ़ रही है। रोगाणु व खरपतवार बीज नष्ट हो रहे हैं। नमी 50-55% बनाए रखें। [NEEDS-NATIVE-REVIEW]';
        break;
      case 'COOLING_TRANSITION':
        stageNameHindi = 'शीतलन एवं पुनरुत्थान अवस्था (Cooling & Transition)';
        stageIcon = '🍂';
        actionRecommendationHindi = 'तापमान 50°C से नीचे आ रहा है। पलटाई की गति धीमी करें। [NEEDS-NATIVE-REVIEW]';
        break;
      case 'CURING_MATURATION':
        stageNameHindi = 'परिपक्वता एवं कवक संवर्धन (Curing & Humification)';
        stageIcon = '🍄';
        actionRecommendationHindi = 'कवक जाला (mycelium) बन रहा है। अनावश्यक पलटाई न करें (Reduced Disturbance Active)। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]';
        break;
      case 'STABLE_READY':
        stageNameHindi = 'स्थिर एवं तैयार खाद (Stable & Ready for Harvest)';
        stageIcon = '✨';
        actionRecommendationHindi = 'खाद पूर्णतः स्थिर है। छानने व पैकिंग हेतु तैयार है। [NEEDS-NATIVE-REVIEW]';
        break;
      case 'STORED':
        stageNameHindi = 'भंडारित खाद (Stored Compost)';
        stageIcon = '📦';
        actionRecommendationHindi = 'गोदाम में नमी 15-25% पर बनाए रखें ताकि अमोनिया न उड़े। [NEEDS-NATIVE-REVIEW]';
        break;
    }

    return {
      currentPhase,
      exceptionState,
      isOffTrajectory,
      offTrajectoryReasons,
      reducedDisturbanceActive,
      confidencePct,
      stageNameHindi,
      stageIcon,
      actionRecommendationHindi,
    };
  }
}

export const phaseEngineService = new PhaseEngineService();
