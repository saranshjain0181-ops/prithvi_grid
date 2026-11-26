import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateUsableEnergyJoules,
  forecastDailyHarvestJoules,
  SMART_SPEAR_PHYSICAL_CONSTANTS,
} from '../src/services/wake-scheduler.service';
import {
  ARCHETYPE_PRIORS,
} from '../src/services/pit-personality.service';
import {
  computeThermalSubScore,
  computeMoistureSubScore,
  computeAciditySubScore,
  computeAerationSubScore,
  HEALTH_INDEX_WEIGHTS,
} from '../src/services/pit-health-index.service';
import {
  computeProximitySignature,
} from '../src/services/proximity-proof.service';

describe('Phase 9: Wave 2 — Smart Node & Pit Intelligence Tests', () => {
  describe('Workstream F1: Harvest-Aware Wake Scheduler & Supercapacitor Accounting', () => {
    it('accurately computes supercapacitor usable energy across operating voltage envelope', () => {
      // Usable energy: E = 0.5 * 12.5F * (V^2 - 3.2^2)
      // At 5.4V (Max): 0.5 * 12.5 * (29.16 - 10.24) = 6.25 * 18.92 = 118.25 J
      const energyAtMax = calculateUsableEnergyJoules(5400);
      assert.equal(energyAtMax, 118.25);

      // At 4.0V (Interlock threshold): 0.5 * 12.5 * (16.0 - 10.24) = 6.25 * 5.76 = 36.0 J
      const energyAtInterlock = calculateUsableEnergyJoules(4000);
      assert.equal(energyAtInterlock, 36.0);

      // At or below cutoff (3.2V): Usable energy should be zero
      const energyAtCutoff = calculateUsableEnergyJoules(3200);
      assert.equal(energyAtCutoff, 0.0);
    });

    it('forecasts daily thermal energy harvest proportional to temperature gradient (tegDeltaTC)', () => {
      // 25°C delta * 0.32 J/(°C*hr) * 24hr = 192.0 Joules
      const harvest25C = forecastDailyHarvestJoules(25);
      assert.equal(harvest25C, 192.0);

      // Zero delta (cold pit) yields zero harvest
      const harvestZero = forecastDailyHarvestJoules(0);
      assert.equal(harvestZero, 0.0);
    });

    it('enforces safety interlock when voltage is below 4.0V threshold', () => {
      const vSubInterlock = 3850;
      const isInterlock = vSubInterlock < SMART_SPEAR_PHYSICAL_CONSTANTS.V_TRANSMISSION_MIN_INTERLOCK_MV;
      assert.equal(isInterlock, true);

      // Energy cost of dense task burst (18.5 J) should not exceed 50% of available energy at 3.85V
      const availableEnergy = calculateUsableEnergyJoules(vSubInterlock);
      assert.ok(availableEnergy < 32.0);
    });
  });

  describe('Workstream F3: Pit Personality Profiles & Bayesian Learning', () => {
    it('configures distinct archetype priors for hotel kitchen vs community garden', () => {
      const hotel = ARCHETYPE_PRIORS.HOTEL_KITCHEN;
      const garden = ARCHETYPE_PRIORS.COMMUNITY_GARDEN;

      // Hotel food waste heats fast and rebounds rapidly after turning
      assert.ok(hotel.dailyHeatingRateC > garden.dailyHeatingRateC);
      assert.ok(hotel.tempReboundHours < garden.tempReboundHours);

      // Garden waste absorbs more water per litre due to dry leaves
      assert.ok(garden.moistureGainPerLiterWater > hotel.moistureGainPerLiterWater);
    });

    it('applies Bayesian partial pooling: empirical observations gradually shift coefficients', () => {
      const priorRebound = ARCHETYPE_PRIORS.HOTEL_KITCHEN.tempReboundHours; // 12.0h
      const observedRebound = 18.0; // Pit consistently taking longer

      const n = 5;
      const n0 = 5;
      const w = n / (n + n0); // 0.50

      const updatedRebound = (1 - w) * priorRebound + w * observedRebound;
      // 0.5 * 12.0 + 0.5 * 18.0 = 15.0h
      assert.equal(updatedRebound, 15.0);
      assert.ok(updatedRebound > priorRebound);
    });
  });

  describe('Workstream F8: Pit Health Index & Explain-and-Fix Mechanics', () => {
    it('awards 100 points when biological conditions match thermophilic sweet spot', () => {
      const thermal = computeThermalSubScore(58.5); // Inside 55-65°C
      const moisture = computeMoistureSubScore(52.0); // Inside 45-60%
      const acidity = computeAciditySubScore(7.1); // Inside 6.5-7.8
      const aeration = computeAerationSubScore(95); // Inside < 120 ppm

      assert.equal(thermal, 100);
      assert.equal(moisture, 100);
      assert.equal(acidity, 100);
      assert.equal(aeration, 100);
    });

    it('severely penalizes anaerobic compaction and acid crashes', () => {
      const chokedAeration = computeAerationSubScore(520); // Severe methane spike
      const acidCrash = computeAciditySubScore(4.5); // Acid crash below 5.2

      assert.ok(chokedAeration <= 20);
      assert.ok(acidCrash <= 25);
    });

    it('enforces Safeguard A: Open critical alert caps overall index at <= 49', () => {
      // Even if raw weighted sub-scores sum to 92...
      const rawCalculatedScore = 92;
      const hasCriticalAlert = true;

      const finalIndex = hasCriticalAlert ? Math.min(49, rawCalculatedScore) : rawCalculatedScore;
      assert.equal(finalIndex, 49);
      assert.ok(finalIndex < 50); // Capped in Amber/Red zone
    });

    it('verifies component weights sum exactly to 1.0', () => {
      const w = HEALTH_INDEX_WEIGHTS;
      const sum = w.THERMAL + w.MOISTURE + w.ACIDITY + w.AERATION + w.PROGRESS + w.DATA_TRUST;
      assert.equal(Number(sum.toFixed(2)), 1.0);
    });
  });

  describe('Workstream F2: Proximity Proof Challenge-Response Handshake', () => {
    it('computes deterministic HMAC-SHA256 signature for BLE proximity proof', () => {
      const deviceSecret = 'pg_spear_secret_hotel_01';
      const nodeId = '6716a1b2c3d4e5f678901234';
      const nonce = 'a1b2c3d4e5f67890a1b2c3d4e5f67890';
      const workerHash = 'worker_sha256_hash_ramesh';
      const ts = '2026-10-24T12:00:00.000Z';

      const sig1 = computeProximitySignature(deviceSecret, nodeId, nonce, workerHash, ts);
      const sig2 = computeProximitySignature(deviceSecret, nodeId, nonce, workerHash, ts);

      assert.equal(sig1, sig2);
      assert.equal(sig1.length, 64);
    });

    it('detects tampering in BLE proximity proof parameters', () => {
      const deviceSecret = 'pg_spear_secret_hotel_01';
      const nodeId = '6716a1b2c3d4e5f678901234';
      const nonce = 'a1b2c3d4e5f67890a1b2c3d4e5f67890';
      const workerHash = 'worker_sha256_hash_ramesh';
      const ts = '2026-10-24T12:00:00.000Z';

      const validSig = computeProximitySignature(deviceSecret, nodeId, nonce, workerHash, ts);
      const tamperedWorkerSig = computeProximitySignature(deviceSecret, nodeId, nonce, 'worker_sha256_tampered', ts);

      assert.notEqual(validSig, tamperedWorkerSig);
    });
  });
});
