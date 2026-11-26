import { Types } from 'mongoose';
import { PitPersonalityProfile, IPitPersonalityProfile, PitArchetype } from '../db/models/PitPersonalityProfile';

export interface ObservedInterventionData {
  interventionType: 'TURNING' | 'WATERING' | 'ADD_BULKING' | 'ADD_WOOD_ASH' | 'LOAD_WASTE';
  measuredInputAmount?: number; // e.g. Litres of water or kg of ash
  tempBeforeC: number;
  tempAfterC: number;
  hoursToTempRebound?: number;
  moistureBeforePct?: number;
  moistureAfterPct?: number;
  phBefore?: number;
  phAfter?: number;
  methaneHalfLifeHoursObserved?: number;
}

export const ARCHETYPE_PRIORS: Record<PitArchetype, {
  moistureGainPerLiterWater: number;
  tempReboundHours: number;
  phShiftPerKgAdditive: number;
  methaneDecayHalfLifeHours: number;
  dailyHeatingRateC: number;
  thermalInertiaCoeff: number;
  odorLagHours: number;
}> = {
  HOTEL_KITCHEN: {
    moistureGainPerLiterWater: 0.11, // High grease retards water absorption slightly
    tempReboundHours: 12.0, // Rebounds rapidly due to rich food nutrients
    phShiftPerKgAdditive: 0.15,
    methaneDecayHalfLifeHours: 4.2, // Decays rapidly if aerated
    dailyHeatingRateC: 4.5, // Heats very fast
    thermalInertiaCoeff: 0.75,
    odorLagHours: 2.5, // Odor emerges quickly if anaerobic
  },
  HOSPITAL_CANTEEN: {
    moistureGainPerLiterWater: 0.13,
    tempReboundHours: 15.0,
    phShiftPerKgAdditive: 0.18,
    methaneDecayHalfLifeHours: 5.0,
    dailyHeatingRateC: 3.2,
    thermalInertiaCoeff: 0.70,
    odorLagHours: 3.5,
  },
  COMMUNITY_GARDEN: {
    moistureGainPerLiterWater: 0.16, // High dry leaf sponge effect
    tempReboundHours: 22.0, // Slow rebound due to high carbon / low nitrogen
    phShiftPerKgAdditive: 0.22,
    methaneDecayHalfLifeHours: 6.5,
    dailyHeatingRateC: 1.8,
    thermalInertiaCoeff: 0.60,
    odorLagHours: 5.0,
  },
  MARKET_YARD: {
    moistureGainPerLiterWater: 0.08, // Already wet from vegetable rot
    tempReboundHours: 16.0,
    phShiftPerKgAdditive: 0.17,
    methaneDecayHalfLifeHours: 4.5,
    dailyHeatingRateC: 3.8,
    thermalInertiaCoeff: 0.68,
    odorLagHours: 2.0,
  },
};

const PRIOR_STRENGTH_N0 = 5; // Borrowing strength parameter for partial pooling

export class PitPersonalityService {
  /**
   * Retrieves or initializes a Pit Personality Profile with archetype priors.
   */
  public async getOrCreateProfile(
    pitId: string | Types.ObjectId,
    facilityId: string | Types.ObjectId,
    archetype: PitArchetype = 'HOTEL_KITCHEN'
  ): Promise<IPitPersonalityProfile> {
    const pitObjId = new Types.ObjectId(pitId.toString());
    const facilityObjId = new Types.ObjectId(facilityId.toString());

    let profile = await PitPersonalityProfile.findOne({ pitId: pitObjId });
    if (!profile) {
      const prior = ARCHETYPE_PRIORS[archetype];
      profile = await PitPersonalityProfile.create({
        pitId: pitObjId,
        facilityId: facilityObjId,
        archetype,
        moistureGainPerLiterWater: prior.moistureGainPerLiterWater,
        tempReboundHours: prior.tempReboundHours,
        phShiftPerKgAdditive: prior.phShiftPerKgAdditive,
        methaneDecayHalfLifeHours: prior.methaneDecayHalfLifeHours,
        dailyHeatingRateC: prior.dailyHeatingRateC,
        thermalInertiaCoeff: prior.thermalInertiaCoeff,
        odorLagHours: prior.odorLagHours,
        observedInterventionsCount: 0,
        confidencePct: 45,
        status: 'EXPERIMENTAL',
        normalBands: {
          targetTempMin: 52,
          targetTempMax: 65,
          targetMoistureMin: 45,
          targetMoistureMax: 60,
          nominalMethaneMax: 220,
        },
      });
    }

    return profile;
  }

  /**
   * Updates pit personality using Bayesian partial pooling when an intervention is observed.
   */
  public async recordInterventionAndLearn(
    pitId: string | Types.ObjectId,
    facilityId: string | Types.ObjectId,
    data: ObservedInterventionData
  ): Promise<IPitPersonalityProfile> {
    const profile = await this.getOrCreateProfile(pitId, facilityId);
    const prior = ARCHETYPE_PRIORS[profile.archetype];

    const currentN = profile.observedInterventionsCount;
    const newN = currentN + 1;
    const w = newN / (newN + PRIOR_STRENGTH_N0); // Empirical weight

    // 1. Partial pooling for temperature rebound hours
    if (data.hoursToTempRebound && data.hoursToTempRebound > 0) {
      const updatedRebound = (1 - w) * prior.tempReboundHours + w * data.hoursToTempRebound;
      
      // Detect personality drift: if observed rebound deviates > 60% from established baseline
      if (currentN >= 5 && Math.abs(data.hoursToTempRebound - profile.tempReboundHours) > 8.0) {
        profile.status = 'DRIFT_DETECTED';
        profile.lastDriftDetectedAt = new Date();
        profile.driftExplanation = `Temperature rebound took ${data.hoursToTempRebound}h vs normal ${profile.tempReboundHours.toFixed(1)}h. Possible waste mix change (dry bulking deficit or aeration pipe blockage).`;
      }

      profile.tempReboundHours = Number(updatedRebound.toFixed(1));
    }

    // 2. Partial pooling for moisture gain per litre
    if (data.measuredInputAmount && data.moistureBeforePct !== undefined && data.moistureAfterPct !== undefined) {
      const deltaMoisture = Math.max(0, data.moistureAfterPct - data.moistureBeforePct);
      const observedGainPerL = deltaMoisture / Math.max(1, data.measuredInputAmount);
      const updatedGain = (1 - w) * prior.moistureGainPerLiterWater + w * observedGainPerL;
      profile.moistureGainPerLiterWater = Number(updatedGain.toFixed(3));
    }

    // 3. Partial pooling for methane decay half-life
    if (data.methaneHalfLifeHoursObserved && data.methaneHalfLifeHoursObserved > 0) {
      const updatedHalfLife = (1 - w) * prior.methaneDecayHalfLifeHours + w * data.methaneHalfLifeHoursObserved;
      profile.methaneDecayHalfLifeHours = Number(updatedHalfLife.toFixed(1));
    }

    profile.observedInterventionsCount = newN;
    profile.confidencePct = Math.min(95, Math.round(45 + newN * 3.5));

    if (newN >= 8 && profile.status !== 'DRIFT_DETECTED') {
      profile.status = 'MATURE';
    }

    profile.lastUpdated = new Date();
    await profile.save();
    return profile;
  }
}

export const pitPersonalityService = new PitPersonalityService();
