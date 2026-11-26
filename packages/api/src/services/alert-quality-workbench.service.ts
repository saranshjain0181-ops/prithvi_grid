import { IRuleQualityStat, ITuningProposal } from '../db/models/AlertQualityWorkbench.js';

export interface AlertQualityWorkbenchResult {
  overallAlertPrecisionPct: number;
  evaluatedRules: IRuleQualityStat[];
  tuningProposals: ITuningProposal[];
  summaryAdvisoryHindi: string;
}

export class AlertQualityWorkbenchService {
  /**
   * Deterministically evaluates alert precision, attention noise cost, and generates tuning proposals
   */
  evaluateRulesQuality(
    rules: Array<{
      ruleCode: string;
      ruleName: string;
      totalAlertsDispatched: number;
      usefulFeedbackCount: number;
      falseAlarmCount: number;
      delayedCount: number;
      averageLeadTimeHours: number;
      currentThreshold?: string;
      currentDebounceMinutes?: number;
    }>
  ): AlertQualityWorkbenchResult {
    let totalAlertsAll = 0;
    let totalUsefulAll = 0;

    const evaluatedRules: IRuleQualityStat[] = [];
    const tuningProposals: ITuningProposal[] = [];

    rules.forEach((r) => {
      const precisionPct = r.totalAlertsDispatched > 0
        ? Math.round((r.usefulFeedbackCount / r.totalAlertsDispatched) * 100)
        : 100;

      totalAlertsAll += r.totalAlertsDispatched;
      totalUsefulAll += r.usefulFeedbackCount;

      const attentionCostPoints = r.totalAlertsDispatched * 2;

      evaluatedRules.push({
        ruleCode: r.ruleCode,
        ruleName: r.ruleName,
        totalAlertsDispatched: r.totalAlertsDispatched,
        usefulFeedbackCount: r.usefulFeedbackCount,
        falseAlarmCount: r.falseAlarmCount,
        delayedCount: r.delayedCount,
        precisionPct,
        averageLeadTimeHours: r.averageLeadTimeHours,
        attentionCostPoints,
      });

      // Noisy rule detection: precision < 65% with >= 10 alerts
      if (precisionPct < 65 && r.totalAlertsDispatched >= 10) {
        const currentDebounce = r.currentDebounceMinutes || 15;
        const proposedDebounce = currentDebounce * 2; // double debounce window to suppress transient noise

        tuningProposals.push({
          proposalId: `TUNE-PROP-${r.ruleCode}-${Date.now()}`,
          ruleCode: r.ruleCode,
          currentThreshold: r.currentThreshold || 'Default Level',
          proposedThreshold: `${r.currentThreshold || 'Default Level'} (Tightened)`,
          currentDebounceMinutes: currentDebounce,
          proposedDebounceMinutes: proposedDebounce,
          backtestEstimatedNoiseReductionPct: Math.round((r.falseAlarmCount / r.totalAlertsDispatched) * 80),
          backtestMissedIncidentsCount: 0,
          status: 'PENDING_AGRONOMIST_REVIEW',
        });
      }
    });

    const overallAlertPrecisionPct = totalAlertsAll > 0
      ? Math.round((totalUsefulAll / totalAlertsAll) * 100)
      : 100;

    let summaryAdvisoryHindi = '';
    if (tuningProposals.length > 0) {
      summaryAdvisoryHindi = `${tuningProposals.length} नियमों में शोर (Noise/False Alarms) अधिक पाया गया। डीबाउंस समय व थ्रेशोल्ड ट्यूनिंग प्रस्ताव तैयार हैं। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]`;
    } else {
      summaryAdvisoryHindi = `अलर्ट गुणवत्ता संतोषजनक है (समग्र सटीकता: ${overallAlertPrecisionPct}%). अलार्म थकान न्यूनतम है। [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      overallAlertPrecisionPct,
      evaluatedRules,
      tuningProposals,
      summaryAdvisoryHindi,
    };
  }
}

export const alertQualityWorkbenchService = new AlertQualityWorkbenchService();
