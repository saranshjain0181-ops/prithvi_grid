import test from 'node:test';
import assert from 'node:assert/strict';
import { dayCloseService } from '../src/services/day-close.service.js';
import { sopStudioService } from '../src/services/sop-studio.service.js';
import { threadService } from '../src/services/thread.service.js';
import { wallboardService } from '../src/services/wallboard.service.js';
import { configStoreService } from '../src/services/config-store.service.js';

test('Phase 15: Vol 2 Wave 3 — Discipline & Operational Workflows Tests', async (t) => {
  await t.test('Feature 17: Day Close and Variance Review', () => {
    // 1. Clean end-of-day checklist with all criteria satisfied
    const cleanClose = dayCloseService.evaluateDayClose({
      allPitsCovered: true,
      toolsReturnedAndLocked: true,
      waterTapsLocked: true,
      leachateSumpChecked: true,
      scaleCalibrationVerified: true,
      totalIntakeMassKg: 650,
      unverifiedTasksCount: 0,
    });

    assert.equal(cleanClose.canCloseCleanly, true);
    assert.equal(cleanClose.status, 'SUBMITTED');
    assert.equal(cleanClose.variances.length, 0);
    assert.match(cleanClose.summaryMessage, /सफलतापूर्वक पूर्ण हुआ/);

    // 2. Unclean checklist with open pits, unlocked taps, and 2 unverified tasks
    const dirtyClose = dayCloseService.evaluateDayClose({
      allPitsCovered: false, // Tarpaulins not tied down
      toolsReturnedAndLocked: true,
      waterTapsLocked: false, // Hose running
      leachateSumpChecked: true,
      scaleCalibrationVerified: true,
      totalIntakeMassKg: 650,
      unverifiedTasksCount: 2,
    });

    assert.equal(dirtyClose.canCloseCleanly, false);
    assert.equal(dirtyClose.status, 'VARIANCE_FLAGGED');
    assert.equal(dirtyClose.variances.length, 3);
    assert.match(dirtyClose.summaryMessage, /3 भिन्नता\/त्रुटियाँ पाई गईं/);
  });

  await t.test('Feature 16: SOP Studio with Versioned Adherence', () => {
    const turningSopSteps = [
      { stepIndex: 1, title: 'Inspect moisture', description: 'Hand test', estimatedMinutes: 5 },
      { stepIndex: 2, title: 'Peel outer crust', description: 'Remove top 15cm', estimatedMinutes: 10 },
      { stepIndex: 3, title: 'Turn core', description: 'Exchange center with edges', estimatedMinutes: 15 },
      { stepIndex: 4, title: 'Rebuild conical stack', description: 'Shape pile', estimatedMinutes: 10 },
    ];

    // 1. Fully adherent task (all 4 steps completed in 35 mins)
    const adherent = sopStudioService.evaluateAdherence({
      sopSteps: turningSopSteps,
      executedStepIndices: [1, 2, 3, 4],
      actualDurationMinutes: 35,
    });

    assert.equal(adherent.isAdherent, true);
    assert.equal(adherent.adherencePercentage, 100);
    assert.equal(adherent.missingSteps.length, 0);

    // 2. Non-adherent rushed task (only step 1 and 2 completed in 4 mins)
    const nonAdherent = sopStudioService.evaluateAdherence({
      sopSteps: turningSopSteps,
      executedStepIndices: [1, 2],
      actualDurationMinutes: 4, // Too fast!
    });

    assert.equal(nonAdherent.isAdherent, false);
    assert.equal(nonAdherent.adherencePercentage, 50);
    assert.ok(nonAdherent.missingSteps.includes(3));
    assert.ok(nonAdherent.missingSteps.includes(4));
    assert.match(nonAdherent.evaluationNotes, /अपर्याप्त पालन/);
  });

  await t.test('Feature 19: Contextual Threads with Instant Domain Translation', () => {
    // 1. Hindi text translated to English with composting domain terms
    const hiInput = 'aaj subah pit 3 ko palat diya aur kachra parat par pani chhidka';
    const toEn = threadService.translateText(hiInput, 'hi');

    assert.equal(toEn.targetLang, 'en');
    assert.match(toEn.translatedText, /turned/);
    assert.match(toEn.translatedText, /water/);
    assert.match(toEn.translatedText, /sprinkled/);

    // 2. English text translated to Hindi with domain terms
    const enInput = 'Please check the turning and odor of the wet waste pile';
    const toHi = threadService.translateText(enInput, 'en');

    assert.equal(toHi.targetLang, 'hi');
    assert.match(toHi.translatedText, /पलटाई/);
    assert.match(toHi.translatedText, /बदबू/);
  });

  await t.test('Feature 21: Yard Wallboard and Kiosk Worker PIN Authentication', () => {
    const pin = '4821';
    const pinHash = wallboardService.hashPin(pin);

    const workerProfile = {
      workerId: 'WRK-001',
      name: 'Ramesh Kumar',
      avatarIcon: 'avatar_sweeper_01',
      pinHash,
    };

    // 1. Correct PIN verifies instantly (<1ms)
    assert.equal(wallboardService.verifyWorkerPin(workerProfile, '4821'), true);

    // 2. Incorrect PIN rejected
    assert.equal(wallboardService.verifyWorkerPin(workerProfile, '0000'), false);

    // 3. Layout validation
    const validLayout = wallboardService.evaluateLayout(['TODAY_PLAN', 'PIT_HEATMAP', 'WEATHER_RADAR']);
    assert.equal(validLayout.isValid, true);

    const emptyLayout = wallboardService.evaluateLayout([]);
    assert.equal(emptyLayout.isValid, false);
    assert.match(emptyLayout.warnings[0], /At least one widget/);
  });

  await t.test('Feature 24: Configuration Time Machine Store & Key-Value Diff Engine', () => {
    const v1Config = {
      alertThresholdTempC: 55,
      minTurningIntervalDays: 4,
      waterDosingRatio: 0.15,
    };

    const v2Config = {
      alertThresholdTempC: 60, // modified
      minTurningIntervalDays: 4, // unchanged
      // waterDosingRatio removed
      odorBufferMeters: 25, // added
    };

    const v1Json = configStoreService.canonicalJson(v1Config);
    const v2Json = configStoreService.canonicalJson(v2Config);

    // 1. Canonical JSON produces deterministic output
    assert.ok(v1Json.includes('"alertThresholdTempC":55'));

    // 2. Signature verification
    const sig = configStoreService.computeSignature({
      configKey: 'FACILITY_THRESHOLDS',
      scope: 'FACILITY',
      scopeId: 'FAC-DELHI-SOUTH',
      version: 1,
      configJson: v1Json,
      modifiedBy: 'USR-ADMIN',
    });
    assert.equal(typeof sig, 'string');
    assert.equal(sig.length, 64); // SHA-256 hex length

    // 3. Diff Engine calculates exact additions, modifications, and removals
    const diffs = configStoreService.computeDiff(v1Json, v2Json);

    const modified = diffs.find((d) => d.path === 'alertThresholdTempC');
    const added = diffs.find((d) => d.path === 'odorBufferMeters');
    const removed = diffs.find((d) => d.path === 'waterDosingRatio');

    assert.ok(modified);
    assert.equal(modified.changeType, 'MODIFIED');
    assert.equal(modified.previousValue, 55);
    assert.equal(modified.currentValue, 60);

    assert.ok(added);
    assert.equal(added.changeType, 'ADDED');
    assert.equal(added.currentValue, 25);

    assert.ok(removed);
    assert.equal(removed.changeType, 'REMOVED');
  });
});
