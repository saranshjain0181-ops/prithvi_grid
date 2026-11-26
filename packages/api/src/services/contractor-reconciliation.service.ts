import {
  IContractorDisputeItem,
  IContractorSlaMetrics,
} from '../db/models/ContractorReconciliation.js';

export interface ContractorReconciliationEvaluation {
  metrics: IContractorSlaMetrics;
  grossClaimedAmountInr: number;
  totalDeductionsInr: number;
  netApprovedAmountInr: number;
  slaAdherenceScorePct: number;
  auditFlag: 'CLEAR' | 'VARIANCE_FLAGGED' | 'CRITICAL_DISCREPANCY';
  summaryHindi: string;
}

export class ContractorReconciliationService {
  /**
   * Deterministically reconciles contractor monthly invoice against sensor & attendance ledger
   */
  reconcileInvoice(params: {
    billedManDays: number;
    observedManDays: number;
    billedTurnsCount: number;
    verifiedTurnsCount: number;
    ratePerManDayInr: number;
    penaltyPerMissedTurnInr?: number;
    disputes?: IContractorDisputeItem[];
  }): ContractorReconciliationEvaluation {
    const penaltyPerMissedTurn = params.penaltyPerMissedTurnInr ?? 500;
    const grossClaimedAmountInr = Math.round(params.billedManDays * params.ratePerManDayInr);

    // 1. Man-day variance
    const unexplainedVarianceManDays = Math.max(0, params.billedManDays - params.observedManDays);
    const manDayVarianceDeductionInr = Math.round(unexplainedVarianceManDays * params.ratePerManDayInr);

    // 2. Unverified turns penalty
    const missedTurns = Math.max(0, params.billedTurnsCount - params.verifiedTurnsCount);
    const missedTurnPenaltyInr = Math.round(missedTurns * penaltyPerMissedTurn);

    // 3. Turn compliance percentage
    const turnCompliancePct = params.billedTurnsCount > 0
      ? Math.min(100, Math.round((params.verifiedTurnsCount / params.billedTurnsCount) * 100))
      : 100;

    const totalDeductionsInr = manDayVarianceDeductionInr + missedTurnPenaltyInr;
    const netApprovedAmountInr = Math.max(0, grossClaimedAmountInr - totalDeductionsInr);

    // Attendance adherence percentage
    const attendancePct = params.billedManDays > 0
      ? Math.min(100, Math.round((params.observedManDays / params.billedManDays) * 100))
      : 100;
    
    // Overall SLA score (weighted 50% attendance, 50% turn verification)
    const slaAdherenceScorePct = Math.round((attendancePct * 0.5) + (turnCompliancePct * 0.5));

    let auditFlag: 'CLEAR' | 'VARIANCE_FLAGGED' | 'CRITICAL_DISCREPANCY' = 'CLEAR';
    let summaryHindi = '';

    if (unexplainedVarianceManDays > 10 || turnCompliancePct < 70) {
      auditFlag = 'CRITICAL_DISCREPANCY';
      summaryHindi = `गंभीर विसंगति: बिल किए गए दिनों में से ${unexplainedVarianceManDays} दिन बायोमेट्रिक/सेंसर में अनुपस्थित हैं। ₹${totalDeductionsInr} की कटौती अनुशंसित है। [LEGAL-REVIEW] [NEEDS-NATIVE-REVIEW]`;
    } else if (totalDeductionsInr > 0) {
      auditFlag = 'VARIANCE_FLAGGED';
      summaryHindi = `मामूली अंतर: ₹${totalDeductionsInr} का समायोजन (Adjustment) प्रस्तावित किया गया है। [NEEDS-NATIVE-REVIEW]`;
    } else {
      summaryHindi = `बिल का शत-प्रतिशत मिलान सफल। ₹${netApprovedAmountInr} के भुगतान की अनुशंसा की जाती है। [NEEDS-NATIVE-REVIEW]`;
    }

    const metrics: IContractorSlaMetrics = {
      billedManDays: params.billedManDays,
      observedManDays: params.observedManDays,
      billedTurnsCount: params.billedTurnsCount,
      verifiedTurnsCount: params.verifiedTurnsCount,
      turnCompliancePct,
      unexplainedVarianceManDays,
      recommendedAdjustmentInr: totalDeductionsInr,
    };

    return {
      metrics,
      grossClaimedAmountInr,
      totalDeductionsInr,
      netApprovedAmountInr,
      slaAdherenceScorePct,
      auditFlag,
      summaryHindi,
    };
  }
}

export const contractorReconciliationService = new ContractorReconciliationService();
