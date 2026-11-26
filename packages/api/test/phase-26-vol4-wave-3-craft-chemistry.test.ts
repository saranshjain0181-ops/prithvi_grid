import test from 'node:test';
import assert from 'node:assert/strict';
import { bulkDensityFasService } from '../src/services/bulk-density-fas.service.js';
import { difficultStreamsService } from '../src/services/difficult-streams.service.js';
import { saltConductivityService } from '../src/services/salt-conductivity.service.js';
import { nutrientRetentionService } from '../src/services/nutrient-retention.service.js';
import { vermicompostBedService } from '../src/services/vermicompost-bed.service.js';

test('Wave 3 Craft & Chemistry: Feature 8 - Bulk Density & Free Air Space (FAS)', () => {
  // 1. Dense load with low air space
  const denseTest = bulkDensityFasService.evaluateBulkDensityAndFas({
    containerVolumeLiters: 10,
    sampleNetMassKg: 6.8, // 680 kg/m3
    estimatedMoisturePct: 60,
  });

  assert.equal(denseTest.bulkDensityKgPerM3, 680);
  assert.ok(denseTest.freeAirSpacePct < 48);
  assert.equal(denseTest.isFasInOptimalBand, false);
  assert.ok(denseTest.recommendedBulkingKgPerTon > 0);
  assert.ok(denseTest.advisoryHindi.includes('मुक्त वायु स्थान'));

  // 2. Optimal load with sawdust added (360 kg/m3, 40% moisture)
  const optimalTest = bulkDensityFasService.evaluateBulkDensityAndFas({
    containerVolumeLiters: 10,
    sampleNetMassKg: 3.6, // 360 kg/m3
    estimatedMoisturePct: 40,
  });

  assert.equal(optimalTest.bulkDensityKgPerM3, 360);
  // solid = 360/1400 = 0.257, water = 360*0.4/1000 = 0.144, FAS = 1 - 0.401 = 59.9%
  assert.ok(optimalTest.freeAirSpacePct >= 48 && optimalTest.freeAirSpacePct <= 68);
  assert.equal(optimalTest.isFasInOptimalBand, true);
  assert.equal(optimalTest.recommendedBulkingKgPerTon, 0);
});

test('Wave 3 Craft & Chemistry: Feature 9 - Difficult & Festival Waste Streams', () => {
  // 1. Load with excessive cooked rice (> 15%)
  const surgeEval = difficultStreamsService.evaluateStreams({
    totalLoadMassKg: 1000,
    streams: [
      { streamType: 'COOKED_RICE_DAL', massKg: 250 }, // 25% > 15% limit
      { streamType: 'TENDER_COCONUT_SHELLS', massKg: 100 }, // 10% <= 25%
    ],
  });

  assert.equal(surgeEval.isLoadAcceptable, false);
  assert.equal(surgeEval.breachedStreams.length, 1);
  assert.equal(surgeEval.breachedStreams[0].streamType, 'COOKED_RICE_DAL');
  assert.ok(surgeEval.mandatoryPreTreatmentsHindi.length > 0);
  assert.ok(surgeEval.sourceFeedbackMessageHindi.includes('कचरा सीमा से अधिक'));

  // 2. Clean acceptable stream mix
  const cleanEval = difficultStreamsService.evaluateStreams({
    totalLoadMassKg: 1000,
    streams: [
      { streamType: 'TEMPLE_FESTIVAL_FLOWERS', massKg: 200 }, // 20% <= 30%
    ],
  });
  assert.equal(cleanEval.isLoadAcceptable, true);
  assert.equal(cleanEval.breachedStreams.length, 0);
});

test('Wave 3 Craft & Chemistry: Feature 10 - Salt & Conductivity Guard', () => {
  // 1. Compliant batch (EC <= 4.0 dS/m)
  const okEc = saltConductivityService.evaluateConductivity({
    batchId: 'B-01',
    measuredEcDsM: 2.8,
  });
  assert.equal(okEc.isWithinProductBand, true);
  assert.equal(okEc.kitchenAlertRequired, false);

  // 2. High salinity batch (EC = 6.2 dS/m) requiring dilution blending
  const highEc = saltConductivityService.evaluateConductivity({
    batchId: 'B-02',
    measuredEcDsM: 6.2,
    sourceKitchenDepartment: 'Main Banquet Kitchen',
  });
  assert.equal(highEc.isWithinProductBand, false);
  assert.equal(highEc.kitchenAlertRequired, true);
  assert.ok(highEc.blendPlan);
  assert.ok(highEc.blendPlan?.expectedBlendedEcDsM <= 4.0);
  assert.ok(highEc.feedbackCardHindi?.includes('Main Banquet Kitchen'));
});

test('Wave 3 Craft & Chemistry: Feature 11 - Nutrient Balance & Retention Ledger', () => {
  // 1. Claims gate locked when lab certificate missing
  const uncertifiedRun = nutrientRetentionService.evaluateNutrientRetention({
    inputNitrogenKg: 50,
    outputNitrogenKg: 35,
    isOutputLabCertified: false,
  });
  assert.equal(uncertifiedRun.nitrogenRetentionPct, 70);
  assert.equal(uncertifiedRun.claimsGateStatus, 'CLAIMS_LOCKED_PENDING_LAB');
  assert.equal(uncertifiedRun.isCommercialClaimPermitted, false);

  // 2. Claims gate unlocked with NABL certificate
  const certifiedRun = nutrientRetentionService.evaluateNutrientRetention({
    inputNitrogenKg: 50,
    outputNitrogenKg: 38,
    isOutputLabCertified: true,
    labCertificateNumber: 'NABL-2026-N789',
  });
  assert.equal(certifiedRun.nitrogenRetentionPct, 76);
  assert.equal(certifiedRun.claimsGateStatus, 'CERTIFIED_CLAIMS_ALLOWED');
  assert.equal(certifiedRun.isCommercialClaimPermitted, true);
  assert.ok(certifiedRun.estimatedFertilizerValueInr > 1500);
});

test('Wave 3 Craft & Chemistry: Feature 13 - Vermicompost Bed Manager', () => {
  // 1. Thermal safety interlock: hot feed > 35C rejected
  const hotFeed = vermicompostBedService.evaluateFeedAndBedHealth({
    sourcePitPhase: 'THERMOPHILIC',
    sourcePitTempC: 52, // too hot
    bedTempC: 24,
    bedMoisturePct: 70,
  });
  assert.equal(hotFeed.isFeedAllowed, false);
  assert.ok(hotFeed.rejectionReasonHindi?.includes('Hot Feed Rejected'));

  // 2. Normal bed check with feed allowed
  const goodBed = vermicompostBedService.evaluateFeedAndBedHealth({
    sourcePitPhase: 'CURING_MATURATION',
    sourcePitTempC: 30, // cool
    sourcePitSmellAmmonia: 'NONE',
    bedTempC: 24,
    bedMoisturePct: 68,
  });
  assert.equal(goodBed.isFeedAllowed, true);
  assert.equal(goodBed.bedHealthTier, 'OPTIMAL');
  assert.ok(goodBed.wormHealthScorePct >= 90);
});
