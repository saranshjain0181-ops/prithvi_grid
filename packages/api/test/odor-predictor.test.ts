import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getIndoreDiurnalAtmosphericTide,
  computeCompensatedGaugePressure,
} from '../src/services/odor.service';

describe('Odor Predictor v2 — Diurnal Weather Compensation & Anaerobic Detection (B3)', () => {
  it('computes realistic Central India diurnal atmospheric tides', () => {
    // 10:00 AM IST (solar atmospheric tide peak ~ +2.2 hPa)
    const morning10 = new Date('2026-10-22T04:30:00.000Z'); // 04:30 UTC = 10:00 IST
    const tideMorning = getIndoreDiurnalAtmosphericTide(morning10);
    assert.ok(tideMorning > 1.8, `Expected morning peak near +2.2 hPa, got ${tideMorning}`);

    // 04:00 PM IST (solar atmospheric tide trough ~ -2.2 hPa)
    const afternoon16 = new Date('2026-10-22T10:30:00.000Z'); // 10:30 UTC = 16:00 IST
    const tideAfternoon = getIndoreDiurnalAtmosphericTide(afternoon16);
    assert.ok(tideAfternoon < -1.8, `Expected afternoon trough near -2.2 hPa, got ${tideAfternoon}`);
  });

  it('removes weather tide to isolate true sub-surface compaction gauge pressure', () => {
    // Morning reading at 10:00 IST: Raw pressure reads 1016.2 hPa
    const morning10 = new Date('2026-10-22T04:30:00.000Z');
    const compMorning = computeCompensatedGaugePressure(1016.2, morning10);

    // Afternoon reading at 16:00 IST: Raw pressure dropped to 1011.8 hPa purely due to diurnal weather (-4.4 hPa)
    const afternoon16 = new Date('2026-10-22T10:30:00.000Z');
    const compAfternoon = computeCompensatedGaugePressure(1011.8, afternoon16);

    // Raw delta was 4.4 hPa (which without compensation falsely looked like rapid pit loosening!)
    const rawDelta = Math.abs(1011.8 - 1016.2);
    assert.ok(rawDelta > 4.0);

    // Compensated delta reveals that true compaction gauge pressure was completely static!
    const compensatedDelta = Math.abs(compAfternoon - compMorning);
    assert.ok(
      compensatedDelta < 0.5,
      `Expected true compaction delta < 0.5 hPa after compensation, got ${compensatedDelta}`
    );
  });
});
