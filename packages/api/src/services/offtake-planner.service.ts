import { IOfftakeCommitment, IOfftakePlan, OfftakePlan } from '../db/models/OfftakePlan.js';
import crypto from 'crypto';

export interface OfftakeScheduleEvaluation {
  totalAvailableKg: number;
  totalCommittedKg: number;
  uncommittedSurplusKg: number;
  fulfillmentRatePercentage: number;
  projectedRevenueInr: number;
  hasDeficit: boolean;
  advice: string;
}

export class OfftakePlannerService {
  /**
   * Deterministically evaluates offtake supply-demand balance and projected revenue
   */
  evaluateOfftakeSchedule(params: {
    availableStockKg: number;
    forecastedProductionKg: number;
    commitments: IOfftakeCommitment[];
  }): OfftakeScheduleEvaluation {
    const totalAvailableKg = params.availableStockKg + params.forecastedProductionKg;
    let totalCommittedKg = 0;
    let projectedRevenueInr = 0;

    for (const c of params.commitments) {
      if (c.status !== 'CANCELLED') {
        totalCommittedKg += c.requestedQuantityKg;
        projectedRevenueInr += c.requestedQuantityKg * c.agreedPricePerKgInr;
      }
    }

    const uncommittedSurplusKg = totalAvailableKg - totalCommittedKg;
    const fulfillmentRatePercentage =
      totalCommittedKg > 0
        ? Math.min(100, Math.round((totalAvailableKg / totalCommittedKg) * 1000) / 10)
        : 100;

    const hasDeficit = uncommittedSurplusKg < 0;

    let advice = '';
    if (hasDeficit) {
      advice = `[SUPPLY-DEFICIT] माँग (${totalCommittedKg} किग्रा) अनुमानित आपूर्ति (${totalAvailableKg} किग्रा) से अधिक है। ${Math.abs(uncommittedSurplusKg)} किग्रा का घाटा है। [NEEDS-NATIVE-REVIEW]`;
    } else if (uncommittedSurplusKg > totalAvailableKg * 0.4) {
      advice = `अधिशेष खाद उपलब्ध है (${uncommittedSurplusKg} किग्रा सरप्लस)। स्थानीय नर्सरियों या किसान सोसायटियों को पूर्व-बिक्री हेतु ऑफर भेजें। [NEEDS-NATIVE-REVIEW]`;
    } else {
      advice = `आपूर्ति और मांग का आदर्श संतुलन। अनुमानित राजस्व: ₹${projectedRevenueInr.toLocaleString('en-IN')}। [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      totalAvailableKg,
      totalCommittedKg,
      uncommittedSurplusKg,
      fulfillmentRatePercentage,
      projectedRevenueInr,
      hasDeficit,
      advice,
    };
  }

  /**
   * Creates or updates a monthly offtake plan in db
   */
  async createOfftakePlan(params: {
    entityId: string;
    facilityId: string;
    planningMonth: string;
    availableStockKg: number;
    forecastedProductionKg: number;
    commitments: IOfftakeCommitment[];
  }): Promise<{ plan: IOfftakePlan; schedule: OfftakeScheduleEvaluation }> {
    const planId = `OFF-${params.facilityId}-${params.planningMonth}`;
    const schedule = this.evaluateOfftakeSchedule({
      availableStockKg: params.availableStockKg,
      forecastedProductionKg: params.forecastedProductionKg,
      commitments: params.commitments,
    });

    const plan = await OfftakePlan.findOneAndUpdate(
      { planId },
      {
        planId,
        entityId: params.entityId,
        facilityId: params.facilityId,
        planningMonth: params.planningMonth,
        availableStockKg: params.availableStockKg,
        forecastedProductionKg: params.forecastedProductionKg,
        totalAvailableKg: schedule.totalAvailableKg,
        commitments: params.commitments,
        totalCommittedKg: schedule.totalCommittedKg,
        uncommittedSurplusKg: schedule.uncommittedSurplusKg,
        projectedRevenueInr: schedule.projectedRevenueInr,
        status: 'ACTIVE',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return { plan, schedule };
  }
}

export const offtakePlannerService = new OfftakePlannerService();
