import test from 'node:test';
import assert from 'node:assert/strict';
import { inoculantAdditiveService } from '../src/services/inoculant-additive.service.js';
import { seasonalReadinessService } from '../src/services/seasonal-readiness.service.js';
import { trainingAcademyService } from '../src/services/training-academy.service.js';
import { contractorReconciliationService } from '../src/services/contractor-reconciliation.service.js';
import { labourStandardsService } from '../src/services/labour-standards.service.js';
import { residentEngagementService } from '../src/services/resident-engagement.service.js';

test('Wave 4 Workforce: Feature 6 - Microbial Inoculants & Additives Tracker', () => {
  // Test EM1 with inadequate activation
  const emCalc = inoculantAdditiveService.calculateDosage({
    additiveType: 'EM1_MICROBIAL',
    pileMassTons: 5,
    activationHoursPrior: 12, // needs 48
  });

  assert.equal(emCalc.totalCalculatedGrams, 5000);
  assert.equal(emCalc.isActivationAdequate, false);
  assert.ok(emCalc.warnings.some((w) => w.includes('कम किण्वन अवधि')));

  // Test A/B trial evaluation
  const trial = inoculantAdditiveService.evaluateTrial({
    treatedPeakTempC: 65,
    controlPeakTempC: 58,
    hoursToThermophilicTreated: 24,
    hoursToThermophilicControl: 60,
  });

  assert.equal(trial.verdict, 'HIGH_EFFICACY');
  assert.equal(trial.deltaPeakTempC, 7);
  assert.equal(trial.timeSavingsHours, 36);
});

test('Wave 4 Workforce: Feature 11 - Seasonal Readiness & Weather Resilience', () => {
  const template = seasonalReadinessService.getTemplateForSeason('MONSOON');
  assert.equal(template.length, 4);

  // Set 1 mandatory item to FAIL
  const items = template.map((i) => ({
    ...i,
    status: (i.itemId === 'MON-01' ? 'FAIL' : 'PASS') as 'PASS' | 'FAIL',
  }));

  const readiness = seasonalReadinessService.evaluateReadiness({
    season: 'MONSOON',
    items,
  });

  assert.equal(readiness.isClearedForSeason, false);
  assert.equal(readiness.failedMandatoryCount, 1);
  assert.ok(readiness.urgentActionItems.length > 0);
});

test('Wave 4 Workforce: Feature 12 - Training Academy & Task Certification', () => {
  // Passing attempt
  const passAttempt = trainingAcademyService.evaluateCertificationAttempt({
    skill: 'SHREDDER_OPERATOR',
    audioModuleCompleted: true,
    practicalScorePct: 88,
    supervisorSigned: true,
  });

  assert.equal(passAttempt.eligible, true);
  assert.equal(passAttempt.certificateStatus, 'ACTIVE');

  // Verify gate allows active certified worker
  const gateCheck = trainingAcademyService.verifyWorkerGate({
    isRevoked: false,
    expiresAt: passAttempt.expiresAt,
    practicalAssessmentScorePct: 88,
  });
  assert.equal(gateCheck.allowed, true);

  // Incomplete audio module blocks certification
  const failAttempt = trainingAcademyService.evaluateCertificationAttempt({
    skill: 'SHREDDER_OPERATOR',
    audioModuleCompleted: false,
    practicalScorePct: 95,
    supervisorSigned: true,
  });
  assert.equal(failAttempt.eligible, false);
  assert.equal(failAttempt.certificateStatus, 'AUDIO_INCOMPLETE');
});

test('Wave 4 Workforce: Feature 13 - Contractor Reconciliation & SLA Engine', () => {
  const result = contractorReconciliationService.reconcileInvoice({
    billedManDays: 100,
    observedManDays: 85, // 15 man-days missing
    billedTurnsCount: 20,
    verifiedTurnsCount: 16, // 4 unverified turns
    ratePerManDayInr: 600,
    penaltyPerMissedTurnInr: 500,
  });

  assert.equal(result.grossClaimedAmountInr, 60000);
  assert.equal(result.metrics.unexplainedVarianceManDays, 15);
  // Deduction = (15 * 600) + (4 * 500) = 9000 + 2000 = 11000
  assert.equal(result.totalDeductionsInr, 11000);
  assert.equal(result.netApprovedAmountInr, 49000);
  assert.equal(result.auditFlag, 'CRITICAL_DISCREPANCY');
});

test('Wave 4 Workforce: Feature 15 - Labour Standards & Workforce Sizing', () => {
  const forecast = labourStandardsService.forecastWorkforce({
    dailyWetWasteTons: 4,
    activePitsCount: 6,
    scheduledHeadcount: 2, // understaffed
    shredderUsed: true,
  });

  assert.ok(forecast.totalWithFatigueMinutes > 0);
  assert.ok(forecast.totalRequiredFte > 2);
  assert.equal(forecast.fatigueRisk, true);
  assert.ok(forecast.recommendations.some((r) => r.includes('श्रम की कमी')));
});

test('Wave 4 Workforce: Feature 16 - Resident Engagement & Compost-Return Programme', () => {
  // Tower leaderboard
  const ranked = residentEngagementService.rankTowers([
    {
      towerId: 'T1',
      towerName: 'Tower A',
      totalFlatsCount: 100,
      participatingFlatsCount: 80,
      monthlyWasteKg: 2000,
      segregationScorePct: 75,
    },
    {
      towerId: 'T2',
      towerName: 'Tower B',
      totalFlatsCount: 100,
      participatingFlatsCount: 90,
      monthlyWasteKg: 2200,
      segregationScorePct: 95,
    },
  ]);

  assert.equal(ranked[0].towerId, 'T2');
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[1].rank, 2);

  // Voucher allocation
  const voucher = residentEngagementService.allocateVoucher({
    residentId: 'RES-501',
    towerId: 'T2',
    flatNumber: 'B-402',
    contributedWasteKg: 120, // 120kg at 50kg/bag gives 2 bags
  });

  assert.equal(voucher.allocatedBagsCount, 2);
  assert.ok(voucher.voucherCode.startsWith('PG-VOUCHER-T2-B402-'));
});
