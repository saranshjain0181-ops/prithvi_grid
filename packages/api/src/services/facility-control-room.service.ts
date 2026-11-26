import { ControlRoomMode, IStageQueueMetric } from '../db/models/FacilityControlRoom.js';

export class FacilityControlRoomService {
  /**
   * Deterministically determines active Control Room mode from the local time of day
   */
  resolveTimeOfDayMode(localHour: number): ControlRoomMode {
    // 05:00 - 09:30: Morning Plan Approval
    if (localHour >= 5 && localHour < 9.5) {
      return 'MORNING_MODE';
    }
    // 09:30 - 16:30: Live Operations
    if (localHour >= 9.5 && localHour < 16.5) {
      return 'LIVE_MODE';
    }
    // 16:30 - 23:59 (and night): Evening Close-Out
    return 'EVENING_MODE';
  }

  /**
   * Evaluates Stage Flow queues and detects bottleneck stages
   */
  evaluateStageFlow(stages: Array<{
    stageName: 'RECEIVING' | 'PREPARATION' | 'COMPOSTING' | 'CURING' | 'FINISHING';
    workInProgressKg: number;
    averageQueueHours: number;
  }>): IStageQueueMetric[] {
    return stages.map((s) => {
      // Threshold rules: Preparation queue > 2h or Curing queue > 5000kg flags a bottleneck
      const isBottleneck =
        (s.stageName === 'PREPARATION' && s.averageQueueHours > 2.0) ||
        (s.stageName === 'RECEIVING' && s.averageQueueHours > 1.5) ||
        (s.stageName === 'CURING' && s.workInProgressKg > 5000) ||
        (s.stageName === 'FINISHING' && s.averageQueueHours > 4.0);

      return {
        stageName: s.stageName,
        workInProgressKg: s.workInProgressKg,
        averageQueueHours: s.averageQueueHours,
        isBottleneck,
      };
    });
  }
}

export const facilityControlRoomService = new FacilityControlRoomService();
