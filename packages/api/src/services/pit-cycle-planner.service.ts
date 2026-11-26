import { IPitCycleAllocation } from '../db/models/PitCyclePlanner.js';

export interface PitCyclePlanResult {
  capacityRunwayDays: number;
  yardUtilisationPct: number;
  assignedPitIdForToday?: string;
  overflowRiskDetected: boolean;
  recommendedMitigationHindi?: string;
  allocations: IPitCycleAllocation[];
}

export class PitCyclePlannerService {
  /**
   * Deterministically plans pit filling cycles, calculates capacity runway and blocks assignments to closed batches
   */
  evaluateCyclePlan(params: {
    forecastDailyIntakeKg: number;
    pits: Array<{
      pitId: string;
      batchId?: string;
      status: 'FILLING_ACCEPTING' | 'CLOSED_THERMOPHILIC' | 'CLOSED_CURING' | 'EMPTY_CLEAN';
      currentFillKg: number;
      maxCapacityKg: number;
      expectedClosureDate?: string;
      expectedHarvestDate?: string;
    }>;
  }): PitCyclePlanResult {
    let totalMaxCapacityKg = 0;
    let totalCurrentFillKg = 0;
    let availableAcceptingCapacityKg = 0;
    let assignedPitIdForToday: string | undefined;

    const allocations: IPitCycleAllocation[] = [];

    params.pits.forEach((p) => {
      totalMaxCapacityKg += p.maxCapacityKg;
      totalCurrentFillKg += p.currentFillKg;

      const availableCapacityKg = Math.max(0, p.maxCapacityKg - p.currentFillKg);

      allocations.push({
        ...p,
        availableCapacityKg,
      });

      // Only pits in FILLING_ACCEPTING or EMPTY_CLEAN can receive fresh waste
      if ((p.status === 'FILLING_ACCEPTING' || p.status === 'EMPTY_CLEAN') && availableCapacityKg > 0) {
        availableAcceptingCapacityKg += availableCapacityKg;
        if (!assignedPitIdForToday) {
          assignedPitIdForToday = p.pitId;
        }
      }
    });

    const dailyIntake = Math.max(100, params.forecastDailyIntakeKg);
    const capacityRunwayDays = Math.round((availableAcceptingCapacityKg / dailyIntake) * 10) / 10;
    const yardUtilisationPct = totalMaxCapacityKg > 0
      ? Math.round((totalCurrentFillKg / totalMaxCapacityKg) * 100)
      : 0;

    const overflowRiskDetected = capacityRunwayDays < 5;
    let recommendedMitigationHindi: string | undefined;

    if (overflowRiskDetected) {
      recommendedMitigationHindi = `सावधान: यार्ड क्षमता रनवे केवल ${capacityRunwayDays} दिन शेष है। आपातकालीन अस्थायी बे (temporary bay) खोलें अथवा तैयार खाद की तत्काल निकासी करें। [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      capacityRunwayDays,
      yardUtilisationPct,
      assignedPitIdForToday,
      overflowRiskDetected,
      recommendedMitigationHindi,
      allocations,
    };
  }
}

export const pitCyclePlannerService = new PitCyclePlannerService();
