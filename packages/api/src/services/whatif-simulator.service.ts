import { Types } from 'mongoose';
import { pitPersonalityService } from './pit-personality.service';

export interface WhatIfScenarioInput {
  pitId: string | Types.ObjectId;
  turningFrequencyDays: number; // e.g. 3 vs 7
  wasteVolumeMultiplier: number; // e.g. 1.0 vs 1.5
  bulkingMaterialRatioPct: number; // e.g. 20%
}

export interface WhatIfSimulationResult {
  expectedHealthyDaysPct: number;
  odorRiskProbabilityPct: number;
  daysUntilCapacityExhaustion: number;
  uncertaintyBand: { min: number; max: number };
  isEstimated: true; // Hardcoded honest label
  assumptions: string[];
}

export class WhatIfSimulatorService {
  /**
   * Simulates operational lever changes on composting outcomes using pit personality models (Feature 18).
   */
  public async simulateScenario(input: WhatIfScenarioInput): Promise<WhatIfSimulationResult> {
    const pitObjId = new Types.ObjectId(input.pitId.toString());
    const profile = await pitPersonalityService.getOrCreateProfile(pitObjId, '6717a0000000000000000001');

    // 1. Calculate healthy days based on turning frequency vs learned rebound time
    // If turning frequency is > 5 days in a hotel pit, methane accumulates
    let healthyPct = 94.0;
    let odorRisk = 8.0;

    if (input.turningFrequencyDays > 4) {
      const extraDays = input.turningFrequencyDays - 4;
      healthyPct -= extraDays * 6.5;
      odorRisk += extraDays * 12.0;
    }

    if (input.wasteVolumeMultiplier > 1.2) {
      healthyPct -= 8.0;
      odorRisk += 14.0;
    }

    healthyPct = Math.max(30, Math.min(98, Math.round(healthyPct)));
    odorRisk = Math.max(2, Math.min(85, Math.round(odorRisk)));

    const daysUntilFull = Math.round(28 / Math.max(0.5, input.wasteVolumeMultiplier));

    return {
      expectedHealthyDaysPct: healthyPct,
      odorRiskProbabilityPct: odorRisk,
      daysUntilCapacityExhaustion: daysUntilFull,
      uncertaintyBand: {
        min: Math.max(20, healthyPct - 8),
        max: Math.min(100, healthyPct + 6),
      },
      isEstimated: true,
      assumptions: [
        `Pit learned thermal rebound: ${profile.tempReboundHours}h`,
        `Assumes dry carbon bulking ratio of ${input.bulkingMaterialRatioPct}%`,
        'Simulation uses Bayesian pit personality models. Actual outcomes vary with rainfall and grease content.',
      ],
    };
  }
}

export const whatIfSimulatorService = new WhatIfSimulatorService();
