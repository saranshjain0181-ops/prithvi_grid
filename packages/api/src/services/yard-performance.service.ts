import { YardPerformanceView, LossTreeItem } from '../db/models/YardPerformance';

export class YardPerformanceService {
  public computeYardPerformance(params: {
    facilityId: string;
    periodStart: string;
    periodEnd: string;
    theoreticalCapacityKg: number;
    actualProcessedKg: number;
    plannedOperatingHours: number;
    unplannedDowntimeHours: number;
    standardRateKgPerHour: number;
    actualRateKgPerHour: number;
    reworkAndContaminationKg: number;
  }): YardPerformanceView {
    // 1. Availability: operating time / planned time
    const operatingHours = Math.max(0, params.plannedOperatingHours - params.unplannedDowntimeHours);
    const availabilityPct = Number(
      ((operatingHours / Math.max(1, params.plannedOperatingHours)) * 100).toFixed(1)
    );

    // 2. Performance: actual rate / standard rate
    const performancePct = Number(
      (
        Math.min(1.0, params.actualRateKgPerHour / Math.max(1, params.standardRateKgPerHour)) * 100
      ).toFixed(1)
    );

    // 3. Quality: (actual - rework) / actual
    const qualityFirstPassPct = Number(
      (
        Math.max(
          0,
          (params.actualProcessedKg - params.reworkAndContaminationKg) /
            Math.max(1, params.actualProcessedKg)
        ) * 100
      ).toFixed(1)
    );

    // Overall Yard Efficiency: A * P * Q
    const yardEfficiencyIndexPct = Number(
      (((availabilityPct / 100) * (performancePct / 100) * (qualityFirstPassPct / 100)) * 100).toFixed(1)
    );

    // Loss Tree Calculation
    const totalLostCapacityKg = Math.max(0, params.theoreticalCapacityKg - params.actualProcessedKg);
    const downtimeLossKg = Math.round(
      (params.unplannedDowntimeHours / Math.max(1, params.plannedOperatingHours)) *
        params.theoreticalCapacityKg
    );
    const reworkLossKg = params.reworkAndContaminationKg;
    const waitingLossKg = Math.max(0, totalLostCapacityKg - downtimeLossKg - reworkLossKg);

    const safeTotalLoss = Math.max(1, totalLostCapacityKg);

    const lossTree: LossTreeItem[] = [
      {
        cause: 'EQUIPMENT_DOWNTIME',
        capacityLostKg: downtimeLossKg,
        sharePct: Number(((downtimeLossKg / safeTotalLoss) * 100).toFixed(1)),
        primaryRemedyFeature: 'Equipment Register & Preventive NodeCare',
      },
      {
        cause: 'CONTAMINATION_REWORK',
        capacityLostKg: reworkLossKg,
        sharePct: Number(((reworkLossKg / safeTotalLoss) * 100).toFixed(1)),
        primaryRemedyFeature: 'Receiving Gate Scorecards & Kitchen Source Reduction',
      },
      {
        cause: 'WAITING_FOR_MATERIAL_OR_LABOUR',
        capacityLostKg: waitingLossKg,
        sharePct: Number(((waitingLossKg / safeTotalLoss) * 100).toFixed(1)),
        primaryRemedyFeature: 'Integrated Operations Planning Board & Orchestrator',
      },
    ];

    return {
      facilityId: params.facilityId,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      totalTheoreticalCapacityKg: params.theoreticalCapacityKg,
      actualThroughputProcessedKg: params.actualProcessedKg,
      availabilityPct,
      performancePct,
      qualityFirstPassPct,
      yardEfficiencyIndexPct,
      lossTree,
      bottleneckStage: downtimeLossKg > waitingLossKg ? 'SHREDDING' : 'SCREENING_BAGGING',
      isBenchmarkPeerComparisonAvailable: true,
    };
  }
}
