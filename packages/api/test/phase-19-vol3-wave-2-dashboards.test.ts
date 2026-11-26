import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardComposerService } from '../src/services/dashboard-composer.service.js';
import { facilityControlRoomService } from '../src/services/facility-control-room.service.js';
import { supervisorFieldBoardService } from '../src/services/supervisor-field-board.service.js';
import { operatingCostService } from '../src/services/operating-cost.service.js';
import { clientHeadCockpitService } from '../src/services/client-head-cockpit.service.js';

test('Phase 19: Vol 3 Wave 2 — Dashboards & Daily Visibility Tests', async (t) => {
  await t.test('Feature 17: Dashboard Composer and Standard Widget Library', () => {
    // 1. Retrieve default role dashboards
    const managerDash = dashboardComposerService.getDashboardForRole('FACILITY_MANAGER');
    assert.ok(managerDash);
    assert.equal(managerDash.role, 'FACILITY_MANAGER');
    assert.ok(managerDash.widgets.length >= 2);

    const clientDash = dashboardComposerService.getDashboardForRole('CLIENT_HEAD');
    assert.ok(clientDash);
    assert.equal(clientDash.role, 'CLIENT_HEAD');

    // 2. Evaluate Data-Trust Ribbon
    const trustRibbon = dashboardComposerService.evaluateDataTrust({
      lastTelemetryReceivedAt: new Date('2026-10-25T08:00:00Z'),
      missingCheckCount: 2,
      totalExpectedChecks: 50, // 48/50 = 96% coverage
      strongClaimsCount: 40,
      totalClaimsCount: 50, // 40/50 = 80% strong evidence
    });

    assert.equal(trustRibbon.dataCoveragePercent, 96);
    assert.equal(trustRibbon.evidenceStrengthMix.strongPercent, 80);
    assert.equal(trustRibbon.evidenceStrengthMix.moderatePercent, 20);
  });

  await t.test('Feature 20: Facility Operations Control Room Time-of-Day Modes and Stage Flow', () => {
    // 1. Time of day mode transitions
    assert.equal(facilityControlRoomService.resolveTimeOfDayMode(7.5), 'MORNING_MODE');
    assert.equal(facilityControlRoomService.resolveTimeOfDayMode(13.0), 'LIVE_MODE');
    assert.equal(facilityControlRoomService.resolveTimeOfDayMode(18.5), 'EVENING_MODE');

    // 2. Stage Flow queue bottleneck detection
    const flowMetrics = facilityControlRoomService.evaluateStageFlow([
      { stageName: 'RECEIVING', workInProgressKg: 400, averageQueueHours: 0.5 },
      { stageName: 'PREPARATION', workInProgressKg: 1200, averageQueueHours: 2.8 }, // > 2.0h -> Bottleneck!
      { stageName: 'COMPOSTING', workInProgressKg: 8000, averageQueueHours: 24.0 },
      { stageName: 'CURING', workInProgressKg: 6200, averageQueueHours: 48.0 }, // > 5000kg -> Bottleneck!
      { stageName: 'FINISHING', workInProgressKg: 800, averageQueueHours: 1.0 },
    ]);

    const prep = flowMetrics.find((s) => s.stageName === 'PREPARATION');
    const cure = flowMetrics.find((s) => s.stageName === 'CURING');
    const receiving = flowMetrics.find((s) => s.stageName === 'RECEIVING');

    assert.ok(prep?.isBottleneck);
    assert.ok(cure?.isBottleneck);
    assert.equal(receiving?.isBottleneck, false);
  });

  await t.test('Feature 21: Supervisor Field Board Walk Prioritization and Approvals', () => {
    // 1. Prioritize yard stops: PIT_RISK must come first
    const prioritizedStops = supervisorFieldBoardService.prioritizeRounds([
      { locationId: 'PIT-04', targetType: 'COVER_AUDIT', reason: 'Routine cover check' },
      { locationId: 'PIT-02', targetType: 'PIT_RISK', reason: 'Methane slope rising' },
      { locationId: 'PIT-01', targetType: 'SENSE_CHECK_DUE', reason: 'Scheduled 3-day hand test' },
    ]);

    assert.equal(prioritizedStops[0].targetType, 'PIT_RISK');
    assert.equal(prioritizedStops[0].locationId, 'PIT-02');
    assert.equal(prioritizedStops[1].targetType, 'SENSE_CHECK_DUE');
    assert.equal(prioritizedStops[2].targetType, 'COVER_AUDIT');

    // 2. Filter waiting supervisor items
    const filteredApprovals = supervisorFieldBoardService.filterWaitingApprovals([
      {
        itemId: 'APPR-01',
        itemType: 'PRACTICAL_SIGNOFF',
        submittedBy: 'USR-MOHAN',
        summary: 'Watering SOP practical demonstration',
        createdAt: new Date(),
      },
      {
        itemId: 'APPR-02',
        itemType: 'SUPERVISED_WORK_OVERRIDE',
        submittedBy: 'USR-SUPERVISOR-ANITA',
        summary: 'Supervised shredder task for new worker',
        createdAt: new Date(),
      },
    ]);

    assert.equal(filteredApprovals.totalPending, 2);
    assert.equal(filteredApprovals.practicalSignoffsCount, 1);
    assert.equal(filteredApprovals.supervisedOverridesCount, 1);
  });

  await t.test('Feature 14: Operating Cost Ledger and Problem Cost Calculation', () => {
    const costResult = operatingCostService.calculateOperatingCost({
      totalWasteProcessedKg: 10000,
      labourHoursInternal: 120, // 120 * ₹100 = ₹12,000
      contractorInvoiceCostInr: 15000,
      bulkingMaterialKg: 2000, // 2000 * ₹2.5 = ₹5,000
      waterLiters: 10000, // 10000 * ₹0.05 = ₹500
      shredderKwh: 300, // 300 * ₹8.0 = ₹2,400
      monthlyBudgetInr: 32000,
      crashIncidentsCount: 1, // 3 * ₹100 + ₹300 = ₹600
      contaminationSortingHours: 4, // 4 * ₹100 = ₹400
    });

    // Total cost = 12000 + 15000 + 5000 + 500 + 2400 = ₹34,900
    assert.equal(costResult.totalCostInr, 34900);
    assert.equal(costResult.budgetInr, 32000);
    assert.equal(costResult.varianceInr, 2900); // ₹2,900 over budget
    assert.equal(costResult.costPerKgProcessedInr, 3.49); // ₹3.49 / kg
    assert.equal(costResult.isOverBudget, true);
    assert.equal(costResult.crashCostInr, 600);
    assert.equal(costResult.contaminationCostInr, 400);
    assert.equal(costResult.stageAllocations.length, 5);
  });

  await t.test('Feature 19: Client Head Cockpit Strategic Sections', () => {
    const sections = clientHeadCockpitService.evaluateCockpitSections({
      totalWasteDivertedKg: 12500,
      totalCompostProducedKg: 4200,
      operatingCostPerKgInr: 3.2,
      budgetVariancePct: -2.5, // under budget
      openLegalNoticesCount: 0,
      incidentsLast30DaysCount: 0,
      labourCoveragePercent: 95,
      certificationsExpiringCount: 1,
      gradeAPercent: 88,
      odorComplaintsCount: 0,
    });

    assert.equal(sections.length, 6);
    const outcomes = sections.find((s) => s.section === 'OUTCOMES');
    const money = sections.find((s) => s.section === 'MONEY');
    const risk = sections.find((s) => s.section === 'RISK_COMPLIANCE');
    const rep = sections.find((s) => s.section === 'REPUTATION');

    assert.equal(outcomes?.status, 'GREEN');
    assert.equal(money?.status, 'GREEN');
    assert.equal(risk?.status, 'GREEN');
    assert.equal(rep?.status, 'GREEN');
  });
});
