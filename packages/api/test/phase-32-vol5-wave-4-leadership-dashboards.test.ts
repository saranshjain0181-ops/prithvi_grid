import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PlanningBoardService } from '../src/services/planning-board.service';
import { YardPerformanceService } from '../src/services/yard-performance.service';
import { FinanceProcurementService } from '../src/services/finance-procurement.service';
import { WorkforceCockpitService } from '../src/services/workforce-cockpit.service';
import { StakeholderExperienceService } from '../src/services/stakeholder-experience.service';
import { GrowthExpansionService } from '../src/services/growth-expansion.service';

describe('Phase 32: Volume 5 Wave 4 — Six Leadership Dashboards Tests', () => {
  it('F19: Planning Board reconciles resources, detects gaps and generates remedies', () => {
    const pb = new PlanningBoardService();

    const view = pb.computeBoardView({
      tenantId: 'TENANT-HOTEL-GROUP',
      facilityId: 'FACILITY-MAIN',
      weeksData: [
        {
          weekNumber: 1,
          startDate: '2026-11-01',
          demandForecastKg: 6000,
          pitCapacityKg: 5000, // 1000kg gap!
          labourHoursRequired: 160,
          labourHoursRostered: 140, // 20h deficit!
          bulkingDaysOfCover: 8,
        },
        {
          weekNumber: 2,
          startDate: '2026-11-08',
          demandForecastKg: 4500,
          pitCapacityKg: 5000,
          labourHoursRequired: 140,
          labourHoursRostered: 140,
          bulkingDaysOfCover: 3, // < 5 days risk!
        },
      ],
    });

    assert.strictEqual(view.unresolvedConstraintWeeksCount, 2);
    assert.strictEqual(view.planHealthStatus, 'CRITICAL_BOTTLENECK');
    assert.strictEqual(view.activeRemedies.length, 2);
    assert.ok(view.activeRemedies[0].actionProposed.includes('Open temporary curing bay'));
  });

  it('F20: Yard Performance Cockpit computes OEE index, loss tree and bottlenecks', () => {
    const yp = new YardPerformanceService();

    const perf = yp.computeYardPerformance({
      facilityId: 'FACILITY-BHOPAL',
      periodStart: '2026-10-01',
      periodEnd: '2026-10-07',
      theoreticalCapacityKg: 20000,
      actualProcessedKg: 16500,
      plannedOperatingHours: 48,
      unplannedDowntimeHours: 4.8, // 90% availability
      standardRateKgPerHour: 400,
      actualRateKgPerHour: 380, // 95% performance
      reworkAndContaminationKg: 825, // 95% quality
    });

    assert.ok(perf.availabilityPct >= 89 && perf.availabilityPct <= 91);
    assert.ok(perf.performancePct >= 94 && perf.performancePct <= 96);
    assert.ok(perf.qualityFirstPassPct >= 94 && perf.qualityFirstPassPct <= 96);
    assert.ok(perf.yardEfficiencyIndexPct >= 80);
    assert.strictEqual(perf.lossTree.length, 3);
  });

  it('F21: Finance & Procurement Cockpit computes variances and generates sealed MonthEndPack', () => {
    const fp = new FinanceProcurementService();

    const fin = fp.computeFinanceView({
      tenantId: 'TENANT-APOLLO',
      facilityId: 'FACILITY-DELHI',
      month: '2026-10',
      categoriesData: [
        { category: 'LABOUR', budgetInr: 120000, actualInr: 125000 },
        { category: 'BULKING_SUPPLIES', budgetInr: 40000, actualInr: 46000 },
        { category: 'UTILITIES', budgetInr: 15000, actualInr: 14000 },
      ],
      committedSpendInr: 50000,
      openPoCount: 3,
      supplierExceptionsCount: 1,
      foodWasteSavingsInr: 180000,
      compostRevenueInr: 65000,
    });

    assert.strictEqual(fin.totalBudgetInr, 175000);
    assert.strictEqual(fin.totalActualInr, 185000);
    assert.ok(fin.latestMonthEndPack);
    assert.strictEqual(fin.latestMonthEndPack?.netFinancialBenefitInr, 60000); // (180k + 65k) - 185k
    assert.strictEqual(fin.latestMonthEndPack?.isEstimated, true);
    assert.ok(fin.latestMonthEndPack?.sealedDocumentHash.length === 64);
  });

  it('F22: Workforce Cockpit enforces privacy aggregation and identifies single points of failure', () => {
    const wf = new WorkforceCockpitService();

    const view = wf.computeWorkforceView({
      tenantId: 'TENANT-TAJ',
      facilityId: 'FACILITY-MUMBAI',
      totalHeadcount: 12,
      shiftCoverageGapsHours: 14,
      competenciesData: [
        { competency: 'SHREDDER_OPERATOR', certifiedCount: 1, expiringIn30Days: 1 }, // SPOF!
        { competency: 'FORKLIFT_DRIVER', certifiedCount: 3, expiringIn30Days: 0 },
      ],
      heatRestAdherencePct: 92,
      huddleParticipationPct: 96,
      ideasSubmittedCount: 4,
    });

    assert.strictEqual(view.isGroupPrivacyProtected, true);
    assert.strictEqual(view.competencies[0].isSinglePointOfFailure, true);
    assert.strictEqual(view.competencies[1].isSinglePointOfFailure, false);
    assert.ok(view.resilienceRiskSummary.some((r) => r.includes('single point of failure')));
  });

  it('F23: Stakeholder Experience Cockpit computes composite Experience Index and sentiment', () => {
    const se = new StakeholderExperienceService();

    const view = se.computeExperienceView({
      tenantId: 'TENANT-TOWNSHIP',
      facilityId: 'FACILITY-INDORE',
      groupsData: [
        {
          groupName: 'TOWNSHIP_RESIDENTS',
          openComplaints: 1,
          avgResponseHours: 2.5,
          pulseSatisfactionPct: 88,
          topIssue: 'Collection timing lane 4',
        },
        {
          groupName: 'FENCELINE_NEIGHBOURS',
          openComplaints: 0,
          avgResponseHours: 1.0,
          pulseSatisfactionPct: 92,
          topIssue: 'None',
        },
      ],
      noticesBroadcastedCount: 3,
      compostDistributedKg: 2400,
    });

    assert.ok(view.overallExperienceIndex >= 80);
    assert.strictEqual(view.greenBadgeStatus, 'CERTIFIED');
    assert.strictEqual(view.groups.length, 2);
  });

  it('F24: Growth Cockpit raises expansion signals on capacity bottlenecks and scores city readiness', () => {
    const ge = new GrowthExpansionService();

    const view = ge.computeGrowthView({
      activeNodesCount: 180,
      pipelineDealsCount: 24,
      conversionRatePct: 34.5,
      activePilotsCount: 8,
      pilotsAtRiskCount: 1,
      capacityExhaustionTenants: [
        { tenantId: 'TENANT-APOLLO-CHENNAI', facilityId: 'FACILITY-MAIN', runwayWeeks: 2.5 },
      ],
      citiesData: [
        {
          cityName: 'Pune',
          catalogueMapped: true,
          labPartnerOnboarded: true,
          installerTrained: true,
          anchorClients: 2,
        },
        {
          cityName: 'Nagpur',
          catalogueMapped: true,
          labPartnerOnboarded: false,
          installerTrained: false,
          anchorClients: 0,
        },
      ],
      grossMarginPerNodeInr: 580,
    });

    assert.strictEqual(view.expansionSignals.length, 1);
    assert.strictEqual(view.expansionSignals[0].signalType, 'CAPACITY_EXHAUSTION_SOON');
    assert.strictEqual(view.citiesReadiness[0].launchStatus, 'READY_TO_LAUNCH');
    assert.strictEqual(view.citiesReadiness[0].overallReadinessPct, 100);
    assert.strictEqual(view.citiesReadiness[1].launchStatus, 'SCOPING');
  });
});
