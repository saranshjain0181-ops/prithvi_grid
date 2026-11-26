import { IMaturityEvidenceItem } from '../db/models/MaturityFusion.js';

export interface MaturityFusionEvaluation {
  compositeMaturityScorePct: number;
  evidenceStrengthTier: 'STRONG' | 'MODERATE' | 'WEAK';
  isReadyForRelease: boolean;
  passedCategoriesCount: number;
  harvestWindow: {
    earliestHarvestDate: string;
    likelyHarvestDate: string;
    latestHarvestDate: string;
    confidencePct: number;
  };
  recommendationHindi: string;
  nextBestActionHindi: string;
}

export class MaturityFusionService {
  /**
   * Deterministically fuses independent biological, physical, and laboratory maturity signals
   */
  evaluateMaturity(params: {
    asOfDate?: string; // YYYY-MM-DD
    evidenceItems: IMaturityEvidenceItem[];
  }): MaturityFusionEvaluation {
    if (params.evidenceItems.length === 0) {
      throw new Error('At least one evidence item is required for maturity fusion.');
    }

    const todayStr = params.asOfDate || new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    let totalWeightedScore = 0;
    let totalWeight = 0;
    let passedCount = 0;
    let hasEmpiricalTest = false;

    params.evidenceItems.forEach((item) => {
      const weight = item.reliabilityWeight;
      totalWeight += weight;
      totalWeightedScore += item.scoreContributionPct * weight;

      if (item.isPassed) passedCount++;
      if (item.category === 'GERMINATION_CRESS_TEST' || item.category === 'LAB_CN_RATIO') {
        if (item.isPassed) hasEmpiricalTest = true;
      }
    });

    const compositeMaturityScorePct = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;

    // Evidence strength tier
    let evidenceStrengthTier: 'STRONG' | 'MODERATE' | 'WEAK' = 'MODERATE';
    if (params.evidenceItems.length >= 4 && hasEmpiricalTest) {
      evidenceStrengthTier = 'STRONG';
    } else if (params.evidenceItems.length < 3) {
      evidenceStrengthTier = 'WEAK';
    }

    // Release Gate standard: score >= 80, >= 3 independent items passed, and >= 1 empirical test
    const isReadyForRelease = compositeMaturityScorePct >= 80 && passedCount >= 3 && hasEmpiricalTest;

    // Harvest Window forecasting
    let daysToLikely = 14;
    let daysToEarliest = 7;
    let daysToLatest = 21;
    let confidencePct = 70;

    if (compositeMaturityScorePct >= 85) {
      daysToEarliest = 2;
      daysToLikely = 5;
      daysToLatest = 8;
      confidencePct = 90;
    } else if (compositeMaturityScorePct >= 70) {
      daysToEarliest = 6;
      daysToLikely = 10;
      daysToLatest = 15;
      confidencePct = 80;
    } else {
      daysToEarliest = 14;
      daysToLikely = 21;
      daysToLatest = 30;
      confidencePct = 65;
    }

    const addDays = (d: Date, n: number) => {
      const copy = new Date(d);
      copy.setDate(copy.getDate() + n);
      return copy.toISOString().split('T')[0];
    };

    const harvestWindow = {
      earliestHarvestDate: addDays(today, daysToEarliest),
      likelyHarvestDate: addDays(today, daysToLikely),
      latestHarvestDate: addDays(today, daysToLatest),
      confidencePct,
    };

    let recommendationHindi = '';
    let nextBestActionHindi = '';

    if (isReadyForRelease) {
      recommendationHindi = `खाद पूर्ण परिपक्व (Maturity Score: ${compositeMaturityScorePct}%). हार्वेस्ट गेट पास हुआ। छानने व बैगिंग हेतु तैयार। [NEEDS-NATIVE-REVIEW]`;
      nextBestActionHindi = 'बैच-टू-बैग (Batch-to-Bag) चैन शुरू करें और छन्ने का स्लॉट बुक करें। [NEEDS-NATIVE-REVIEW]';
    } else {
      recommendationHindi = `खाद अभी परिपक्व हो रही है (${compositeMaturityScorePct}% / न्यूनतम 80% आवश्यक). अनुमानित हार्वेस्ट: ${harvestWindow.likelyHarvestDate}. [NEEDS-NATIVE-REVIEW]`;
      if (!hasEmpiricalTest) {
        nextBestActionHindi = 'अंकुरण परीक्षण (Cress Germination Test) या लैब C:N जांच दर्ज करें। [NEEDS-NATIVE-REVIEW]';
      } else {
        nextBestActionHindi = 'ढेर को स्थिर होने दें (Curing Maturation जारी रखें)। [NEEDS-NATIVE-REVIEW]';
      }
    }

    return {
      compositeMaturityScorePct,
      evidenceStrengthTier,
      isReadyForRelease,
      passedCategoriesCount: passedCount,
      harvestWindow,
      recommendationHindi,
      nextBestActionHindi,
    };
  }
}

export const maturityFusionService = new MaturityFusionService();
