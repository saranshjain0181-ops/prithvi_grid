import { ISafetyLeadingIndicators } from '../db/models/SafetyWelfareCockpit.js';

export interface SafetyPostureEvaluationResult {
  safetyPostureStatus: 'HEALTHY' | 'ACTION_REQUIRED' | 'CRITICAL_HAZARD';
  nearMissToIncidentRatio: number;
  leadingIndicators: ISafetyLeadingIndicators;
  advisoryHindi: string;
}

export class SafetyWelfareService {
  /**
   * Deterministically evaluates facility safety posture, leading hazard indicators & near-miss ratio
   */
  evaluateSafetyPosture(params: {
    totalIncidentsMonth: number;
    totalNearMissesMonth: number;
    overdueCorrectiveActionsCount: number;
    alarmDrillPassRatePct?: number;
    daysSinceLastAlarmDrill?: number;
    contractorSafetyCompliancePct?: number;
    heatStressWarningDaysCount?: number;
  }): SafetyPostureEvaluationResult {
    const drillPassPct = params.alarmDrillPassRatePct ?? 100;
    const daysSinceDrill = params.daysSinceLastAlarmDrill ?? 7;
    const contractorSafetyPct = params.contractorSafetyCompliancePct ?? 95;
    const heatDays = params.heatStressWarningDaysCount ?? 0;

    const incidents = params.totalIncidentsMonth;
    const nearMisses = params.totalNearMissesMonth;
    const nearMissToIncidentRatio = incidents > 0
      ? Math.round((nearMisses / incidents) * 10) / 10
      : nearMisses > 0 ? nearMisses : 3.0;

    const leadingIndicators: ISafetyLeadingIndicators = {
      overdueCorrectiveActionsCount: params.overdueCorrectiveActionsCount,
      nearMissToIncidentRatio,
      alarmDrillPassRatePct: drillPassPct,
      daysSinceLastAlarmDrill: daysSinceDrill,
      contractorSafetyCompliancePct: contractorSafetyPct,
      heatStressWarningDaysCount: heatDays,
    };

    let safetyPostureStatus: 'HEALTHY' | 'ACTION_REQUIRED' | 'CRITICAL_HAZARD' = 'HEALTHY';
    let advisoryHindi = '';

    if (incidents >= 2 || params.overdueCorrectiveActionsCount >= 3) {
      safetyPostureStatus = 'CRITICAL_HAZARD';
      advisoryHindi = `गंभीर सुरक्षा खतरा (Critical Hazard): ${params.overdueCorrectiveActionsCount} सुधारात्मक कार्य अतिदेय हैं और ${incidents} घटनाएं दर्ज हैं। सुरक्षा अधिकारी तुरंत निरीक्षण करें। [LEGAL-REVIEW] [NEEDS-NATIVE-REVIEW]`;
    } else if (params.overdueCorrectiveActionsCount > 0 || drillPassPct < 85 || daysSinceDrill > 14) {
      safetyPostureStatus = 'ACTION_REQUIRED';
      advisoryHindi = `सुरक्षा सुधार आवश्यक (Action Required): साप्ताहिक अलार्म ड्रिल अथवा मशीन गार्ड सुधार कार्य लंबित हैं। [NEEDS-NATIVE-REVIEW]`;
    } else {
      advisoryHindi = `सुरक्षा स्थिति मजबूत व स्वस्थ (Healthy Safety Posture). नियर-मिस रिपोर्टिंग दर (${nearMissToIncidentRatio}x) सक्रिय सुरक्षा संस्कृति दर्शाती है। [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      safetyPostureStatus,
      nearMissToIncidentRatio,
      leadingIndicators,
      advisoryHindi,
    };
  }
}

export const safetyWelfareService = new SafetyWelfareService();
