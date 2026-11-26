import test from 'node:test';
import assert from 'node:assert/strict';
import { pileGeometryService } from '../src/services/pile-geometry.service.js';
import { coverBiofilterService } from '../src/services/cover-biofilter.service.js';
import { receivingGateService } from '../src/services/receiving-gate.service.js';
import { preProcessingService } from '../src/services/preprocessing.service.js';
import { pileMappingService } from '../src/services/pile-mapping.service.js';

test('Wave 3 Craft: Feature 5 - Pile Geometry & Aeration Designer', () => {
  const result = pileGeometryService.evaluateGeometry({
    shape: 'TRAPEZOIDAL_WINDROW',
    lengthMeters: 20,
    baseWidthMeters: 3,
    topWidthMeters: 1,
    heightMeters: 1.5,
    aerationType: 'PASSIVE_CHIMNEY',
    chimneySpacingMeters: 4,
  });

  assert.equal(result.volumeCubicMeters, 60); // ((3 + 1)/2)*1.5 * 20 = 2 * 1.5 * 20 = 60
  assert.equal(result.isChimneyAdequate, false); // spacing > 3m triggers recommendation
  assert.ok(result.recommendations.some((r) => r.includes('चिमनियों के बीच की दूरी')));
});

test('Wave 3 Craft: Feature 7 - Cover & Biofilter Manager', () => {
  // Semi-permeable cover evaluation
  const coverResult = coverBiofilterService.evaluateCover({
    coverType: 'SEMI_PERMEABLE_MEMBRANE',
    surfaceAreaM2: 120,
    daysInService: 450, // exceeds 365 days max recommended
    inspectedTearsCount: 1,
  });

  assert.equal(coverResult.status, 'MAINTENANCE_DUE');
  assert.ok(coverResult.actionRequired.includes('प्रतिस्थापन अथवा पैचिंग'));

  // Biofilter evaluation
  const biofilterResult = coverBiofilterService.evaluateBiofilter({
    bedId: 'BF-101',
    mediaType: 'WOOD_CHIPS_AND_COMPOST',
    bedDepthMeters: 1.2,
    moisturePct: 35, // below 40% optimal minimum
    differentialPressurePa: 550, // above 500Pa backpressure limit
  });

  assert.equal(biofilterResult.bedHealth, 'CHANNELING_OR_CLOGGED');
  assert.ok(biofilterResult.alerts.some((a) => a.includes('दबाव (Backpressure) अधिक है')));
});

test('Wave 3 Craft: Feature 8 - Receiving Bay Gate & Source Feedback Loop', () => {
  // Statutory biomedical interlock
  const bioEval = receivingGateService.evaluateGateInspection({
    sourceDepartment: 'Campus Health Clinic',
    contaminationLevel: 'MAJOR',
    contaminantsFound: ['SUSPECTED_BIOMEDICAL'],
  });

  assert.equal(bioEval.decision, 'REJECT');
  assert.equal(bioEval.isBiomedicalAlert, true);
  assert.ok(bioEval.feedbackCardMessage.includes('[CRITICAL-BIOMEDICAL-ALERT]'));
  assert.ok(bioEval.feedbackCardMessage.includes('[LEGAL-REVIEW]'));

  // Regular municipal organic acceptance
  const cleanEval = receivingGateService.evaluateGateInspection({
    sourceDepartment: 'Tower A Cafeteria',
    contaminationLevel: 'NONE',
    contaminantsFound: [],
  });

  assert.equal(cleanEval.decision, 'ACCEPT');
  assert.equal(cleanEval.sourceScorePenalty, 0);
  assert.ok(cleanEval.feedbackCardMessage.includes('शाबाश'));
});

test('Wave 3 Craft: Feature 9 - Pre-Processing Station (Safety Interlock & Fist Size)', () => {
  // 1. Blocked due to lack of certification
  const blockedSession = preProcessingService.evaluateSession({
    stationType: 'SHREDDER',
    inputMassKg: 500,
    outputMassKg: 480,
    runtimeMinutes: 30,
    operatorCertified: false,
    supervisorOverride: false,
    sizeCheck: 'ALL_UNDER_FIST_SIZE',
  });

  assert.equal(blockedSession.allowed, false);
  assert.ok(blockedSession.blockReason?.includes('OPERATOR_NOT_CERTIFIED'));

  // 2. Allowed session with supervisor override and dull blade warning
  const dullSession = preProcessingService.evaluateSession({
    stationType: 'SHREDDER',
    inputMassKg: 600,
    outputMassKg: 580,
    runtimeMinutes: 60,
    operatorCertified: false,
    supervisorOverride: true,
    overrideReason: 'Emergency pre-processing under master supervisor',
    sizeCheck: 'MANY_OVER_FIST_SIZE',
  });

  assert.equal(dullSession.allowed, true);
  assert.equal(dullSession.isSizeCheckPassed, false);
  assert.equal(dullSession.throughputKgPerHour, 600);
  assert.ok(dullSession.maintenanceAlert?.includes('ब्लेड का घिसना'));
});

test('Wave 3 Craft: Feature 10 - Pile Mapping Rounds (CV Evenness & Representativeness)', () => {
  const roundEval = pileMappingService.evaluateRound({
    points: [
      { pointIndex: 1, xMeters: 1, yMeters: 1, depthCm: 60, observedTempC: 58 },
      { pointIndex: 2, xMeters: 5, yMeters: 1, depthCm: 60, observedTempC: 62 },
      { pointIndex: 3, xMeters: 10, yMeters: 1, depthCm: 60, observedTempC: 40 }, // cold spot
      { pointIndex: 4, xMeters: 15, yMeters: 1, depthCm: 60, observedTempC: 66 }, // hot core
    ],
    smartSpearReadingC: 64,
    targetStage: 'THERMOPHILIC',
  });

  assert.equal(roundEval.averageTempC, 56.5);
  assert.equal(roundEval.minTempC, 40);
  assert.equal(roundEval.maxTempC, 66);
  assert.equal(roundEval.coldSpotCount, 1);
  assert.equal(roundEval.hotCoreCount, 1);
  assert.equal(roundEval.representativenessOffsetC, 7.5); // 64 - 56.5 = 7.5
  assert.ok(roundEval.recommendations.some((r) => r.includes('स्मार्ट स्पीयर तापमान वास्तविक औसत से 7.5°C अलग है')));
});
