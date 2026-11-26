import { ITimeMachineEvent, PitTimeMachine } from '../db/models/PitTimeMachine.js';
import crypto from 'crypto';

export interface PitComparisonSummary {
  pitA: { pitId: string; avgTempC: number; maxTempC: number; turningsCount: number; healthScore: number };
  pitB: { pitId: string; avgTempC: number; maxTempC: number; turningsCount: number; healthScore: number };
  keyDifferences: string[];
}

export class PitTimeMachineService {
  /**
   * Chronologically sorts and aggregates raw events into a scrubbable unified timeline
   */
  buildTimeline(events: ITimeMachineEvent[]): ITimeMachineEvent[] {
    return [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  /**
   * Deterministically compares two pit event sets over a normalized relative time period (e.g. Day 1 to 21)
   */
  comparePits(params: {
    pitAId: string;
    pitAEvents: ITimeMachineEvent[];
    pitBId: string;
    pitBEvents: ITimeMachineEvent[];
  }): PitComparisonSummary {
    const computeStats = (pitId: string, events: ITimeMachineEvent[]) => {
      let tempSum = 0;
      let tempCount = 0;
      let maxTempC = 0;
      let turningsCount = 0;

      for (const e of events) {
        if (e.coreTempC !== undefined) {
          tempSum += e.coreTempC;
          tempCount++;
          if (e.coreTempC > maxTempC) maxTempC = e.coreTempC;
        }
        if (e.eventType === 'LABOUR_TURNING') {
          turningsCount++;
        }
      }

      const avgTempC = tempCount > 0 ? Math.round((tempSum / tempCount) * 10) / 10 : 0;
      // Simple health heuristic: 100 - penalties for lack of turning or low temperature
      let healthScore = 100;
      if (turningsCount < 2) healthScore -= 30;
      if (avgTempC < 45) healthScore -= 25;

      return {
        pitId,
        avgTempC,
        maxTempC,
        turningsCount,
        healthScore: Math.max(0, healthScore),
      };
    };

    const statsA = computeStats(params.pitAId, params.pitAEvents);
    const statsB = computeStats(params.pitBId, params.pitBEvents);

    const keyDifferences: string[] = [];
    if (Math.abs(statsA.turningsCount - statsB.turningsCount) >= 1) {
      keyDifferences.push(
        `${statsA.pitId} had ${statsA.turningsCount} turnings vs ${statsB.turningsCount} turnings in ${statsB.pitId}.`
      );
    }
    if (Math.abs(statsA.avgTempC - statsB.avgTempC) >= 5.0) {
      keyDifferences.push(
        `Average temperature differential of ${Math.abs(statsA.avgTempC - statsB.avgTempC).toFixed(1)}°C observed between pits.`
      );
    }

    return {
      pitA: statsA,
      pitB: statsB,
      keyDifferences,
    };
  }
}

export const pitTimeMachineService = new PitTimeMachineService();
