import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateSensorQuality } from '../src/services/sensor-quality.service';

describe('Sensor Quality Layer & Hampel Filter (A7)', () => {
  it('enforces physical bounds on out-of-range sensor readings', () => {
    const rawReading = {
      tempC: 150.0, // Impossible compost temperature
      moisturePct: 120.0, // Impossible percentage
      ph: 15.0, // Impossible pH
      methanePpm: -50, // Negative methane
      airPressureHpa: 500, // Stratospheric pressure
      batteryMv: 3800,
      signalRssi: -70,
    };

    const { cleaned, quality } = validateSensorQuality(rawReading, []);

    assert.strictEqual(quality.status, 'OUT_OF_BOUNDS');
    assert.strictEqual(cleaned.tempC, 95); // Clipped to MAX
    assert.strictEqual(cleaned.moisturePct, 100);
    assert.strictEqual(cleaned.ph, 12.0);
    assert.strictEqual(cleaned.methanePpm, 0);
    assert.strictEqual(cleaned.airPressureHpa, 850);
  });

  it('detects and suppresses single transient hardware spikes using Hampel filter', () => {
    // Normal steady thermophilic history around 58°C
    const history = [
      { tempC: 57.8, moisturePct: 52.0, ph: 6.8, methanePpm: 120, airPressureHpa: 1012.0, timestamp: new Date() },
      { tempC: 58.2, moisturePct: 52.1, ph: 6.8, methanePpm: 125, airPressureHpa: 1012.1, timestamp: new Date() },
      { tempC: 58.0, moisturePct: 52.0, ph: 6.8, methanePpm: 122, airPressureHpa: 1012.0, timestamp: new Date() },
      { tempC: 58.4, moisturePct: 52.2, ph: 6.9, methanePpm: 128, airPressureHpa: 1012.2, timestamp: new Date() },
    ];

    // Hardware electrical transient spike: 89°C (jump of >30°C in 15 minutes)
    const spikeReading = {
      tempC: 89.0,
      moisturePct: 52.0,
      ph: 6.8,
      methanePpm: 120,
      airPressureHpa: 1012.0,
      batteryMv: 3800,
      signalRssi: -65,
    };

    const { cleaned, quality } = validateSensorQuality(spikeReading, history);

    assert.strictEqual(quality.status, 'SPIKE_SUPPRESSED');
    assert.ok(cleaned.tempC < 65, `Expected cleaned temp near median (~58°C), got ${cleaned.tempC}`);
    assert.strictEqual(quality.rawTempC, 89.0);
  });

  it('detects frozen / stuck sensor values', () => {
    // 8 identical readings (zero standard deviation)
    const frozenHistory = Array.from({ length: 8 }, () => ({
      tempC: 25.0,
      moisturePct: 50.0,
      ph: 7.0,
      methanePpm: 100,
      airPressureHpa: 1013.25,
      timestamp: new Date(),
    }));

    const reading = {
      tempC: 25.0,
      moisturePct: 50.0,
      ph: 7.0,
      methanePpm: 100,
      airPressureHpa: 1013.25,
      batteryMv: 3700,
      signalRssi: -70,
    };

    const { quality } = validateSensorQuality(reading, frozenHistory);
    assert.strictEqual(quality.status, 'SENSOR_FROZEN');
  });
});
