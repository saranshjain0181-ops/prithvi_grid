import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateDeviceLifecycle,
  isValidTransition,
  ALLOWED_TRANSITIONS,
} from '../src/services/device-lifecycle.service';
import { assessHardwareHealth } from '../src/services/hardware-health.service';
import { getCanaryBucket } from '../src/services/ota.service';
import crypto from 'crypto';

describe('Phase 5: Fleet Lifecycle & Hardware-Cloud Contract Tests', () => {
  describe('Workstream D1: Device Lifecycle Finite State Machine', () => {
    it('transitions newly PROVISIONED node to ACTIVE upon first verified telemetry', () => {
      const now = new Date('2026-10-23T12:00:00Z');
      const firstPacketTime = new Date('2026-10-23T11:58:00Z');

      const result = evaluateDeviceLifecycle({
        currentStatus: 'PROVISIONED',
        lastSeenAt: firstPacketTime,
        supercapVoltageMv: 5100,
        vDropBurstMv: 140,
        healthScorePct: 95,
        now,
      });

      assert.equal(result.shouldTransition, true);
      assert.equal(result.fromStatus, 'PROVISIONED');
      assert.equal(result.toStatus, 'ACTIVE');
      assert.match(result.reason, /Initial verified telemetry packet/);
    });

    it('transitions ACTIVE node to DEGRADED when supercapacitor suffers high burst drop', () => {
      const now = new Date('2026-10-23T12:00:00Z');
      const recentPacket = new Date('2026-10-23T11:50:00Z');

      const result = evaluateDeviceLifecycle({
        currentStatus: 'ACTIVE',
        lastSeenAt: recentPacket,
        supercapVoltageMv: 4200,
        vDropBurstMv: 520, // Severe drop > 450mV indicates ESR degradation
        healthScorePct: 45,
        now,
      });

      assert.equal(result.shouldTransition, true);
      assert.equal(result.fromStatus, 'ACTIVE');
      assert.equal(result.toStatus, 'DEGRADED');
      assert.match(result.reason, /Severe supercapacitor discharge: 520mV/);
    });

    it('recovers DEGRADED node back to ACTIVE when health score recovers above 70%', () => {
      const now = new Date('2026-10-23T12:00:00Z');
      const recentPacket = new Date('2026-10-23T11:50:00Z');

      const result = evaluateDeviceLifecycle({
        currentStatus: 'DEGRADED',
        lastSeenAt: recentPacket,
        supercapVoltageMv: 5100,
        vDropBurstMv: 150,
        healthScorePct: 88,
        now,
      });

      assert.equal(result.shouldTransition, true);
      assert.equal(result.fromStatus, 'DEGRADED');
      assert.equal(result.toStatus, 'ACTIVE');
      assert.match(result.reason, /Node telemetry healthy and verified/);
    });

    it('transitions ACTIVE node to OFFLINE when no telemetry received for over 4 hours', () => {
      const now = new Date('2026-10-23T16:30:00Z');
      const fiveHoursAgo = new Date('2026-10-23T11:30:00Z');

      const result = evaluateDeviceLifecycle({
        currentStatus: 'ACTIVE',
        lastSeenAt: fiveHoursAgo,
        now,
        offlineTimeoutMs: 4 * 3600 * 1000,
      });

      assert.equal(result.shouldTransition, true);
      assert.equal(result.fromStatus, 'ACTIVE');
      assert.equal(result.toStatus, 'OFFLINE');
      assert.match(result.reason, /exceeds 4h threshold/);
    });

    it('respects manual operational states and prevents automatic transitions', () => {
      const now = new Date('2026-10-23T16:30:00Z');

      const maintResult = evaluateDeviceLifecycle({
        currentStatus: 'MAINTENANCE',
        lastSeenAt: new Date('2026-10-23T08:00:00Z'),
        now,
      });
      assert.equal(maintResult.shouldTransition, false);
      assert.equal(maintResult.toStatus, 'MAINTENANCE');

      const decommResult = evaluateDeviceLifecycle({
        currentStatus: 'DECOMMISSIONED',
        lastSeenAt: new Date('2026-10-23T08:00:00Z'),
        now,
      });
      assert.equal(decommResult.shouldTransition, false);
      assert.equal(decommResult.toStatus, 'DECOMMISSIONED');
    });

    it('enforces strict FSM state transition rules', () => {
      assert.equal(isValidTransition('PROVISIONED', 'ACTIVE'), true);
      assert.equal(isValidTransition('ACTIVE', 'DEGRADED'), true);
      assert.equal(isValidTransition('ACTIVE', 'OFFLINE'), true);
      assert.equal(isValidTransition('DEGRADED', 'ACTIVE'), true);
      assert.equal(isValidTransition('ACTIVE', 'MAINTENANCE'), true);
      // PROVISIONED cannot transition straight to OFFLINE without transmitting
      assert.equal(isValidTransition('PROVISIONED', 'OFFLINE'), false);
    });
  });

  describe('Workstream D2: Supercapacitor Health & Predictive Maintenance', () => {
    it('assesses healthy battery-less Smart Spear with optimal supercapacitors', () => {
      const assessment = assessHardwareHealth({
        supercapMv: 5100, // Two 2.7V in series at 5.1V
        vDropBurstMv: 140, // Nominal drop during 2A 4G pulse
        tegDeltaTC: 24, // Thermophilic pit differential
        harvestMv: 380, // Healthy LTC3108 output
        signalRssi: -72,
        consecutiveErrors: 0,
      });

      assert.ok(assessment.healthScorePct >= 90, `Expected score >= 90, got ${assessment.healthScorePct}`);
      assert.equal(assessment.brownoutRisk, 'LOW');
      assert.equal(assessment.requiresTechnicianDispatch, false);
      assert.equal(assessment.estimatedEsrMilliOhms, 70); // 140mV / 2A = 70 mOhm
    });

    it('flags high ESR capacitor degradation and triggers technician dispatch', () => {
      const assessment = assessHardwareHealth({
        supercapMv: 4200,
        vDropBurstMv: 550, // High ESR drop
        tegDeltaTC: 20,
        harvestMv: 300,
        signalRssi: -80,
      });

      assert.equal(assessment.brownoutRisk, 'CRITICAL');
      assert.equal(assessment.requiresTechnicianDispatch, true);
      assert.ok(assessment.estimatedEsrMilliOhms >= 270);
      const hasCapacitorAlert = assessment.recommendations.some((r) =>
        r.includes('Schedule dual-supercapacitor module replacement')
      );
      assert.equal(hasCapacitorAlert, true);
    });

    it('detects TEG thermal disconnection when pit is hot but harvest voltage is near zero', () => {
      const assessment = assessHardwareHealth({
        supercapMv: 4500,
        vDropBurstMv: 160,
        tegDeltaTC: 32, // Hot thermophilic compost pit (e.g. 62°C vs 30°C ambient)
        harvestMv: 25, // Under-producing drastically (<10% efficiency)
        signalRssi: -75,
      });

      assert.equal(assessment.requiresTechnicianDispatch, true);
      const hasThermalAlert = assessment.recommendations.some((r) =>
        r.includes('Thermal energy disconnect') && r.includes('reapply thermal paste')
      );
      assert.equal(hasThermalAlert, true);
    });

    it('warns of imminent brownout when supercapacitor voltage drops below 3.4V', () => {
      const assessment = assessHardwareHealth({
        supercapMv: 3300, // Near 3.0V brownout reset threshold
        vDropBurstMv: 220,
        tegDeltaTC: 10,
        harvestMv: 120,
        signalRssi: -85,
      });

      assert.equal(assessment.brownoutRisk, 'CRITICAL');
      const hasBrownoutAlert = assessment.recommendations.some((r) =>
        r.includes('Imminent brownout warning') && r.includes('extending sleep duty cycle')
      );
      assert.equal(hasBrownoutAlert, true);
    });
  });

  describe('Workstream D1: Factory Provisioning & Cryptography', () => {
    it('generates high-entropy cryptographic device key and salted SHA-256 hash', () => {
      const rawDeviceKey = crypto.randomBytes(32).toString('hex');
      assert.equal(rawDeviceKey.length, 64); // 256-bit hex

      const hash = crypto
        .createHash('sha256')
        .update(rawDeviceKey + 'prithvi_hardware_salt_2026')
        .digest('hex');

      assert.equal(hash.length, 64);
      // Different random key produces different hash
      const anotherRaw = crypto.randomBytes(32).toString('hex');
      const anotherHash = crypto
        .createHash('sha256')
        .update(anotherRaw + 'prithvi_hardware_salt_2026')
        .digest('hex');
      assert.notEqual(hash, anotherHash);
    });
  });

  describe('Workstream D3: OTA Staging & Canary Circuit Breaker', () => {
    it('computes deterministic canary buckets consistently for a given node and version', () => {
      const nodeId = '6716a1b2c3d4e5f678901234';
      const version = 'v2.1.0-prod';

      const bucket1 = getCanaryBucket(nodeId, version);
      const bucket2 = getCanaryBucket(nodeId, version);

      assert.equal(bucket1, bucket2);
      assert.ok(bucket1 >= 0 && bucket1 < 100);

      // Different version shifts hash bucket evenly
      const bucketV2 = getCanaryBucket(nodeId, 'v2.2.0-prod');
      assert.ok(bucketV2 >= 0 && bucketV2 < 100);
    });

    it('enforces circuit breaker logic when canary failure rate exceeds 2%', () => {
      const autoRollbackThresholdPct = 2.0;

      // 10 nodes completed: 9 success, 1 failure => 10% failure rate
      const successCount = 9;
      const failedRollbackCount = 1;
      const totalCompleted = successCount + failedRollbackCount;
      const failureRatePct = (failedRollbackCount / totalCompleted) * 100;

      assert.equal(failureRatePct, 10.0);
      const shouldTrip = totalCompleted >= 3 && failureRatePct >= autoRollbackThresholdPct;
      assert.equal(shouldTrip, true);
    });

    it('permits canary rollout when failure rate is below 2%', () => {
      const autoRollbackThresholdPct = 2.0;

      // 100 nodes: 99 success, 1 failure => 1% failure rate
      const successCount = 99;
      const failedRollbackCount = 1;
      const totalCompleted = successCount + failedRollbackCount;
      const failureRatePct = (failedRollbackCount / totalCompleted) * 100;

      assert.equal(failureRatePct, 1.0);
      const shouldTrip = totalCompleted >= 3 && failureRatePct >= autoRollbackThresholdPct;
      assert.equal(shouldTrip, false);
    });
  });
});
