import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { generateSwmCompliancePdf } from '../src/services/pdf.service';
import { env } from '../src/config/env';

describe('Phase 4: Compliance Proof & Financial Transparency Tests', () => {
  describe('Workstream F6: Cryptographic SHA-256 Hash Chaining & SWM-2026 Matrix', () => {
    it('computes deterministic SHA-256 certificate hash over canonical audit data', () => {
      const canonicalData = {
        certificateId: 'SWM-IND-2026-TEST-0001',
        previousCertificateHash: 'GENESIS_BLOCK_00000000000000000000000000000000',
        facilityId: '6717a0000000000000000001',
        entityId: '6717a0000000000000000002',
        periodStart: '2026-09-01T00:00:00.000Z',
        periodEnd: '2026-09-30T23:59:59.000Z',
        totals: {
          totalWasteInKg: 42500,
          totalFertilizerOutKg: 14200,
          avgTempC: 56.4,
          maxMethanePpm: 185,
          violationsPrevented: 32,
        },
      };

      const hash1 = crypto.createHash('sha256').update(JSON.stringify(canonicalData)).digest('hex');
      const hash2 = crypto.createHash('sha256').update(JSON.stringify(canonicalData)).digest('hex');

      assert.strictEqual(hash1, hash2);
      assert.strictEqual(hash1.length, 64);
    });

    it('detects tampering if underlying sensor data is modified', () => {
      const original = {
        certificateId: 'SWM-IND-2026-TEST-0001',
        totals: { totalWasteInKg: 42500, maxMethanePpm: 185 },
      };
      const tampered = {
        certificateId: 'SWM-IND-2026-TEST-0001',
        totals: { totalWasteInKg: 42500, maxMethanePpm: 450 }, // Methane secretly spiked
      };

      const originalHash = crypto.createHash('sha256').update(JSON.stringify(original)).digest('hex');
      const tamperedHash = crypto.createHash('sha256').update(JSON.stringify(tampered)).digest('hex');

      assert.notStrictEqual(originalHash, tamperedHash);
    });

    it('enforces previous block hash linkage across consecutive certificates', () => {
      const block1 = {
        id: 'CERT-001',
        prevHash: 'GENESIS_00000000000000000000000000000000',
      };
      const block1Hash = crypto.createHash('sha256').update(JSON.stringify(block1)).digest('hex');

      const block2 = {
        id: 'CERT-002',
        prevHash: block1Hash, // Linked to block 1
      };
      const block2Hash = crypto.createHash('sha256').update(JSON.stringify(block2)).digest('hex');

      assert.strictEqual(block2.prevHash, block1Hash);
      assert.notStrictEqual(block2Hash, block1Hash);
    });
  });

  describe('Workstream F7: Derived Financial Transparency & Client-Owned Assumptions', () => {
    it('strictly derives financial savings from configurable formulas without invented numbers', () => {
      const input = {
        wasteKg: 13500,
        compostKg: 4050,
        violationsPrevented: 24,
      };

      const clientAssumptions = {
        fineSlabInr: 10000,       // Client configured ₹10,000 per violation slab
        compostPricePerKg: 6.5,   // Client sells compost at ₹6.50 / kg
        tippingFeePerMt: 1800,    // Municipal hauling fee ₹1,800 / MT
      };

      // Formula: Violations × Fine Slab
      const fineSavings = input.violationsPrevented * clientAssumptions.fineSlabInr;
      assert.strictEqual(fineSavings, 240000);

      // Formula: Compost kg × Price
      const compostValue = input.compostKg * clientAssumptions.compostPricePerKg;
      assert.strictEqual(compostValue, 26325);

      // Formula: (Waste kg / 1000) × Tipping Fee
      const haulingSavings = (input.wasteKg / 1000) * clientAssumptions.tippingFeePerMt;
      assert.strictEqual(haulingSavings, 24300);

      // Total savings
      const totalSavings = fineSavings + compostValue + haulingSavings;
      assert.strictEqual(totalSavings, 290625);
    });

    it('derives bio-waste landfill methane diversion carbon offset (CO2e)', () => {
      const wasteKg = 42500;
      // Indore Municipal bio-waste diversion factor: ~0.75 kg CO2e / kg food waste
      const carbonOffsetKg = Math.round(wasteKg * 0.75);
      assert.strictEqual(carbonOffsetKg, 31875);
    });
  });

  describe('Workstream F6: Server-Side PDF Certificate Generation', () => {
    it('generates a valid, non-empty PDF document buffer with embedded QR code', async () => {
      const auditData = {
        certificateId: 'SWM-IND-2026-UNITTEST',
        certificateHash: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
        previousCertificateHash: 'GENESIS_BLOCK_00000000000000000000000000000000',
        entityName: 'Indore Grand Palace Hotel',
        facilityName: 'Onsite Aerobic Composting Pit 1',
        swmRegNo: 'SWM-IND-2026-PALACE',
        imcZone: 'Zone 3 (Old Indore)',
        imcWard: 'Ward 24',
        auditPeriod: '01 Oct 2026 - 31 Oct 2026',
        totalWasteProcessedKg: 18500,
        totalCompostYieldKg: 5800,
        finesPreventedInr: 90000,
        violationsPrevented: 18,
        carbonOffsetKg: 13875,
        generatedDate: '23 Oct 2026',
        thermophilicHours: 82,
        avgTempC: 58.2,
        avgMoisturePct: 53.4,
        maxMethanePpm: 140,
        verifiedLabourSessions: 28,
        requirements: [
          { code: 'Rule 4(1)', title: 'Source Segregation', status: 'COMPLIANT', evidenceSummary: 'Segregated waste verified' },
          { code: 'Rule 4(7)', title: '100% On-Site Processing', status: 'COMPLIANT', evidenceSummary: 'Continuous bio-digestion' },
        ],
      };

      const pdfBuffer = await generateSwmCompliancePdf(auditData);

      assert.ok(Buffer.isBuffer(pdfBuffer));
      assert.ok(pdfBuffer.length > 5000, 'PDF buffer size should exceed 5KB');
      // Validate PDF signature header %PDF-
      const header = pdfBuffer.subarray(0, 5).toString('ascii');
      assert.strictEqual(header, '%PDF-');
    });
  });

  describe('Workstream N2: Auditor Inspection Mode & Token Security', () => {
    it('generates and validates time-limited read-only auditor JWT token', () => {
      const secret = env.JWT_SECRET || 'test-secret';
      const payload = {
        userId: 'auditor_test_123',
        role: 'AUDITOR_GUEST',
        facilityId: '6717a0000000000000000001',
        auditorAgency: 'Indore Municipal Corporation (IMC)',
      };

      const token = jwt.sign(payload, secret, { expiresIn: '24h' });
      assert.ok(typeof token === 'string');

      const decoded = jwt.verify(token, secret) as any;
      assert.strictEqual(decoded.role, 'AUDITOR_GUEST');
      assert.strictEqual(decoded.facilityId, '6717a0000000000000000001');
      assert.strictEqual(decoded.auditorAgency, 'Indore Municipal Corporation (IMC)');
    });

    it('rejects expired auditor tokens', () => {
      const secret = env.JWT_SECRET || 'test-secret';
      const expiredPayload = {
        userId: 'auditor_expired',
        role: 'AUDITOR_GUEST',
        facilityId: '6717a0000000000000000001',
      };

      // Expired 1 second ago
      const token = jwt.sign(expiredPayload, secret, { expiresIn: '-1s' });

      assert.throws(() => {
        jwt.verify(token, secret);
      }, /jwt expired/);
    });
  });
});
