import { Types } from 'mongoose';
import { AlertGovernorPolicy, IAlertGovernorPolicy } from '../db/models/AlertGovernorPolicy';
import { AiAlertSanjivani } from '../db/models/AiAlertSanjivani';

export interface AlertFilterDecision {
  shouldDeliverImmediately: boolean;
  suppressed: boolean;
  reason: 'DELIVERED_NORMAL' | 'DELIVERED_CRITICAL_BYPASS' | 'BUDGET_EXCEEDED' | 'DUPLICATE_SUPPRESSED' | 'ROUTED_TO_DIGEST';
}

export class AlertGovernorService {
  /**
   * Evaluates an alert through the Fatigue Governor policy layer (Feature 16).
   */
  public evaluateAlertDelivery(params: {
    alertSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    recipientRole: 'BWG_MANAGER' | 'SAFAI_MITRA' | 'SUPREME_HEAD';
    alertsDeliveredTodayCount: number;
    hasDuplicateRecentAlert?: boolean;
  }): AlertFilterDecision {
    // 1. Critical safety alerts BYPASS all suppression
    if (params.alertSeverity === 'CRITICAL') {
      return {
        shouldDeliverImmediately: true,
        suppressed: false,
        reason: 'DELIVERED_CRITICAL_BYPASS',
      };
    }

    // 2. Suppress duplicates within debounce window
    if (params.hasDuplicateRecentAlert) {
      return {
        shouldDeliverImmediately: false,
        suppressed: true,
        reason: 'DUPLICATE_SUPPRESSED',
      };
    }

    // 3. Enforce Daily Interruption Budget per role
    const budgets = {
      BWG_MANAGER: 8,
      SAFAI_MITRA: 4,
      SUPREME_HEAD: 12,
    };
    const maxBudget = budgets[params.recipientRole] || 8;

    if (params.alertsDeliveredTodayCount >= maxBudget) {
      return {
        shouldDeliverImmediately: false,
        suppressed: true,
        reason: 'BUDGET_EXCEEDED',
      };
    }

    // 4. Low-severity items routed to digest
    if (params.alertSeverity === 'LOW') {
      return {
        shouldDeliverImmediately: false,
        suppressed: true,
        reason: 'ROUTED_TO_DIGEST',
      };
    }

    return {
      shouldDeliverImmediately: true,
      suppressed: false,
      reason: 'DELIVERED_NORMAL',
    };
  }

  /**
   * Watchdog: Evaluates absence of expected actions (Silent-Failure Watchdog).
   */
  public checkSilentFailureAbsence(params: {
    expectedAction: 'DAILY_INTAKE' | 'TURNING' | 'NODE_HEARTBEAT';
    hoursSinceLastLogged: number;
    historicalReliabilityPct: number;
  }): { isSilentFailureDetected: boolean; noticeEn: string; noticeHi: string } {
    if (params.expectedAction === 'DAILY_INTAKE' && params.hoursSinceLastLogged >= 24 && params.historicalReliabilityPct >= 90) {
      return {
        isSilentFailureDetected: true,
        noticeEn: `Absence alert: Daily kitchen waste intake was logged on ${params.historicalReliabilityPct}% of past days, but no entry logged today.`,
        noticeHi: `साइलेंट फेलियर अलर्ट: किचन वेस्ट इंटेक पिछले ${params.historicalReliabilityPct}% दिनों में रोज दर्ज हुआ था, लेकिन आज कोई एंट्री नहीं मिली।`,
      };
    }

    return {
      isSilentFailureDetected: false,
      noticeEn: 'Operational cadence normal.',
      noticeHi: 'दैनिक कार्य सामान्य है।',
    };
  }
}

export const alertGovernorService = new AlertGovernorService();
