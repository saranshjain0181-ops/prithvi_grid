import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { safetyWelfareService } from '../src/services/safety-welfare.service.js';
import { sustainabilityCockpitService } from '../src/services/sustainability-cockpit.service.js';
import { compostCommerceService } from '../src/services/compost-commerce.service.js';
import { vol4Routes } from '../src/routes/vol4/index.js';

test('Wave 5 Strategic Cockpits: Feature 22 - Safety, Health & Welfare Cockpit', () => {
  // 1. Healthy safety posture
  const healthy = safetyWelfareService.evaluateSafetyPosture({
    totalIncidentsMonth: 0,
    totalNearMissesMonth: 4,
    overdueCorrectiveActionsCount: 0,
    alarmDrillPassRatePct: 100,
    daysSinceLastAlarmDrill: 5,
  });
  assert.equal(healthy.safetyPostureStatus, 'HEALTHY');
  assert.equal(healthy.nearMissToIncidentRatio, 4.0);
  assert.ok(healthy.advisoryHindi.includes('Healthy Safety Posture'));

  // 2. Critical hazard due to overdue actions
  const hazard = safetyWelfareService.evaluateSafetyPosture({
    totalIncidentsMonth: 2,
    totalNearMissesMonth: 1,
    overdueCorrectiveActionsCount: 4,
  });
  assert.equal(hazard.safetyPostureStatus, 'CRITICAL_HAZARD');
  assert.ok(hazard.advisoryHindi.includes('Critical Hazard'));
});

test('Wave 5 Strategic Cockpits: Feature 23 - Sustainability & ESG Cockpit (Anti-Greenwashing Claims Register)', () => {
  const esg = sustainabilityCockpitService.evaluateSustainability({
    facilityId: 'FAC-SOUTH-DELHI',
    landfillDivertedMassMt: 800,
    annualTargetMt: 1000,
    candidateClaims: [
      {
        claimId: 'CLM-01',
        claimHeadline: '50 MT avoided methane verified through telemetry',
        metricValue: '50 MT CH4',
        evidenceStrengthTier: 'STRONG',
        methodologySource: 'IPCC Composting Guideline 2019',
      },
      {
        claimId: 'CLM-02',
        claimHeadline: '100% zero carbon offset certified',
        metricValue: '100% Zero Carbon',
        evidenceStrengthTier: 'WEAK', // weak evidence -> anti-greenwashing block!
        methodologySource: 'Unverified estimate',
      },
    ],
  });

  assert.equal(esg.landfillDivertedMassMt, 800);
  assert.equal(esg.avoidedMethaneEmissionsMt, 50); // 800 * 0.0625 = 50
  assert.equal(esg.netCarbonAbatementMtCo2e, 1400); // 50 * 28 = 1400
  assert.equal(esg.annualTargetCommitmentPct, 80);
  assert.equal(esg.blockedWeakClaimsCount, 1);
  assert.equal(esg.claimsRegister.find((c) => c.claimId === 'CLM-02')?.isPublicMarketingPermitted, false);
  assert.equal(esg.claimsRegister.find((c) => c.claimId === 'CLM-01')?.isPublicMarketingPermitted, true);
  assert.equal(esg.assurancePackageHashSha256.length, 64);
});

test('Wave 5 Strategic Cockpits: Feature 24 - Compost Commerce Cockpit', () => {
  // 1. Overstock & Ageing lot signals
  const comm = compostCommerceService.evaluateCommerceHealth({
    gradeAStockMt: 35,
    gradeBStockMt: 15, // total 50 MT
    bookedOrdersMt: 20,
    unitCostPerKgInr: 3.2,
    realisedAveragePricePerKgInr: 6.0,
    ageingLotsCount: 2,
  });

  assert.equal(comm.readyCompostStockMt, 50);
  // Margin = (6 - 3.2)/6 = 46.7%
  assert.equal(comm.grossMarginPct, 46.7);
  assert.ok(comm.activeSignals.some((s) => s.signalType === 'OVERSTOCK_RISK'));
  assert.ok(comm.activeSignals.some((s) => s.signalType === 'AGEING_LOT_RISK'));

  // 2. Stockout signal
  const stockout = compostCommerceService.evaluateCommerceHealth({
    gradeAStockMt: 5,
    gradeBStockMt: 2,
    bookedOrdersMt: 20, // orders > stock
    unitCostPerKgInr: 3.2,
    realisedAveragePricePerKgInr: 6.0,
  });
  assert.ok(stockout.activeSignals.some((s) => s.signalType === 'STOCKOUT_RISK'));
});

test('Volume 4 Routes: Fastify plugin registers and mounts all endpoints', async () => {
  const fastify = Fastify();
  await fastify.register(vol4Routes, { prefix: '/api/v1/vol4' });

  // 1. Test phase engine evaluate route
  const phaseRes = await fastify.inject({
    method: 'POST',
    url: '/api/v1/vol4/phase-engine/evaluate',
    payload: {
      daysSinceLoading: 5,
      coreTempC: 58,
      ambientTempC: 28,
      accumulatedDegreeHours: 400,
    },
  });
  assert.equal(phaseRes.statusCode, 200);
  const phaseJson = phaseRes.json();
  assert.equal(phaseJson.success, true);
  assert.equal(phaseJson.result.currentPhase, 'THERMOPHILIC');

  // 2. Test bulk density route
  const densityRes = await fastify.inject({
    method: 'POST',
    url: '/api/v1/vol4/bulk-density/evaluate',
    payload: {
      containerVolumeLiters: 10,
      sampleNetMassKg: 3.6,
      estimatedMoisturePct: 40,
    },
  });
  assert.equal(densityRes.statusCode, 200);
  const densityJson = densityRes.json();
  assert.equal(densityJson.success, true);
  assert.equal(densityJson.result.isFasInOptimalBand, true);

  // 3. Test sustainability route
  const esgRes = await fastify.inject({
    method: 'POST',
    url: '/api/v1/vol4/sustainability/evaluate',
    payload: {
      facilityId: 'FAC-TEST',
      landfillDivertedMassMt: 400,
      candidateClaims: [],
    },
  });
  assert.equal(esgRes.statusCode, 200);
  const esgJson = esgRes.json();
  assert.equal(esgJson.success, true);
  assert.equal(esgJson.result.avoidedMethaneEmissionsMt, 25);

  await fastify.close();
});
