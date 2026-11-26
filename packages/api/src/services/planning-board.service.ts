import {
  OperationsPlanningBoardView,
  PlanConstraintGaps,
  PlanRemedy,
} from '../db/models/PlanningBoard';

export class PlanningBoardService {
  public computeBoardView(params: {
    tenantId: string;
    facilityId: string;
    weeksData: {
      weekNumber: number;
      startDate: string;
      demandForecastKg: number;
      pitCapacityKg: number;
      labourHoursRequired: number;
      labourHoursRostered: number;
      bulkingDaysOfCover: number;
      complianceDueItems?: string[];
    }[];
  }): OperationsPlanningBoardView {
    const executionWeeks: PlanConstraintGaps[] = [];
    const remedies: PlanRemedy[] = [];
    let unresolvedWeeks = 0;

    for (const w of params.weeksData) {
      const pitGap = Math.max(0, w.demandForecastKg - w.pitCapacityKg);
      const labourDeficit = Math.max(0, w.labourHoursRequired - w.labourHoursRostered);
      const bulkingRisk = w.bulkingDaysOfCover < 5;

      const hasConstraint = pitGap > 0 || labourDeficit > 0 || bulkingRisk;
      if (hasConstraint) unresolvedWeeks++;

      executionWeeks.push({
        weekNumber: w.weekNumber,
        startDate: w.startDate,
        demandForecastKg: w.demandForecastKg,
        pitCapacityKg: w.pitCapacityKg,
        pitCapacityGapKg: pitGap,
        labourHoursRequired: w.labourHoursRequired,
        labourHoursRostered: w.labourHoursRostered,
        labourDeficitHours: labourDeficit,
        bulkingDaysOfCover: w.bulkingDaysOfCover,
        hasBulkingStockoutRisk: bulkingRisk,
        complianceDueItems: w.complianceDueItems || [],
      });

      if (pitGap > 0) {
        remedies.push({
          remedyId: `REM-PIT-${w.weekNumber}`,
          weekNumber: w.weekNumber,
          constraintType: 'PIT_CAPACITY',
          actionProposed: `Open temporary curing bay or reroute ${pitGap}kg via Waste Pathway Router`,
          estimatedCostInr: pitGap * 1.5,
          status: 'PROPOSED',
        });
      }

      if (labourDeficit > 0) {
        remedies.push({
          remedyId: `REM-LAB-${w.weekNumber}`,
          weekNumber: w.weekNumber,
          constraintType: 'LABOUR',
          actionProposed: `Schedule ${labourDeficit}h contractor overtime for shredding shift`,
          estimatedCostInr: labourDeficit * 250,
          status: 'PROPOSED',
        });
      }
    }

    const planHealthStatus =
      unresolvedWeeks === 0
        ? 'HEALTHY'
        : unresolvedWeeks <= 1
        ? 'CONSTRAINED'
        : 'CRITICAL_BOTTLENECK';

    return {
      tenantId: params.tenantId,
      facilityId: params.facilityId,
      asOfDate: new Date().toISOString(),
      executionWeeks,
      unresolvedConstraintWeeksCount: unresolvedWeeks,
      planHealthStatus,
      activeRemedies: remedies,
    };
  }
}
