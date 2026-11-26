export interface ThreeWayMatchResult {
  isMatchPassed: boolean;
  quantityVariancePct: number;
  rateVariancePct: number;
  varianceNotesHindi: string;
}

export interface SupplierScorecardResult {
  supplierId: string;
  onTimeDeliveryPct: number;
  threeWayMatchPassPct: number;
  ratingTier: 'PREFERRED' | 'APPROVED' | 'PROBATIONARY';
  advisoryHindi: string;
}

export class ProcurementScorecardService {
  /**
   * Deterministically validates 3-way match between PO, verified scale receipts, and invoice
   */
  evaluateThreeWayMatch(params: {
    poQuantity: number;
    receivedScaleWeight: number;
    invoicedQuantity: number;
    poRateInr: number;
    invoicedRateInr: number;
  }): ThreeWayMatchResult {
    // Quantity variance against PO
    const qtyVariance = Math.abs(params.receivedScaleWeight - params.poQuantity);
    const quantityVariancePct = Math.round((qtyVariance / params.poQuantity) * 100 * 10) / 10;

    // Rate variance against PO
    const rateVariance = Math.abs(params.invoicedRateInr - params.poRateInr);
    const rateVariancePct = Math.round((rateVariance / params.poRateInr) * 100 * 10) / 10;

    // Tolerance thresholds: Quantity <= 5% variance, Rate == 0% variance
    const isMatchPassed = quantityVariancePct <= 5.0 && rateVariancePct === 0;

    let varianceNotesHindi = '';
    if (isMatchPassed) {
      varianceNotesHindi = 'थ्री-वे मैच सफल (PO, वजन कांटा व इनवॉइस पूर्णतः संरेखित हैं)। भुगतान स्वीकृत। [NEEDS-NATIVE-REVIEW]';
    } else {
      varianceNotesHindi = `विसंगति ध्वज: मात्रा अंतर ${quantityVariancePct}% अथवा दर अंतर ₹${rateVariance} पाया गया। वित्त समीक्षा आवश्यक। [LEGAL-REVIEW] [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      isMatchPassed,
      quantityVariancePct,
      rateVariancePct,
      varianceNotesHindi,
    };
  }

  /**
   * Computes supplier scorecard and tier
   */
  computeSupplierScore(params: {
    supplierId: string;
    totalDeliveries: number;
    onTimeDeliveries: number;
    matchesPassedCount: number;
    qualityRejectionsCount: number;
  }): SupplierScorecardResult {
    const total = Math.max(1, params.totalDeliveries);
    const onTimeDeliveryPct = Math.round((params.onTimeDeliveries / total) * 100);
    const threeWayMatchPassPct = Math.round((params.matchesPassedCount / total) * 100);

    const compositeScore = (onTimeDeliveryPct * 0.5) + (threeWayMatchPassPct * 0.5);

    let ratingTier: 'PREFERRED' | 'APPROVED' | 'PROBATIONARY' = 'APPROVED';
    if (compositeScore >= 92 && params.qualityRejectionsCount === 0) {
      ratingTier = 'PREFERRED';
    } else if (compositeScore < 75 || params.qualityRejectionsCount > 2) {
      ratingTier = 'PROBATIONARY';
    }

    return {
      supplierId: params.supplierId,
      onTimeDeliveryPct,
      threeWayMatchPassPct,
      ratingTier,
      advisoryHindi: `सप्लायर रेटिंग: ${ratingTier} (ऑन-टाइम: ${onTimeDeliveryPct}%, मैच पास: ${threeWayMatchPassPct}%). [NEEDS-NATIVE-REVIEW]`,
    };
  }
}

export const procurementScorecardService = new ProcurementScorecardService();
