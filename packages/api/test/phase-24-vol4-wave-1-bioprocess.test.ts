import test from 'node:test';
import assert from 'node:assert/strict';
import { phaseEngineService } from '../src/services/phase-engine.service.js';
import { heatBalanceService } from '../src/services/heat-balance.service.js';
import { thermalLethalityService } from '../src/services/thermal-lethality.service.js';
import { alarmLadderService } from '../src/services/alarm-ladder.service.js';
import { bioprocessBoardService } from '../src/services/bioprocess-board.service.js';

test('Wave 1 Bioprocess: Feature 1 - Composting Phase Engine', () => {
  // 1. Initial ignition check - normal thermophilic rise
  const thermoEval = phaseEngineService.evaluatePhase({
    daysSinceLoading: 5,
    coreTempC: 58,
    ambientTempC: 28,
    accumulatedDegreeHours: 400,
    previousPhase: 'LOADING_INITIATION',
  });
  assert.equal(thermoEval.currentPhase, 'THERMOPHILIC');
  assert.equal(thermoEval.reducedDisturbanceActive, false);
  assert.equal(thermoEval.stageIcon, '🔥');

  // 2. Curing phase - reduced disturbance must be active
  const curingEval = phaseEngineService.evaluatePhase({
    daysSinceLoading: 25,
    coreTempC: 38,
    ambientTempC: 28,
    accumulatedDegreeHours: 1200,
    previousPhase: 'COOLING_TRANSITION',
  });
  assert.equal(curingEval.currentPhase, 'CURING_MATURATION');
  assert.equal(curingEval.reducedDisturbanceActive, true);
  assert.ok(curingEval.actionRecommendationHindi.includes('Reduced Disturbance Active'));

  // 3. Cold Start Failure exception
  const coldStartEval = phaseEngineService.evaluatePhase({
    daysSinceLoading: 4,
    coreTempC: 30,
    ambientTempC: 29, // did not rise
    accumulatedDegreeHours: 50,
    previousPhase: 'LOADING_INITIATION',
  });
  assert.equal(coldStartEval.exceptionState, 'COLD_START_FAILURE');
  assert.equal(coldStartEval.isOffTrajectory, true);
});

test('Wave 1 Bioprocess: Feature 2 - Heat Balance & Overheat Response Planner', () => {
  // 1. Routine overheat response - step watering & cover loosening
  const plan = heatBalanceService.evaluateHeatBalance({
    pitId: 'PIT-101',
    pileMassKg: 2000,
    coreTempC: 68,
    ambientTempC: 32,
    moisturePct: 40, // drying
    pileHeightMeters: 1.6,
  });

  assert.equal(plan.planStatus, 'ACTIVE');
  assert.equal(plan.isFireRiskBranch, false);
  assert.ok(plan.steps.length >= 2);
  assert.equal(plan.steps[0].actionType, 'LOOSEN_OR_REMOVE_COVER');
  assert.equal(plan.steps.find((s) => s.actionType === 'MEASURED_STEP_WATERING')?.waterQuantityLiters, 80);

  // 2. Fire Risk Emergency Branch - smoke reported
  const firePlan = heatBalanceService.evaluateHeatBalance({
    pitId: 'PIT-102',
    pileMassKg: 5000,
    coreTempC: 75,
    ambientTempC: 38,
    moisturePct: 28,
    isSmokeOrBurningReported: true,
  });

  assert.equal(firePlan.planStatus, 'ESCALATED_FIRE_RISK');
  assert.equal(firePlan.isFireRiskBranch, true);
  assert.ok(firePlan.emergencyInstructions?.includes('आपातकालीन सुरक्षा चेतावनी'));
  assert.ok(firePlan.emergencyInstructions?.includes('[LEGAL-REVIEW]'));
});

test('Wave 1 Bioprocess: Feature 3 - Thermal Lethality Ledger', () => {
  // 1. Criteria Met evaluation
  const passLethality = thermalLethalityService.evaluateLethality({
    consecutiveHoursAbove55C: 78,
    totalTurningsInHotPhase: 3,
    coldSpotAdjustmentC: -2.5,
    isMappingDataAvailable: true,
  });

  assert.equal(passLethality.criteriaResult, 'CRITERIA_MET');
  assert.equal(passLethality.evidenceStrength, 'STRONG');
  assert.ok(passLethality.indicativeLogReductionRange.lowEstimateLog > 3);
  assert.ok(passLethality.auditCaveat.includes('DOES NOT confer legal immunity'));

  // 2. Closure violation reset
  const violatedLethality = thermalLethalityService.evaluateLethality({
    consecutiveHoursAbove55C: 80,
    totalTurningsInHotPhase: 3,
    freshWasteAddedAfterClosure: true,
  });

  assert.equal(violatedLethality.criteriaResult, 'CRITERIA_NOT_MET');
  assert.equal(violatedLethality.isClosureViolated, true);
  assert.equal(violatedLethality.evidenceStrength, 'WEAK');
});

test('Wave 1 Bioprocess: Feature 4 - Alarm Ladder & Quiet Zones', () => {
  // 1. Quiet Zone suppresses buzzer and uses voice call
  const quietStep = alarmLadderService.evaluateLadderStep({
    alarmId: 'ALM-01',
    alarmType: 'ANAEROBIC_ODOR',
    severity: 'CRITICAL',
    minutesUnacknowledged: 130, // exceeds 120m -> normally buzzer
    isInQuietZone: true,
    quietZoneName: 'Hospital Pediatric Ward',
  });

  assert.equal(quietStep.isBuzzerAllowed, false);
  assert.equal(quietStep.isQuietZoneSuppressed, true);
  assert.equal(quietStep.nextStep, 'VOICE_CALL_ONCALL');

  // 2. Fire risk overrides quiet zone
  const fireStep = alarmLadderService.evaluateLadderStep({
    alarmId: 'ALM-02',
    alarmType: 'FIRE_RISK',
    severity: 'EMERGENCY_SAFETY',
    minutesUnacknowledged: 130,
    isInQuietZone: true,
  });

  assert.equal(fireStep.isBuzzerAllowed, true);
  assert.equal(fireStep.piezoPattern, 'CONTINUOUS_SIREN');

  // 3. Remote silence restriction on fire risk
  const silenceAttempt = alarmLadderService.applyRemoteSilence({
    alarmType: 'FIRE_RISK',
    severity: 'EMERGENCY_SAFETY',
    silencedReason: 'Trying to silence siren',
    silenceDurationMinutes: 30,
    userRole: 'FACILITY_MANAGER',
  });
  assert.equal(silenceAttempt.allowed, false);
  assert.ok(silenceAttempt.rejectedReason?.includes('SECURITY_INTERLOCK'));
});

test('Wave 1 Bioprocess: Feature 19 - Bioprocess Control Board', () => {
  const board = bioprocessBoardService.composeBoard({
    asOfDate: '2026-10-26',
    pits: [
      {
        pitId: 'PIT-01',
        batchId: 'B-01',
        phase: 'THERMOPHILIC',
        daysActive: 8,
        coreTempC: 58,
        thermalEvidenceStrength: 'STRONG',
      },
      {
        pitId: 'PIT-02',
        batchId: 'B-02',
        phase: 'CURING_MATURATION',
        daysActive: 28,
        coreTempC: 38,
        isReadyForHarvest: false,
      },
      {
        pitId: 'PIT-03',
        batchId: 'B-03',
        phase: 'THERMOPHILIC',
        daysActive: 12,
        coreTempC: 69, // running hot
      },
    ],
    storedLotsAtRiskCount: 1,
  });

  assert.equal(board.swimlane.length, 3);
  assert.equal(board.pipelineCounts.thermophilicCount, 2);
  assert.equal(board.pipelineCounts.curingCount, 1);
  // Verify Biology Needs Now generated tasks:
  assert.ok(board.needsNow.some((n) => n.actionRequired === 'LEAVE_UNDISTURBED'));
  assert.ok(board.needsNow.some((n) => n.actionRequired === 'HEAT_SPREAD'));
});
