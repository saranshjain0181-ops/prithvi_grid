export interface WorkforceForecast {
  projectedDailyWetWasteTons: number;
  activePitsCount: number;
  totalWorkMinutes: number;
  totalWithFatigueMinutes: number;
  requiredFteSweepers: number;
  requiredFteOperators: number;
  requiredFteSupervisors: number;
  totalRequiredFte: number;
  scheduledHeadcount: number;
  varianceFte: number; // scheduled - required
  fatigueRisk: boolean;
  recommendations: string[];
}

export class LabourStandardsService {
  /**
   * Deterministically calculates required workforce based on standard task times and waste load
   */
  forecastWorkforce(params: {
    dailyWetWasteTons: number;
    activePitsCount: number;
    scheduledHeadcount: number;
    shredderUsed?: boolean;
    fatigueAllowancePct?: number; // default 15%
  }): WorkforceForecast {
    const tons = Math.max(0.5, params.dailyWetWasteTons);
    const fatigueMultiplier = 1 + (params.fatigueAllowancePct ?? 15) / 100;

    // Standard task durations (minutes)
    const sortingMinutes = tons * 20; // 20m per ton
    const shredderMinutes = (params.shredderUsed !== false) ? tons * 30 : 0; // 30m per ton
    const turningMinutes = params.activePitsCount * 25; // 25m per active pit turn
    const wateringMinutes = params.activePitsCount * 10; // 10m per pit watering
    const yardHousekeepingMinutes = 60; // 1 hour flat daily

    const totalRawMinutes = sortingMinutes + shredderMinutes + turningMinutes + wateringMinutes + yardHousekeepingMinutes;
    const totalWithFatigueMinutes = Math.round(totalRawMinutes * fatigueMultiplier);

    // 1 Full-time Worker = 390 productive minutes/day (6.5 net hours)
    const netDayMinutes = 390;

    // Sweeper / General Labour: sorting, turning, watering, housekeeping
    const sweeperMinutes = (sortingMinutes + turningMinutes + wateringMinutes + yardHousekeepingMinutes) * fatigueMultiplier;
    const requiredFteSweepers = Math.max(1, Math.ceil(sweeperMinutes / netDayMinutes));

    // Machinery Operators: shredder, trommel
    const operatorMinutes = shredderMinutes * fatigueMultiplier;
    const requiredFteOperators = shredderMinutes > 0 ? Math.max(1, Math.ceil(operatorMinutes / netDayMinutes)) : 0;

    // Supervisors: 1 per 8 workers or min 1
    const totalSubordinateFte = requiredFteSweepers + requiredFteOperators;
    const requiredFteSupervisors = Math.max(1, Math.ceil(totalSubordinateFte / 8));

    const totalRequiredFte = requiredFteSweepers + requiredFteOperators + requiredFteSupervisors;
    const varianceFte = params.scheduledHeadcount - totalRequiredFte;
    const fatigueRisk = varianceFte < 0; // Understaffed causes burnout

    const recommendations: string[] = [];
    if (fatigueRisk) {
      recommendations.push(`श्रम की कमी: अपेक्षित कार्यभार हेतु ${totalRequiredFte} कर्मचारियों की आवश्यकता है जबकि रोस्टर में केवल ${params.scheduledHeadcount} हैं। थकावट व चोट का जोखिम। [EXPERT-REVIEW] [NEEDS-NATIVE-REVIEW]`);
    } else if (varianceFte > 3) {
      recommendations.push(`अतिरिक्त कर्मचारी (${varianceFte} FTE सरप्लस)। कार्य आवंटन को अनुकूलित करें। [NEEDS-NATIVE-REVIEW]`);
    } else {
      recommendations.push('श्रम बल संतुलन इष्टतम है। रोस्टर और कार्यभार पूर्णतः संरेखित हैं। [NEEDS-NATIVE-REVIEW]');
    }

    return {
      projectedDailyWetWasteTons: tons,
      activePitsCount: params.activePitsCount,
      totalWorkMinutes: totalRawMinutes,
      totalWithFatigueMinutes,
      requiredFteSweepers,
      requiredFteOperators,
      requiredFteSupervisors,
      totalRequiredFte,
      scheduledHeadcount: params.scheduledHeadcount,
      varianceFte,
      fatigueRisk,
      recommendations,
    };
  }
}

export const labourStandardsService = new LabourStandardsService();
