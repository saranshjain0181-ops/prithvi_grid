import test from 'node:test';
import assert from 'node:assert/strict';
import { visualMaturityService } from '../src/services/visual-maturity.service.js';
import { maturityFusionService } from '../src/services/maturity-fusion.service.js';
import { storageStewardshipService } from '../src/services/storage-stewardship.service.js';
import { dataTrustCockpitService } from '../src/services/data-trust-cockpit.service.js';
import { alertQualityWorkbenchService } from '../src/services/alert-quality-workbench.service.js';

test('Wave 2 Trust & Maturity: Feature 5 - Visual Maturity Index & Time-Lapse Studio', () => {
  // 1. Rejected frame due to blur
  const blurryFrame = visualMaturityService.evaluateFrame({
    blurScore: 0.75, // exceeds 0.6
    brightnessScore: 0.5,
    rawDarknessScore: 80,
  });
  assert.equal(blurryFrame.isUsable, false);
  assert.equal(blurryFrame.calibratedMaturityIndex, 0);
  assert.ok(blurryFrame.rejectionReason?.includes('IMAGE_BLURRED'));

  // 2. Normal frame with moisture compensation
  const normalFrame = visualMaturityService.evaluateFrame({
    blurScore: 0.15,
    brightnessScore: 0.55,
    referencePatchDetected: true,
    rawDarknessScore: 85,
    moisturePct: 50, // 10% over 40% -> penalty 5
  });
  assert.equal(normalFrame.isUsable, true);
  assert.equal(normalFrame.moistureAdjustmentPenalty, 5);
  assert.equal(normalFrame.calibratedMaturityIndex, 80);
  assert.ok(normalFrame.captionHindi.includes('Mature Humus'));
});

test('Wave 2 Trust & Maturity: Feature 6 - Maturity Evidence Fusion & Harvest Window', () => {
  const fusion = maturityFusionService.evaluateMaturity({
    asOfDate: '2026-10-26',
    evidenceItems: [
      {
        category: 'TEMPERATURE_STABILITY',
        scoreContributionPct: 90,
        reliabilityWeight: 0.25,
        observedValue: 'Reheat <= 2C above ambient',
        isPassed: true,
      },
      {
        category: 'DEGREE_DAYS',
        scoreContributionPct: 85,
        reliabilityWeight: 0.2,
        observedValue: '1240 degree days',
        isPassed: true,
      },
      {
        category: 'GERMINATION_CRESS_TEST',
        scoreContributionPct: 88,
        reliabilityWeight: 0.25,
        observedValue: '92% cress germination index',
        isPassed: true,
      },
      {
        category: 'LAB_CN_RATIO',
        scoreContributionPct: 84,
        reliabilityWeight: 0.3,
        observedValue: 'C:N 16.4',
        isPassed: true,
      },
    ],
  });

  assert.ok(fusion.compositeMaturityScorePct >= 80);
  assert.equal(fusion.evidenceStrengthTier, 'STRONG');
  assert.equal(fusion.isReadyForRelease, true);
  assert.ok(fusion.harvestWindow.likelyHarvestDate.startsWith('2026-'));
  assert.ok(fusion.recommendationHindi.includes('हार्वेस्ट गेट पास हुआ'));
});

test('Wave 2 Trust & Maturity: Feature 7 - Finished Compost Storage Stewardship', () => {
  // 1. Hot dry storage at nitrogen risk
  const dryRisk = storageStewardshipService.evaluateStorageRisk({
    storageForm: 'LOOSE_PILE',
    daysInStorage: 20,
    observedMoisturePct: 12, // < 15%
    observedTempC: 34,
    ambientTempC: 38, // > 32C
    isCovered: false,
    smellAmmonia: 'SHARP',
  });

  assert.ok(dryRisk.nitrogenLossRiskScore >= 70);
  assert.equal(dryRisk.overallRiskTier, 'HIGH');
  assert.equal(dryRisk.isMoistureInBand, false);
  assert.ok(dryRisk.recommendedActionHindi.includes('अमोनिया नाइट्रोजन उड़ने का जोखिम'));

  // 2. Retest requirement after 65 days
  const oldLot = storageStewardshipService.evaluateStorageRisk({
    storageForm: 'BAGS',
    daysInStorage: 65,
    observedMoisturePct: 20,
    observedTempC: 28,
    ambientTempC: 28,
    isCovered: true,
  });

  assert.equal(oldLot.isRetestRequired, true);
  assert.ok(oldLot.recommendedActionHindi.includes('पुनः जांच (Retest) अनिवार्य है'));
});

test('Wave 2 Trust & Maturity: Feature 20 - Data Trust & Measurement Health Cockpit', () => {
  const trust = dataTrustCockpitService.evaluateDataTrust({
    instrumentsScore: 65, // overdue scale
    coverageScore: 85,
    corroborationScore: 80,
    imageQualityScore: 85,
    provenanceMeasuredPct: 80,
    freshnessScore: 90,
    overdueInstrumentsCount: 2,
  });

  assert.ok(trust.compositeTrustIndexPct >= 70);
  assert.equal(trust.trustTier, 'MODERATE');
  assert.equal(trust.topThreeRemediations.length, 3);
  assert.ok(trust.topThreeRemediations.some((r) => r.actionId === 'ACT-CALIBRATE-SCALE'));
});

test('Wave 2 Trust & Maturity: Feature 21 - Alert Quality & Rule Tuning Workbench', () => {
  const workbench = alertQualityWorkbenchService.evaluateRulesQuality([
    {
      ruleCode: 'RULE_ODOR_MONSOON',
      ruleName: 'Monsoon Odor Warning',
      totalAlertsDispatched: 20,
      usefulFeedbackCount: 8, // 40% precision -> noisy!
      falseAlarmCount: 12,
      delayedCount: 0,
      averageLeadTimeHours: 1.5,
      currentThreshold: '350 ppm eq',
      currentDebounceMinutes: 15,
    },
    {
      ruleCode: 'RULE_OVERHEAT_FIRE',
      ruleName: 'Core Fire Risk Siren',
      totalAlertsDispatched: 5,
      usefulFeedbackCount: 5, // 100% precision
      falseAlarmCount: 0,
      delayedCount: 0,
      averageLeadTimeHours: 4.0,
    },
  ]);

  assert.equal(workbench.evaluatedRules.length, 2);
  assert.equal(workbench.tuningProposals.length, 1);
  assert.equal(workbench.tuningProposals[0].ruleCode, 'RULE_ODOR_MONSOON');
  assert.equal(workbench.tuningProposals[0].proposedDebounceMinutes, 30);
  assert.ok(workbench.summaryAdvisoryHindi.includes('ट्यूनिंग प्रस्ताव तैयार हैं'));
});
