import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AI_THRESHOLDS } from '../src/config/constants';

describe('Kaam Ka Saboot v2 — Algorithmic Integrity & Labour Fairness (B1)', () => {
  interface TelemetrySample {
    tempC: number;
    moisturePct: number;
    airPressureHpa: number;
  }

  function evaluateLabourAction(
    actionType: string,
    before: TelemetrySample | null,
    after: TelemetrySample | null
  ): { status: 'VERIFIED_GENUINE' | 'FAKE_FLAG' | 'INCONCLUSIVE'; reason?: string } {
    if (!before && !after) {
      return { status: 'INCONCLUSIVE', reason: 'Node sleeping during verification window' };
    }
    if (!before) {
      return { status: 'INCONCLUSIVE', reason: 'Baseline telemetry missing at t0' };
    }
    if (!after) {
      return { status: 'INCONCLUSIVE', reason: 'Follow-up telemetry missing at t15' };
    }

    const deltaTemp = Math.abs(after.tempC - before.tempC);
    const deltaMoisture = Math.abs(after.moisturePct - before.moisturePct);
    const deltaPressure = Math.abs(after.airPressureHpa - before.airPressureHpa);

    const { TEMP_MIN_CHANGE, MOISTURE_MIN_CHANGE, PRESSURE_MIN_CHANGE } =
      AI_THRESHOLDS.VERIFICATION_DELTA;

    const actionUpper = actionType.toUpperCase();
    let isGenuine = false;

    if (actionUpper.includes('PAANI') || actionUpper.includes('GUD') || actionUpper.includes('WATER')) {
      isGenuine = deltaMoisture >= MOISTURE_MIN_CHANGE || deltaTemp >= TEMP_MIN_CHANGE;
    } else if (actionUpper.includes('GHUMAYA') || actionUpper.includes('TURN') || actionUpper.includes('LEVEL')) {
      isGenuine = deltaPressure >= PRESSURE_MIN_CHANGE || deltaTemp >= TEMP_MIN_CHANGE;
    } else if (actionUpper.includes('KHAD_NIKALI') || actionUpper.includes('HARVEST')) {
      isGenuine = deltaPressure >= PRESSURE_MIN_CHANGE || deltaTemp >= TEMP_MIN_CHANGE;
    } else {
      isGenuine =
        deltaTemp >= TEMP_MIN_CHANGE ||
        deltaMoisture >= MOISTURE_MIN_CHANGE ||
        deltaPressure >= PRESSURE_MIN_CHANGE;
    }

    return { status: isGenuine ? 'VERIFIED_GENUINE' : 'FAKE_FLAG' };
  }

  it('yields INCONCLUSIVE when node was sleeping during task verification', () => {
    // Labour tapped Mark Done, but node supercapacitor was charging (no radio transmission)
    const result = evaluateLabourAction('PAANI_CHHIDKA', null, null);
    assert.strictEqual(result.status, 'INCONCLUSIVE');
    assert.ok(result.reason?.includes('Node sleeping'));
  });

  it('yields INCONCLUSIVE if follow-up t15 packet was dropped', () => {
    const before = { tempC: 56.0, moisturePct: 45.0, airPressureHpa: 1012.0 };
    const result = evaluateLabourAction('KACHRA_GHUMAYA', before, null);
    assert.strictEqual(result.status, 'INCONCLUSIVE');
  });

  it('yields VERIFIED_GENUINE when physical sensor signature matches watering task', () => {
    const before = { tempC: 58.0, moisturePct: 42.0, airPressureHpa: 1012.0 };
    const after = { tempC: 55.5, moisturePct: 47.5, airPressureHpa: 1012.1 }; // +5.5% moisture, -2.5°C evaporative cooling

    const result = evaluateLabourAction('PAANI_CHHIDKA', before, after);
    assert.strictEqual(result.status, 'VERIFIED_GENUINE');
  });

  it('yields VERIFIED_GENUINE when turning action loosens pit compaction pressure', () => {
    const before = { tempC: 56.0, moisturePct: 52.0, airPressureHpa: 1016.5 };
    const after = { tempC: 53.0, moisturePct: 51.8, airPressureHpa: 1014.2 }; // -2.3 hPa pressure drop & -3°C aeration

    const result = evaluateLabourAction('KACHRA_GHUMAYA', before, after);
    assert.strictEqual(result.status, 'VERIFIED_GENUINE');
  });

  it('yields FAKE_FLAG only when telemetry was 100% active and proved zero variance', () => {
    const before = { tempC: 58.0, moisturePct: 42.0, airPressureHpa: 1012.0 };
    const after = { tempC: 58.02, moisturePct: 42.05, airPressureHpa: 1012.01 }; // Flat zero physical change

    const result = evaluateLabourAction('PAANI_CHHIDKA', before, after);
    assert.strictEqual(result.status, 'FAKE_FLAG');
  });
});
