import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalJson,
  sha256,
  hashCanonicalRecord,
  buildMerkleTree,
  generateInclusionProof,
  verifyInclusionProof,
  computeDailySealHash,
  GENESIS_SEAL_HASH,
} from '../src/services/merkle-seal.service';
import {
  calculateEvidenceStrength,
  EVIDENCE_STRENGTH_WEIGHTS,
} from '../src/services/evidence-strength.service';
import {
  estimateVirtualMoisture,
  estimateVirtualPh,
  estimateVirtualMethane,
  computeIndividualSensorTrust,
} from '../src/services/virtual-sensor.service';

describe('Phase 8: Wave 1 — Trust & Signal Foundation Tests', () => {
  describe('Workstream F5: Canonical Serialization & Merkle Tree Cryptography', () => {
    it('ensures canonicalJson sorts keys deterministically regardless of insertion order', () => {
      const obj1 = {
        methanePpm: 120,
        tempC: 58.4,
        nodeId: 'node_101',
        moisturePct: 48.2,
      };

      const obj2 = {
        nodeId: 'node_101',
        moisturePct: 48.2,
        tempC: 58.4,
        methanePpm: 120,
      };

      assert.equal(canonicalJson(obj1), canonicalJson(obj2));
      assert.equal(hashCanonicalRecord(obj1), hashCanonicalRecord(obj2));
    });

    it('builds a binary Merkle tree and generates deterministic root for leaf records', () => {
      const leaves = [
        sha256('telemetry_reading_01'),
        sha256('telemetry_reading_02'),
        sha256('telemetry_reading_03'),
        sha256('telemetry_reading_04'),
      ];

      const tree = buildMerkleTree(leaves);

      assert.equal(tree.leafCount, 4);
      assert.equal(tree.levels.length, 3);
      assert.equal(tree.root.length, 64);

      // Verify intermediate hash logic: SHA256(SHA256(leaf0 + leaf1) + SHA256(leaf2 + leaf3))
      const leftParent = sha256(leaves[0] + leaves[1]);
      const rightParent = sha256(leaves[2] + leaves[3]);
      const expectedRoot = sha256(leftParent + rightParent);

      assert.equal(tree.root, expectedRoot);
    });

    it('handles odd number of leaves by duplicating the last node', () => {
      const leaves = [
        sha256('leaf_01'),
        sha256('leaf_02'),
        sha256('leaf_03'),
      ];

      const tree = buildMerkleTree(leaves);

      assert.equal(tree.leafCount, 3);
      assert.equal(tree.levels.length, 3);

      const leftParent = sha256(leaves[0] + leaves[1]);
      const rightParent = sha256(leaves[2] + leaves[2]); // Duplicated
      const expectedRoot = sha256(leftParent + rightParent);

      assert.equal(tree.root, expectedRoot);
    });

    it('generates and verifies valid cryptographic Merkle inclusion proofs', () => {
      const leaves = [
        sha256('record_A'),
        sha256('record_B'),
        sha256('record_C'),
        sha256('record_D'),
      ];

      const tree = buildMerkleTree(leaves);
      const targetLeaf = leaves[2]; // record_C

      const proof = generateInclusionProof(targetLeaf, leaves);
      assert.ok(proof.length > 0);

      const isValid = verifyInclusionProof({
        leafHash: targetLeaf,
        merkleRoot: tree.root,
        proof,
      });

      assert.equal(isValid, true);
    });

    it('detects tampering: modifying a single byte in leaf invalidates inclusion proof', () => {
      const leaves = [
        sha256('audit_item_1'),
        sha256('audit_item_2'),
        sha256('audit_item_3'),
        sha256('audit_item_4'),
      ];

      const tree = buildMerkleTree(leaves);
      const originalLeaf = leaves[1];
      const proof = generateInclusionProof(originalLeaf, leaves);

      const tamperedLeaf = sha256('audit_item_2_tampered');

      const isValid = verifyInclusionProof({
        leafHash: tamperedLeaf,
        merkleRoot: tree.root,
        proof,
      });

      assert.equal(isValid, false);
    });

    it('computes chained daily seal linking to parent seal hash', () => {
      const tenantId = '671500000000000000000001';
      const facilityId = '6717a0000000000000000001';
      const date1 = '2026-10-23';
      const date2 = '2026-10-24';
      const root1 = sha256('root_day_1');
      const root2 = sha256('root_day_2');

      const seal1 = computeDailySealHash(tenantId, facilityId, date1, root1, GENESIS_SEAL_HASH);
      const seal2 = computeDailySealHash(tenantId, facilityId, date2, root2, seal1);

      assert.equal(seal1.length, 64);
      assert.equal(seal2.length, 64);
      assert.notEqual(seal1, seal2);
    });
  });

  describe('Workstream F6: Multi-Factor Evidence Strength Scoring', () => {
    it('classifies high-coverage, calibrated sensor claims as STRONG (>= 80)', () => {
      const result = calculateEvidenceStrength({
        coveragePct: 95, // 95 * 0.25 = 23.75
        sensorTrustPct: 90, // 90 * 0.25 = 22.5
        corroborationPct: 90, // 90 * 0.20 = 18.0
        freshnessPct: 95, // 95 * 0.15 = 14.25
        humanAttestationPct: 90, // 90 * 0.15 = 13.5
        isAmendedPostSeal: false,
      });

      // Total raw = 23.75 + 22.5 + 18.0 + 14.25 + 13.5 = 92.0
      assert.equal(result.score, 92.0);
      assert.equal(result.tier, 'STRONG');
      assert.equal(result.gaps.length, 0);
    });

    it('classifies uncalibrated or sparse data as MODERATE (55-79) with structured gaps', () => {
      const result = calculateEvidenceStrength({
        coveragePct: 70, // 70 * 0.25 = 17.5
        sensorTrustPct: 65, // 65 * 0.25 = 16.25
        corroborationPct: 60, // 60 * 0.20 = 12.0
        freshnessPct: 80, // 80 * 0.15 = 12.0
        humanAttestationPct: 50, // 50 * 0.15 = 7.5
        isAmendedPostSeal: false,
        calibrationAgeDays: 45,
        uncalibratedSensors: ['PH_PROBE'],
      });

      // Total raw = 17.5 + 16.25 + 12.0 + 12.0 + 7.5 = 65.25 -> 65.3
      assert.equal(result.tier, 'MODERATE');
      assert.ok(result.score >= 55 && result.score < 80);
      assert.ok(result.gaps.some((g) => g.gapCategory === 'COVERAGE_DEFICIT'));
      assert.ok(result.gaps.some((g) => g.gapCategory === 'CALIBRATION_OVERDUE'));
    });

    it('deducts 15-point penalty and drops tier if record was amended post-seal', () => {
      const unamended = calculateEvidenceStrength({
        coveragePct: 85,
        sensorTrustPct: 80,
        corroborationPct: 80,
        freshnessPct: 80,
        humanAttestationPct: 80,
        isAmendedPostSeal: false,
      });

      const amended = calculateEvidenceStrength({
        coveragePct: 85,
        sensorTrustPct: 80,
        corroborationPct: 80,
        freshnessPct: 80,
        humanAttestationPct: 80,
        isAmendedPostSeal: true,
      });

      assert.equal(amended.score, unamended.score - EVIDENCE_STRENGTH_WEIGHTS.POST_SEAL_AMENDMENT_PENALTY);
      assert.ok(amended.gaps.some((g) => g.gapCategory === 'AMENDMENT_PENALTY'));
    });
  });

  describe('Workstream F4: Virtual Sensors & Sensor Trust Health', () => {
    it('estimates thermophilic moisture decay realistically with honest estimation flag', () => {
      const estimate = estimateVirtualMoisture({
        coreTempC: 62.0,
        ambientTempC: 28.0,
        lastWateringHoursAgo: 36,
        lastKnownMoisturePct: 58.0,
      });

      assert.equal(estimate.sensorType, 'MOISTURE');
      assert.equal(estimate.isEstimated, true);
      assert.ok(estimate.estimatedValue < 58.0);
      assert.ok(estimate.uncertaintyBand.min < estimate.estimatedValue);
      assert.ok(estimate.uncertaintyBand.max > estimate.estimatedValue);
      assert.ok(estimate.confidencePct >= 40);
    });

    it('predicts acidification pH crash under falling temp and rising methane', () => {
      const estimate = estimateVirtualPh({
        tempSlopePerHour: -1.5,
        methaneSlopePerHour: 25.0,
        lastLoadedHoursAgo: 24,
        lastKnownPh: 6.8,
      });

      assert.equal(estimate.sensorType, 'PH');
      assert.equal(estimate.isEstimated, true);
      assert.ok(estimate.estimatedValue < 6.0); // Acid crash detected
      assert.ok(estimate.basis.includes('Biochemical acidification'));
    });

    it('infers methane rise and anaerobic compaction from barometric differential', () => {
      const estimate = estimateVirtualMethane({
        airPressureHpa: 1018.0,
        tempC: 58.0,
        stagnationHours: 24,
      });

      assert.equal(estimate.sensorType, 'METHANE');
      assert.equal(estimate.isEstimated, true);
      assert.ok(estimate.estimatedValue > 150);
    });

    it('heavily penalizes frozen/stuck signals and overdue calibrations in trust score', () => {
      const stuckProbe = computeIndividualSensorTrust({
        sensorType: 'PH',
        measuredValue: 7.0,
        virtualValue: 5.5,
        calibrationAgeDays: 75,
        isStuck: true,
        noisePct: 4,
      });

      assert.equal(stuckProbe.status, 'FAILED');
      assert.equal(stuckProbe.stuckSignalFlag, true);
      assert.ok(stuckProbe.trustScore <= 35);
      assert.ok(stuckProbe.actionRequired?.includes('FROZEN'));
    });

    it('maintains high trust score for fresh, calibrated probe matching virtual proxy', () => {
      const healthyProbe = computeIndividualSensorTrust({
        sensorType: 'MOISTURE',
        measuredValue: 52.0,
        virtualValue: 51.5,
        calibrationAgeDays: 5,
        isStuck: false,
        noisePct: 4,
      });

      assert.equal(healthyProbe.status, 'HEALTHY');
      assert.ok(healthyProbe.trustScore >= 95);
      assert.equal(healthyProbe.actionRequired, undefined);
    });
  });
});
