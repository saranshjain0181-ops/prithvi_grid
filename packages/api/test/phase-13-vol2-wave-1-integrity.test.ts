import test from 'node:test';
import assert from 'node:assert/strict';
import { equipmentRegisterService } from '../src/services/equipment-register.service.js';
import { nodeCareService } from '../src/services/node-care.service.js';
import { dataCorrectionService } from '../src/services/data-correction.service.js';
import { siteMapService } from '../src/services/site-map.service.js';

test('Phase 13: Vol 2 Wave 1 — Integrity & Margin Quick Wins Tests', async (t) => {
  await t.test('Feature 15: Tools, Equipment and Scale Calibration Register', () => {
    // 1. Passing calibration check with 10kg reference block (15g error <= 50g tolerance)
    const passResult = equipmentRegisterService.evaluateScaleCheck({
      referenceWeightGrams: 10000,
      observedWeightGrams: 10015,
      maxToleranceGrams: 50,
    });

    assert.equal(passResult.status, 'PASS');
    assert.equal(passResult.isVerified, true);
    assert.equal(passResult.errorGrams, 15);
    assert.equal(passResult.toleranceAllowedGrams, 50);

    // 2. Scale gate allows weighment on verified scale
    const gatePass = equipmentRegisterService.evaluateWeighmentGate({
      scaleStatus: 'ACTIVE',
      dailyCheckRequired: true,
      lastCheckStatus: 'PASS',
      lastCheckDate: '2026-10-24',
      targetDate: '2026-10-24',
      errorGrams: 15,
      toleranceAllowedGrams: 50,
    });
    assert.equal(gatePass.canWeigh, true);

    // 3. Failing calibration check with drifted scale (85g error > 50g tolerance)
    const failResult = equipmentRegisterService.evaluateScaleCheck({
      referenceWeightGrams: 10000,
      observedWeightGrams: 10085,
      maxToleranceGrams: 50,
    });

    assert.equal(failResult.status, 'FAIL');
    assert.equal(failResult.isVerified, false);
    assert.equal(failResult.errorGrams, 85);
    assert.match(failResult.message, /AUDIT-GATE-FAIL/);

    // 4. Scale gate blocks weighment on drifted/failed scale
    const gateFail = equipmentRegisterService.evaluateWeighmentGate({
      scaleStatus: 'MAINTENANCE_REQUIRED',
      dailyCheckRequired: true,
      lastCheckStatus: 'FAIL',
      lastCheckDate: '2026-10-24',
      targetDate: '2026-10-24',
      errorGrams: 85,
      toleranceAllowedGrams: 50,
    });
    assert.equal(gateFail.canWeigh, false);
    assert.match(gateFail.reason, /flagged as MAINTENANCE_REQUIRED/);
  });

  await t.test('Feature 22: Node Care Rounds, Client-Side Light Maintenance (₹750 Truck-Roll Avoidance)', () => {
    // 1. Worker clears compost crust on LTC3108 TEG heat-sink fins
    const roundResult = nodeCareService.evaluateCareRound({
      checklist: {
        heatsinkFinsCleaned: true,
        opticalWindowWiped: true,
        referenceJunctionDesalted: true,
        cableGlandsTightened: true,
        physicalSpearVertical: true,
        tamperSealIntact: true,
      },
      telemetryBefore: { tegDeltaTC: 2.5, voltageMv: 4100 },
      telemetryAfter: { tegDeltaTC: 3.5, voltageMv: 4250 },
    });

    assert.equal(roundResult.truckRollAvoided, true);
    assert.equal(roundResult.costSavedInr, 750);
    assert.equal(roundResult.harvestReboundPercent, 40); // (3.5 - 2.5) / 2.5 = 40%
    assert.equal(roundResult.escalationNeeded, false);
    assert.match(roundResult.feedbackMessage, /NEEDS-NATIVE-REVIEW/);

    // 2. Physical spear damage or broken tamper seal forces escalation to field technician
    const damagedRound = nodeCareService.evaluateCareRound({
      checklist: {
        heatsinkFinsCleaned: true,
        opticalWindowWiped: true,
        referenceJunctionDesalted: true,
        cableGlandsTightened: false,
        physicalSpearVertical: false, // bent/hit by fork
        tamperSealIntact: false, // seal broken
      },
      telemetryBefore: { tegDeltaTC: 2.0, voltageMv: 3800 },
      telemetryAfter: { tegDeltaTC: 2.0, voltageMv: 3800 },
    });

    assert.equal(damagedRound.escalationNeeded, true);
    assert.equal(damagedRound.truckRollAvoided, false);
    assert.equal(damagedRound.costSavedInr, 0);
    assert.match(damagedRound.feedbackMessage, /री-कमीशनिंग हेतु सूचित/);
  });

  await t.test('Feature 18: Correction Requests and Maker-Checker Audit Separation', () => {
    // 1. Maker creates a proposal for typo correction with deterministic SHA-256 hash
    const proposal = dataCorrectionService.createCorrectionProposal({
      entityId: 'ENT-VOL2',
      facilityId: 'FAC-DELHI-SOUTH',
      targetCollection: 'LabourExecutionLedger',
      targetRecordId: 'REC-LABOUR-9812',
      fieldName: 'wasteWeightKg',
      originalValue: 500,
      proposedValue: 50,
      reason: 'Entered extra zero on keypad',
      makerUserId: 'USR-RAMESH',
    });

    assert.equal(proposal.status, 'PENDING');
    assert.ok(proposal.auditHash);
    assert.equal(proposal.version, 1);

    // 2. Maker attempts to review/approve their own correction -> Must throw audit violation!
    assert.throws(() => {
      dataCorrectionService.evaluateReview({
        makerUserId: 'USR-RAMESH',
        checkerUserId: 'USR-RAMESH', // Same!
        currentStatus: proposal.status,
        desiredStatus: 'APPROVED',
      });
    }, /AUDIT-VIOLATION/);

    // 3. Independent supervisor approves correction
    const reviewResult = dataCorrectionService.evaluateReview({
      makerUserId: 'USR-RAMESH',
      checkerUserId: 'USR-SUPERVISOR-ANITA',
      currentStatus: proposal.status,
      desiredStatus: 'APPROVED',
    });

    assert.equal(reviewResult.allowed, true);
    assert.equal(reviewResult.status, 'APPROVED');

    // 4. Data Coverage calendar status evaluation
    assert.equal(
      dataCorrectionService.evaluateDayCoverage({ telemetryUptimePercent: 85, labourTasksCount: 2 }),
      'COMPLETE'
    );
    assert.equal(
      dataCorrectionService.evaluateDayCoverage({ telemetryUptimePercent: 40, labourTasksCount: 0 }),
      'PARTIAL'
    );
    assert.equal(
      dataCorrectionService.evaluateDayCoverage({ telemetryUptimePercent: 0, labourTasksCount: 0 }),
      'MISSING'
    );
  });

  await t.test('Feature 14: Digital Site Map & Sensitive Zone Buffer Checks', () => {
    const mockNodes = [
      { nodeId: 'NODE-P1', pitId: 'PIT-01', xMeters: 52, yMeters: 20, label: 'Active Pit 1' },
      { nodeId: 'NODE-P2', pitId: 'PIT-02', xMeters: 85, yMeters: 70, label: 'Curing Pit 2' },
    ];

    const mockZones = [
      {
        zoneId: 'ZONE-DINING',
        name: 'Hotel Open-Air Dining Terrace',
        type: 'SENSITIVE_ZONE_HOTEL_GUEST' as const,
        xMeters: 50,
        yMeters: 10,
        widthMeters: 20,
        heightMeters: 15,
        odorBufferMeters: 25, // 25m required buffer
      },
    ];

    // 1. Walking distance calculation between pits
    const walkingDistance = siteMapService.calculatePathDistance(mockNodes, ['NODE-P1', 'NODE-P2']);
    assert.equal(walkingDistance, 59.9); // dx=33, dy=50 -> sqrt(33^2+50^2) = 59.9m

    // 2. Sensitive zone odor buffer breach evaluation
    const alerts = siteMapService.evaluateBufferZones(mockZones, mockNodes);
    const pit1Alert = alerts.find((a) => a.pitId === 'PIT-01');
    const pit2Alert = alerts.find((a) => a.pitId === 'PIT-02');

    assert.ok(pit1Alert);
    assert.equal(pit1Alert.isBreached, true); // 10.2m < 25m
    assert.ok(pit2Alert);
    assert.equal(pit2Alert.isBreached, false); // ~69.4m >= 25m
  });
});
