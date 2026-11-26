import test from 'node:test';
import assert from 'node:assert/strict';
import { senseCheckService } from '../src/services/sense-check.service.js';
import { paratPlannerService } from '../src/services/parat-planner.service.js';
import { waterDosingService } from '../src/services/water-dosing.service.js';
import { palatnaCoachService } from '../src/services/palatna-coach.service.js';
import { wasteAgeService } from '../src/services/waste-age.service.js';

test('Phase 14: Vol 2 Wave 2 — The Craft at the Pit Tests', async (t) => {
  await t.test('Feature 2: Sense Check, Field-Truth Capture and Hand-Test Calibration', () => {
    // 1. Normal agreement between human senses and electronic sensors
    const alignedCheck = senseCheckService.evaluateSenseCheck({
      observations: {
        squeezeTest: 'HOLDS_BALL_SHEEN', // 50-60%
        smellTest: 'EARTHY_FOREST',
        stickHeat: 'WARM_STEAMING', // 45-60C
        colour: 'DARK_BROWN_BLACK',
        texture: 'CRUMBLED',
        bioSigns: ['WHITE_ACTINOMYCETES'],
      },
      sensorCoreTempC: 56,
      sensorMoisturePct: 55,
    });

    assert.equal(alignedCheck.tempAgreement, true);
    assert.equal(alignedCheck.moistureAgreement, true);
    assert.equal(alignedCheck.driftWarning, false);
    assert.match(alignedCheck.biologicalStatusSummary, /Aerobic heap active/);

    // 2. Human vs Sensor Divergence: Human feels burning stick but probe reads 32°C
    const driftedCheck = senseCheckService.evaluateSenseCheck({
      observations: {
        squeezeTest: 'WATER_DRIPS', // >65%
        smellTest: 'SOUR_VINEGAR',
        stickHeat: 'BURNING_HOT', // >60C
        colour: 'YELLOW_GREY',
        texture: 'SLUDGE_MATTED',
        bioSigns: ['POOLING_LEACHATE'],
      },
      sensorCoreTempC: 32, // Probe reads cold!
      sensorMoisturePct: 40, // Probe reads dry!
    });

    assert.equal(driftedCheck.tempAgreement, false);
    assert.equal(driftedCheck.moistureAgreement, false);
    assert.equal(driftedCheck.driftWarning, true);
    assert.match(driftedCheck.notes, /Possible RTD probe drift/);
    assert.match(driftedCheck.biologicalStatusSummary, /Acid crash detected/);
  });

  await t.test('Feature 3: Parat Planner and Live Mix Meter', () => {
    // Layer 100 kg wet kitchen waste (80% moisture, C:N 15) with 30 kg dry sawdust (15% moisture, C:N 200)
    const recipe = paratPlannerService.calculateMixRecipe([
      {
        materialType: 'KITCHEN_WET_WASTE',
        massKg: 100,
        carbonNitrogenRatio: 15,
        moisturePercent: 80,
        bulkDensityKgPerM3: 850,
      },
      {
        materialType: 'SAWDUST',
        massKg: 30,
        carbonNitrogenRatio: 200,
        moisturePercent: 15,
        bulkDensityKgPerM3: 200,
      },
    ]);

    // Blended moisture should drop from 80% to ~65%
    assert.ok(recipe.blendedMoisturePercent < 70);
    assert.ok(recipe.blendedMoisturePercent > 60);

    // C:N ratio should balance up from 15:1 to 30:1 range
    assert.ok(recipe.blendedCnRatio >= 25);
    assert.ok(recipe.blendedCnRatio <= 35);

    // Free Air Space should be preserved
    assert.ok(recipe.freeAirSpacePercent >= 30);
    assert.ok(recipe.recommendedBucketsBulking >= 0);
  });

  await t.test('Feature 5: Water Budget and Dosing Assistant', () => {
    // 1000 kg pile at 40% moisture targeting 55%
    const plan = waterDosingService.calculateWaterDosing({
      pileMassKg: 1000,
      currentMoisturePct: 40,
      targetMoisturePct: 55,
      hoseFlowRateLpm: 15,
    });

    // Water needed is ~333 liters
    assert.ok(plan.waterNeededLiters > 300);
    assert.ok(plan.waterNeededLiters < 350);

    // High water demand (>60L) must be split into 3 absorption stages with 10 min rest to prevent leachate pooling
    assert.equal(plan.stages.length, 3);
    assert.equal(plan.stages[0].restMinutesBeforeNext, 10);
    assert.match(plan.guidanceText, /NEEDS-NATIVE-REVIEW/);

    // Pile already at 58% (>55% target) needs 0 liters
    const zeroPlan = waterDosingService.calculateWaterDosing({
      pileMassKg: 1000,
      currentMoisturePct: 58,
      targetMoisturePct: 55,
    });
    assert.equal(zeroPlan.waterNeededLiters, 0);
    assert.equal(zeroPlan.stages.length, 0);
  });

  await t.test('Feature 1: Palatna Coach, Live Guided Turning', () => {
    // 1. Thorough 15-minute turning with all 5 steps completed
    const excellentTurn = palatnaCoachService.evaluateTurningQuality({
      stepsCompleted: [
        'OUTER_LAYER_PEELED',
        'CORE_EXPOSED',
        'CENTRE_EXCHANGED',
        'PILE_RESTACKED_CONICAL',
        'MOISTURE_INSPECTED',
      ],
      durationSeconds: 900,
      telemetryDropConfirmed: true,
    });

    assert.equal(excellentTurn.qualityScore, 100);
    assert.equal(excellentTurn.qualityTier, 'EXCELLENT');
    assert.equal(excellentTurn.isAdequatelyAerated, true);
    assert.equal(excellentTurn.stepsMissing.length, 0);

    // 2. Rushed turning (<300s) misses steps and receives time penalty
    const rushedTurn = palatnaCoachService.evaluateTurningQuality({
      stepsCompleted: ['OUTER_LAYER_PEELED', 'CORE_EXPOSED'],
      durationSeconds: 120, // Only 2 mins!
    });

    assert.ok(rushedTurn.qualityScore < 50);
    assert.equal(rushedTurn.qualityTier, 'INCOMPLETE');
    assert.equal(rushedTurn.isAdequatelyAerated, false);
    assert.ok(rushedTurn.stepsMissing.includes('CENTRE_EXCHANGED'));
  });

  await t.test('Feature 4: Waste Age Clock and Holding Area Control', () => {
    const now = new Date('2026-10-24T12:00:00Z');

    // 1. Fresh waste (4 hours old)
    const freshEval = wasteAgeService.evaluateWasteAge({
      generatedAt: new Date('2026-10-24T08:00:00Z'),
      loadedAt: now,
      wasteMassKg: 200,
    });
    assert.equal(freshEval.ageHours, 4);
    assert.equal(freshEval.freshnessGrade, 'FRESH');
    assert.equal(freshEval.bufferingRecommended, false);

    // 2. Fermenting waste (18 hours old) -> dry bulking buffer recommended
    const fermentEval = wasteAgeService.evaluateWasteAge({
      generatedAt: new Date('2026-10-23T18:00:00Z'),
      loadedAt: now,
      wasteMassKg: 200,
    });
    assert.equal(fermentEval.ageHours, 18);
    assert.equal(fermentEval.freshnessGrade, 'FERMENTING');
    assert.equal(fermentEval.bufferingRecommended, true);
    assert.equal(fermentEval.dryBulkingKgRecommended, 20); // 10%

    // 3. Sour critical waste (36 hours old) -> alkaline wood ash + bulking buffer
    const sourEval = wasteAgeService.evaluateWasteAge({
      generatedAt: new Date('2026-10-23T00:00:00Z'),
      loadedAt: now,
      wasteMassKg: 200,
    });
    assert.equal(sourEval.ageHours, 36);
    assert.equal(sourEval.freshnessGrade, 'SOUR_CRITICAL');
    assert.equal(sourEval.bufferingRecommended, true);
    assert.equal(sourEval.woodAshGramsRecommended, 400); // 200g/100kg * 2 = 400g
    assert.match(sourEval.instructions, /CRITICAL-ACID-RISK/);
  });
});
