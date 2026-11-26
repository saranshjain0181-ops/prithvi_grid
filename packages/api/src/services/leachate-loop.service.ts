import { ILeachateSumpRecord, LeachateColor, LeachateLoop, LeachateOdor } from '../db/models/LeachateLoop.js';
import crypto from 'crypto';

export interface RecirculationRuleCheck {
  isAllowed: boolean;
  reason: string;
  recommendedDilution: string;
}

export class LeachateLoopService {
  /**
   * Deterministically evaluates whether leachate recirculation onto a target pit is agronomically safe
   */
  evaluateRecirculationRule(params: {
    targetPitCoreTempC: number;
    targetPitStage: 'THERMOPHILIC' | 'MESOPHILIC' | 'CURING';
    leachateOdor: LeachateOdor;
  }): RecirculationRuleCheck {
    // 1. Strictly forbid on curing piles or near-finished compost (pathogen & moisture risk)
    if (params.targetPitStage === 'CURING') {
      return {
        isAllowed: false,
        reason: 'परिपक्व हो रही खाद (Curing Pile) पर लीचेट डालना वर्जित है। इससे खाद में पुनः रोगजनक जीवाणु पनप सकते हैं। [NEEDS-NATIVE-REVIEW]',
        recommendedDilution: 'NONE',
      };
    }

    // 2. Anaerobic septic leachate must not be recirculated without aeration
    if (params.leachateOdor === 'ANAEROBIC_SEWER') {
      return {
        isAllowed: false,
        reason: 'लीचेट में सीवर जैसी एनारोबिक बदबू है। इसे सीधे गड्ढे में डालने से दुर्गंध और मीथेन बढ़ेगी। पहले वातन (aeration) करें। [NEEDS-NATIVE-REVIEW]',
        recommendedDilution: 'NONE',
      };
    }

    // 3. Allowed on active thermophilic piles (> 55°C) to accelerate microbial activity
    if (params.targetPitCoreTempC >= 55.0) {
      return {
        isAllowed: true,
        reason: 'गड्ढा सक्रिय थर्मोफिलिक अवस्था (>55°C) में है। उच्च तापमान रोगजनकों को नष्ट कर देगा और पोषक तत्वों का पुनर्चक्रण होगा। [NEEDS-NATIVE-REVIEW]',
        recommendedDilution: '1:0', // Pure recirculation allowed
      };
    }

    // 4. On warm mesophilic piles (40 - 54°C), allow only diluted (1:2 with clean water)
    if (params.targetPitCoreTempC >= 40.0) {
      return {
        isAllowed: true,
        reason: 'गड्ढे का तापमान मध्यम है। 1 भाग लीचेट में 2 भाग स्वच्छ पानी मिलाकर ही छिड़काव करें। [NEEDS-NATIVE-REVIEW]',
        recommendedDilution: '1:2',
      };
    }

    // 5. Cold piles (<40°C) should not be watered with leachate
    return {
      isAllowed: false,
      reason: 'गड्ढा ठंडा (<40°C) है। लीचेट डालने से यह और ठंडा होकर दलदल बन सकता है। [NEEDS-NATIVE-REVIEW]',
      recommendedDilution: 'NONE',
    };
  }

  /**
   * Calculates dilution for landscaping horticultural use (Leachate Tea)
   */
  calculateHorticulturalDilution(leachateLiters: number): { waterLitersNeeded: number; totalFertilizerLiters: number } {
    // Standard safe dilution for garden landscaping is 1:10
    const waterLitersNeeded = leachateLiters * 10;
    return {
      waterLitersNeeded,
      totalFertilizerLiters: leachateLiters + waterLitersNeeded,
    };
  }
}

export const leachateLoopService = new LeachateLoopService();
