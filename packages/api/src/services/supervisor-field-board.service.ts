import { ISupervisorRoundStop, IWaitingApprovalItem } from '../db/models/SupervisorFieldBoard.js';

export class SupervisorFieldBoardService {
  /**
   * Sorts and prioritizes supervisor yard rounds:
   * Prioritizes PIT_RISK stops first, followed by due SENSE_CHECKS, MAPPING_ROUNDS, and COVER_AUDITS.
   */
  prioritizeRounds(rawStops: Array<{
    locationId: string;
    targetType: 'PIT_RISK' | 'SENSE_CHECK_DUE' | 'MAPPING_ROUND' | 'COVER_AUDIT' | 'NODE_CARE';
    reason: string;
  }>): ISupervisorRoundStop[] {
    const priorityWeights: Record<string, number> = {
      PIT_RISK: 1,
      SENSE_CHECK_DUE: 2,
      NODE_CARE: 3,
      MAPPING_ROUND: 4,
      COVER_AUDIT: 5,
    };

    const sorted = [...rawStops].sort((a, b) => {
      return (priorityWeights[a.targetType] || 10) - (priorityWeights[b.targetType] || 10);
    });

    return sorted.map((s, idx) => ({
      stopOrder: idx + 1,
      locationId: s.locationId,
      targetType: s.targetType,
      reason: s.reason,
      isCompleted: false,
    }));
  }

  /**
   * Filters and formats pending supervisor action items
   */
  filterWaitingApprovals(items: IWaitingApprovalItem[]): {
    totalPending: number;
    practicalSignoffsCount: number;
    supervisedOverridesCount: number;
    items: IWaitingApprovalItem[];
  } {
    const practicalSignoffsCount = items.filter((i) => i.itemType === 'PRACTICAL_SIGNOFF').length;
    const supervisedOverridesCount = items.filter((i) => i.itemType === 'SUPERVISED_WORK_OVERRIDE').length;

    return {
      totalPending: items.length,
      practicalSignoffsCount,
      supervisedOverridesCount,
      items,
    };
  }
}

export const supervisorFieldBoardService = new SupervisorFieldBoardService();
