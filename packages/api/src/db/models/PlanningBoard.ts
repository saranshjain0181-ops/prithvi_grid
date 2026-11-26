/**
 * Prithvi-Grid Innovation Playbook Volume 5 — Feature 19
 * Integrated Operations Planning Board
 * Multi-horizon resource reconciliation: demand, pits, labour, bulking inventory, money and compliance.
 */

export interface PlanConstraintGaps {
  weekNumber: number;
  startDate: string;
  demandForecastKg: number;
  pitCapacityKg: number;
  pitCapacityGapKg: number; // positive if deficit
  labourHoursRequired: number;
  labourHoursRostered: number;
  labourDeficitHours: number;
  bulkingDaysOfCover: number;
  hasBulkingStockoutRisk: boolean;
  complianceDueItems: string[];
}

export interface PlanRemedy {
  remedyId: string;
  weekNumber: number;
  constraintType: 'PIT_CAPACITY' | 'LABOUR' | 'BULKING_MATERIAL';
  actionProposed: string;
  estimatedCostInr: number;
  status: 'PROPOSED' | 'APPROVED' | 'REJECTED';
}

export interface OperationsPlanningBoardView {
  tenantId: string;
  facilityId: string;
  asOfDate: string;
  executionWeeks: PlanConstraintGaps[];
  unresolvedConstraintWeeksCount: number;
  planHealthStatus: 'HEALTHY' | 'CONSTRAINED' | 'CRITICAL_BOTTLENECK';
  activeRemedies: PlanRemedy[];
}
