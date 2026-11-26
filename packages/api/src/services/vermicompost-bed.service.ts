export interface VermiFeedGateResult {
  isFeedAllowed: boolean;
  rejectionReasonHindi?: string;
  wormHealthScorePct: number;
  bedHealthTier: 'OPTIMAL' | 'STRESSED' | 'CRITICAL_RISK';
  recommendedActionsHindi: string[];
}

export class VermicompostBedService {
  /**
   * Evaluates Feed Readiness Gate to protect earthworms from thermal shock & computes bed health score
   */
  evaluateFeedAndBedHealth(params: {
    sourcePitPhase: string;
    sourcePitTempC: number;
    sourcePitSmellAmmonia?: 'NONE' | 'FAINT' | 'SHARP';
    bedTempC: number;
    bedMoisturePct: number;
    isPestsDetected?: boolean;
    wormEscapingObserved?: boolean;
  }): VermiFeedGateResult {
    // 1. Strict Feed Readiness Interlock: Worms die above 35°C and flee from sharp ammonia
    let isFeedAllowed = true;
    let rejectionReasonHindi: string | undefined;

    if (params.sourcePitTempC > 35 || params.sourcePitPhase === 'THERMOPHILIC') {
      isFeedAllowed = false;
      rejectionReasonHindi = `खुराक अस्वीकृत (Hot Feed Rejected): स्रोत गड्ढे का तापमान ${params.sourcePitTempC}°C है (अधिकतम अनुमेय: 35°C)। गर्म खाद से केंचुए मर जाएंगे। पहले ठंडा होने दें। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]`;
    } else if (params.sourcePitSmellAmmonia === 'SHARP') {
      isFeedAllowed = false;
      rejectionReasonHindi = 'खुराक अस्वीकृत (Ammonia Rejected): खाद में तेज अमोनिया गंध है जिससे केंचुए भाग जाएंगे। हवा लगने दें। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]';
    }

    // 2. Bed Health Scoring (Optimal: Temp 20-28°C, Moisture 65-75%)
    let score = 100;
    const recommendedActionsHindi: string[] = [];

    // Temp checks
    if (params.bedTempC < 15) {
      score -= 25;
      recommendedActionsHindi.push('बेड बहुत ठंडा है (<15°C)। ऊपर से पराली/बोरी ढकें। [NEEDS-NATIVE-REVIEW]');
    } else if (params.bedTempC > 32) {
      score -= 35;
      recommendedActionsHindi.push('बेड गर्म हो रहा है (>32°C)। छाया करें और ठंडा पानी छिड़कें। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]');
    }

    // Moisture checks
    if (params.bedMoisturePct < 60) {
      score -= 25;
      recommendedActionsHindi.push('बेड सूखा है (<60% नमी)। फव्वारे से पानी छिड़कें। [NEEDS-NATIVE-REVIEW]');
    } else if (params.bedMoisturePct > 80) {
      score -= 30;
      recommendedActionsHindi.push('बेड अत्यधिक गीला है (>80%)। केंचुओं का दम घुट सकता है। पानी निकासी खोलें। [NEEDS-NATIVE-REVIEW]');
    }

    // Pests / escape
    if (params.isPestsDetected) {
      score -= 20;
      recommendedActionsHindi.push('चींटियां/चूहे देखे गए। हल्दी पाउडर या पानी की नाली का उपयोग करें। [NEEDS-NATIVE-REVIEW]');
    }
    if (params.wormEscapingObserved) {
      score -= 30;
      recommendedActionsHindi.push('केंचुए बेड से बाहर भाग रहे हैं — तुरंत अम्लता व गर्मी जांचें! [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]');
    }

    const wormHealthScorePct = Math.max(0, score);
    let bedHealthTier: 'OPTIMAL' | 'STRESSED' | 'CRITICAL_RISK' = 'OPTIMAL';
    if (wormHealthScorePct < 50) {
      bedHealthTier = 'CRITICAL_RISK';
    } else if (wormHealthScorePct < 75) {
      bedHealthTier = 'STRESSED';
    }

    return {
      isFeedAllowed,
      rejectionReasonHindi,
      wormHealthScorePct,
      bedHealthTier,
      recommendedActionsHindi,
    };
  }
}

export const vermicompostBedService = new VermicompostBedService();
