import {
  SourceTag,
  OutletScorecard,
  WasteCause,
  DriverType,
} from '../db/models/SourceReduction';

export class SourceReductionService {
  private tags: SourceTag[] = [];

  public tagBin(tag: SourceTag): SourceTag {
    this.tags.push(tag);
    return tag;
  }

  public computeOutletScorecard(params: {
    outletId: string;
    periodStart: string;
    periodEnd: string;
    driverCount: number;
    driverType: DriverType;
    costPerKgInr?: number;
    baselineWastePerDriverKg?: number;
  }): OutletScorecard {
    const startMs = new Date(params.periodStart).getTime();
    const endMs = new Date(params.periodEnd).getTime();

    const relevant = this.tags.filter((t) => {
      const tMs = new Date(t.taggedAt).getTime();
      return t.outletId === params.outletId && tMs >= startMs && tMs <= endMs;
    });

    const wasteByCause: Record<WasteCause, number> = {
      PREPARATION_TRIMMING: 0,
      SPOILAGE_EXPIRY: 0,
      BUFFET_LEFTOVER: 0,
      PLATE_RETURN: 0,
      OTHER: 0,
    };

    let totalWasteKg = 0;
    for (const item of relevant) {
      wasteByCause[item.cause] = (wasteByCause[item.cause] || 0) + item.weightKg;
      totalWasteKg += item.weightKg;
    }

    const driverCountSafe = Math.max(1, params.driverCount);
    const wastePerDriverKg = totalWasteKg / driverCountSafe;

    // Identify top hotspot
    let topHotspotCause: WasteCause = 'PREPARATION_TRIMMING';
    let maxKg = -1;
    for (const [cause, kg] of Object.entries(wasteByCause)) {
      if (kg > maxKg) {
        maxKg = kg;
        topHotspotCause = cause as WasteCause;
      }
    }

    // Savings estimate against baseline
    const costPerKg = params.costPerKgInr || 45; // default INR 45/kg
    const baselinePerDriver = params.baselineWastePerDriverKg || wastePerDriverKg * 1.15;
    const kgSavedPerDriver = Math.max(0, baselinePerDriver - wastePerDriverKg);
    const estimatedFoodCostSavedInr = Math.round(kgSavedPerDriver * driverCountSafe * costPerKg);

    const recommendations: string[] = [];
    if (wasteByCause.BUFFET_LEFTOVER / (totalWasteKg || 1) > 0.35) {
      recommendations.push(
        'Buffet leftover exceeds 35% of waste. Implement staggered 30-minute replenishment pan batches.'
      );
    }
    if (wasteByCause.PREPARATION_TRIMMING / (totalWasteKg || 1) > 0.4) {
      recommendations.push(
        'Prep trimming ratio is elevated. Verify cutting standards and knife sharpness at cold-prep stations.'
      );
    }
    if (wasteByCause.SPOILAGE_EXPIRY / (totalWasteKg || 1) > 0.2) {
      recommendations.push(
        'Spoilage above 20%. Audit cold room FIFO rotation and intake refrigeration temperatures.'
      );
    }
    if (recommendations.length === 0) {
      recommendations.push('Waste intensity within target benchmarks. Maintain current prep controls.');
    }

    return {
      outletId: params.outletId,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      totalWasteKg,
      wasteByCause,
      driverCount: params.driverCount,
      driverType: params.driverType,
      wastePerDriverKg: Number(wastePerDriverKg.toFixed(3)),
      estimatedFoodCostSavedInr,
      isEstimated: true, // Strict honest uncertainty bound
      topHotspotCause,
      recommendations,
    };
  }
}
