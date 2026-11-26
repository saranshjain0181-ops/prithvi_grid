import test from 'node:test';
import assert from 'node:assert/strict';
import { leachateLoopService } from '../src/services/leachate-loop.service.js';
import { pestControlService } from '../src/services/pest-control.service.js';
import { ergonomicGuardService } from '../src/services/ergonomic-guard.service.js';
import { pitTimeMachineService } from '../src/services/pit-time-machine.service.js';
import { reportStudioService } from '../src/services/report-studio.service.js';

test('Phase 17: Vol 2 Wave 5 — Environment, Welfare & Insight Tests', async (t) => {
  await t.test('Feature 6: Leachate Loop Manager & Recirculation Safety Rules', () => {
    // 1. Hot active thermophilic pit (>55°C) safely allows pure leachate recirculation
    const activeCheck = leachateLoopService.evaluateRecirculationRule({
      targetPitCoreTempC: 58.5,
      targetPitStage: 'THERMOPHILIC',
      leachateOdor: 'FERMENTED_SWEET',
    });
    assert.equal(activeCheck.isAllowed, true);
    assert.equal(activeCheck.recommendedDilution, '1:0');
    assert.match(activeCheck.reason, /उच्च तापमान रोगजनकों को नष्ट कर देगा/);

    // 2. Curing pile is strictly forbidden from leachate recirculation
    const curingCheck = leachateLoopService.evaluateRecirculationRule({
      targetPitCoreTempC: 42.0,
      targetPitStage: 'CURING',
      leachateOdor: 'FERMENTED_SWEET',
    });
    assert.equal(curingCheck.isAllowed, false);
    assert.match(curingCheck.reason, /Curing Pile.*वर्जित है/);

    // 3. Septic / anaerobic sewer leachate is forbidden without prior aeration
    const sewerCheck = leachateLoopService.evaluateRecirculationRule({
      targetPitCoreTempC: 60.0,
      targetPitStage: 'THERMOPHILIC',
      leachateOdor: 'ANAEROBIC_SEWER',
    });
    assert.equal(sewerCheck.isAllowed, false);
    assert.match(sewerCheck.reason, /एनारोबिक बदबू/);

    // 4. Horticultural landscaping liquid fertilizer dilution (1:10)
    const dilution = leachateLoopService.calculateHorticulturalDilution(50);
    assert.equal(dilution.waterLitersNeeded, 500);
    assert.equal(dilution.totalFertilizerLiters, 550);
  });

  await t.test('Feature 7: Pest and Vermin Control Workflow', () => {
    // 1. Clean facility with low pest pressure
    const cleanEval = pestControlService.evaluatePestPressure({
      stickyTrapFliesCount: 15,
      pestObservations: [],
    });
    assert.ok(cleanEval.pestPressureIndex < 10);
    assert.equal(cleanEval.pressureTier, 'LOW');
    assert.equal(cleanEval.isHygieneBreach, false);

    // 2. High pest pressure with maggots, rodent burrows, and high fly count
    const severeEval = pestControlService.evaluatePestPressure({
      stickyTrapFliesCount: 180,
      pestObservations: ['RODENT_BURROWS', 'MAGGOTS_CORE'],
    });
    assert.ok(severeEval.pestPressureIndex >= 75);
    assert.equal(severeEval.pressureTier, 'CRITICAL');
    assert.equal(severeEval.isHygieneBreach, true);
    assert.match(severeEval.recommendedIntervention, /नीम तेल का छिड़काव/);
  });

  await t.test('Feature 8: Ergonomic Load and Heat-Stress Guard', () => {
    // 1. Moderate workload in mild weather (30°C, 50% RH)
    const mildShift = ergonomicGuardService.evaluateShiftWelfare({
      tasks: [
        { taskType: 'TURNING', durationMinutes: 60 }, // 50 PLU
        { taskType: 'WHEELBARROW_HAUL', durationMinutes: 60 }, // 20 PLU = 70 PLU
      ],
      ambientTempC: 30,
      relativeHumidityPct: 50,
      maxShiftLoadUnits: 120,
    });
    assert.equal(mildShift.totalPhysicalLoadUnits, 70);
    assert.equal(mildShift.isLoadExceeded, false);
    assert.equal(mildShift.workSuspensionMandated, false);

    // 2. Extreme heat danger (44°C, 65% RH in Central India summer)
    const extremeHeatShift = ergonomicGuardService.evaluateShiftWelfare({
      tasks: [{ taskType: 'TURNING', durationMinutes: 30 }],
      ambientTempC: 44,
      relativeHumidityPct: 65,
    });
    assert.ok(extremeHeatShift.heatStressIndex >= 44);
    assert.equal(extremeHeatShift.heatCategory, 'DANGER');
    assert.equal(extremeHeatShift.workSuspensionMandated, true);
    assert.match(extremeHeatShift.workerAdvice, /CRITICAL-HEAT-STRESS/);
  });

  await t.test('Feature 20: Pit Time Machine and Side-by-Side Compare', () => {
    const pitAEvents = [
      {
        eventId: 'E1',
        eventType: 'FEEDSTOCK_LOAD' as const,
        timestamp: new Date('2026-10-01T08:00:00Z'),
        description: 'Loaded 500kg waste with dry sawdust',
      },
      {
        eventId: 'E2',
        eventType: 'TELEMETRY_SAMPLE' as const,
        timestamp: new Date('2026-10-05T08:00:00Z'),
        coreTempC: 62,
        description: 'Active thermophilic stage',
      },
      {
        eventId: 'E3',
        eventType: 'LABOUR_TURNING' as const,
        timestamp: new Date('2026-10-08T08:00:00Z'),
        description: 'Full 5-step turning completed',
      },
    ];

    const pitBEvents = [
      {
        eventId: 'E4',
        eventType: 'FEEDSTOCK_LOAD' as const,
        timestamp: new Date('2026-10-01T08:00:00Z'),
        description: 'Loaded without bulking',
      },
      {
        eventId: 'E5',
        eventType: 'TELEMETRY_SAMPLE' as const,
        timestamp: new Date('2026-10-05T08:00:00Z'),
        coreTempC: 38, // Cold pile!
        description: 'Mesophilic sluggish stage',
      },
    ];

    // 1. Build and verify sorted timeline
    const timeline = pitTimeMachineService.buildTimeline(pitAEvents);
    assert.equal(timeline.length, 3);
    assert.equal(timeline[0].eventId, 'E1');

    // 2. Compare Pit A vs Pit B
    const comparison = pitTimeMachineService.comparePits({
      pitAId: 'PIT-01',
      pitAEvents,
      pitBId: 'PIT-02',
      pitBEvents,
    });

    assert.equal(comparison.pitA.turningsCount, 1);
    assert.equal(comparison.pitB.turningsCount, 0);
    assert.ok(comparison.pitA.avgTempC > comparison.pitB.avgTempC);
    assert.ok(comparison.keyDifferences.length > 0);
  });

  await t.test('Feature 23: Metric Dictionary and Report Studio Certified Computations', () => {
    // 1. Certified Landfill Diversion metric
    const wasteMetric = reportStudioService.computeCertifiedMetric('TOTAL_WASTE_DIVERTED_KG', {
      totalWetWasteKg: 15400,
    });
    assert.equal(wasteMetric.value, 15400);
    assert.equal(wasteMetric.unit, 'kg');
    assert.equal(wasteMetric.isEstimated, false);

    // 2. Certified Carbon Offset (GHG Avoidance) with honest estimation flag
    const carbonMetric = reportStudioService.computeCertifiedMetric('CARBON_OFFSET_MTCO2E', {
      totalWetWasteKg: 15400,
    });
    // 15,400 * 0.62 / 1000 = 9.548 ~ 9.55 MTCO2e
    assert.equal(carbonMetric.value, 9.55);
    assert.equal(carbonMetric.unit, 'MTCO2e');
    assert.equal(carbonMetric.isEstimated, true); // Honest estimation flag!

    // 3. Truck rolls avoided metric
    const rollsMetric = reportStudioService.computeCertifiedMetric('TRUCK_ROLLS_AVOIDED', {
      truckRollsAvoidedCount: 8,
    });
    assert.equal(rollsMetric.value, 8);
    assert.equal(rollsMetric.isEstimated, false);
  });
});
