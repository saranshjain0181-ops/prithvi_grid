import test from 'node:test';
import assert from 'node:assert/strict';
import { pitCyclePlannerService } from '../src/services/pit-cycle-planner.service.js';
import { caseLibraryService } from '../src/services/case-library.service.js';
import { improvementIdeasService } from '../src/services/improvement-ideas.service.js';
import { procurementScorecardService } from '../src/services/procurement-scorecard.service.js';
import { collectionLogisticsService } from '../src/services/collection-logistics.service.js';
import { registersReturnsService } from '../src/services/registers-returns.service.js';

test('Wave 4 Operations: Feature 12 - Pit Cycle Planner & Capacity Runway', () => {
  const plan = pitCyclePlannerService.evaluateCyclePlan({
    forecastDailyIntakeKg: 500,
    pits: [
      {
        pitId: 'PIT-01',
        status: 'FILLING_ACCEPTING',
        currentFillKg: 1000,
        maxCapacityKg: 2500, // 1500kg available
      },
      {
        pitId: 'PIT-02',
        status: 'CLOSED_THERMOPHILIC',
        currentFillKg: 2500,
        maxCapacityKg: 2500, // 0 available
      },
      {
        pitId: 'PIT-03',
        status: 'EMPTY_CLEAN',
        currentFillKg: 0,
        maxCapacityKg: 2000, // 2000kg available
      },
    ],
  });

  // Total available = 1500 + 2000 = 3500kg. Runway = 3500 / 500 = 7 days
  assert.equal(plan.capacityRunwayDays, 7);
  assert.equal(plan.overflowRiskDetected, false);
  assert.equal(plan.assignedPitIdForToday, 'PIT-01');
  assert.equal(plan.allocations.length, 3);
});

test('Wave 4 Operations: Feature 14 - Case Library & Similar-Case Finder', () => {
  const result = caseLibraryService.findSimilarCases({
    incidentType: 'ACID_CRASH',
    pitArchetype: 'HOTEL_KITCHEN_IN_VESSEL',
    currentSymptoms: ['pH < 5.0', 'sour odor'],
    storedCases: [
      {
        caseId: 'CASE-101',
        title: 'Monsoon Kitchen Waste Acid Crash',
        incidentType: 'ACID_CRASH',
        pitArchetype: 'HOTEL_KITCHEN_IN_VESSEL',
        symptoms: ['pH < 5.0', 'sour odor', 'cooling stall'],
        recoveryActionsTaken: ['Add 4kg wood ash buffer', 'gentle manual turning'],
        recoveryDurationHours: 24,
        isValidatedByAgronomist: true,
        keyLessonLearnedHindi: 'लकड़ी की राख से तुरंत pH 6.8 पर लौटा।',
      },
      {
        caseId: 'CASE-102',
        title: 'Dry Windrow Stall',
        incidentType: 'COLD_STALL',
        pitArchetype: 'COMMUNITY_WINDROW',
        symptoms: ['dryness'],
        recoveryActionsTaken: ['Water sprinkling'],
        recoveryDurationHours: 48,
        isValidatedByAgronomist: true,
        keyLessonLearnedHindi: 'पानी की मात्रा बढ़ाई।',
      },
    ],
  });

  assert.equal(result.matchesCount, 1);
  assert.equal(result.topMatches[0].caseId, 'CASE-101');
  assert.ok(result.topMatches[0].similarityScorePct >= 80);
  assert.ok(result.recommendedProvenActionHindi?.includes('Add 4kg wood ash buffer'));
});

test('Wave 4 Operations: Feature 15 - Improvement Ideas Pipeline (Kaizen / Sujhav)', () => {
  const ideaTriage = improvementIdeasService.triageIdea({
    ideaId: 'IDEA-201',
    theme: 'TIME_SAVING',
    title: 'Pre-cutting banana leaves before shredder feed',
    description: 'Chop fibrous leaves with sickle so shredder blades do not choke',
    estimatedHoursSavedPerWeek: 3.0,
    laborHourlyRateInr: 100,
  });

  assert.equal(ideaTriage.status, 'TRIAGED_APPROVED');
  // 3 hrs * 52 weeks * 100 = 15,600 INR
  assert.equal(ideaTriage.estimatedAnnualSavingsInr, 15600);
  assert.ok(ideaTriage.recognitionNoteHindi.includes('यार्ड सुधार बोर्ड'));
});

test('Wave 4 Operations: Feature 16 - Procurement & Supplier Scorecard', () => {
  // 1. Successful 3-Way Match
  const passMatch = procurementScorecardService.evaluateThreeWayMatch({
    poQuantity: 1000,
    receivedScaleWeight: 990, // 1% variance <= 5%
    invoicedQuantity: 990,
    poRateInr: 50,
    invoicedRateInr: 50,
  });
  assert.equal(passMatch.isMatchPassed, true);
  assert.equal(passMatch.quantityVariancePct, 1.0);

  // 2. Supplier Tier Evaluation
  const score = procurementScorecardService.computeSupplierScore({
    supplierId: 'SUP-SAWDUST-01',
    totalDeliveries: 20,
    onTimeDeliveries: 19, // 95%
    matchesPassedCount: 20, // 100%
    qualityRejectionsCount: 0,
  });
  assert.equal(score.ratingTier, 'PREFERRED');
  assert.ok(score.onTimeDeliveryPct >= 95);
});

test('Wave 4 Operations: Feature 17 - Collection & Dispatch Logistics', () => {
  const tripEval = collectionLogisticsService.evaluateCollectionTrip({
    scheduledStopIds: ['STOP-A', 'STOP-B', 'STOP-C', 'STOP-D'],
    scannedStops: [
      { stopId: 'STOP-A', scannedAt: new Date(), massKg: 120 },
      { stopId: 'STOP-B', scannedAt: new Date(), massKg: 140 },
      { stopId: 'STOP-D', scannedAt: new Date(), massKg: 110 },
    ], // STOP-C missing
    vehicleDocuments: {
      fitnessExpiresAt: new Date('2027-01-01'),
      insuranceExpiresAt: new Date('2027-01-01'),
      pucExpiresAt: new Date('2027-01-01'),
    },
  });

  assert.equal(tripEval.missedStopsCount, 1);
  assert.equal(tripEval.missedStopIds[0], 'STOP-C');
  assert.equal(tripEval.totalCollectedMassKg, 370);
  assert.equal(tripEval.escalationStatus, 'MISSED_STOPS_ESCALATED');
  assert.equal(tripEval.vehicleDocumentsCompliant, true);
});

test('Wave 4 Operations: Feature 18 - Registers & Returns Generator', () => {
  const compiled = registersReturnsService.compileReturn({
    facilityId: 'FAC-INDORE-01',
    reportingPeriodMonth: '2026-10',
    authority: 'MUNICIPAL_CORPORATION',
    items: [
      {
        fieldCode: 'WASTE_RECEIVED_MT',
        fieldLabel: 'कुल गीला कचरा प्राप्त (MT)',
        sourceLedger: 'Weighbridge Ledger',
        compiledValue: '45.2',
        isAutofilled: true,
        evidenceStrength: 'STRONG',
      },
      {
        fieldCode: 'COMPOST_PRODUCED_MT',
        fieldLabel: 'कुल जैविक खाद उत्पादित (MT)',
        sourceLedger: 'Bagging Ledger',
        compiledValue: '12.8',
        isAutofilled: true,
        evidenceStrength: 'STRONG',
      },
      {
        fieldCode: 'INERT_REJECTS_MT',
        fieldLabel: 'अक्रिय अपशिष्ट निस्तारण (MT)',
        sourceLedger: 'Gate Rejection Ledger',
        compiledValue: '2.1',
        isAutofilled: true,
        evidenceStrength: 'STRONG',
      },
    ],
  });

  assert.equal(compiled.totalFieldsCount, 3);
  assert.equal(compiled.autofillCompletenessPct, 100);
  assert.equal(compiled.missingDataGaps.length, 0);
  assert.equal(compiled.isAttestationPermitted, true);
  assert.equal(compiled.digitalTamperHashSha256.length, 64);
  assert.ok(compiled.statusMessageHindi.includes('डिजिटल सत्यापन'));
});
