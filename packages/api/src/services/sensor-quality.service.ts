import { ITelemetryQuality, SensorQualityStatus } from '../db/models/LiveTelemetry';

export interface RawSensorReading {
  tempC: number;
  moisturePct: number;
  ph: number;
  methanePpm: number;
  airPressureHpa: number;
  batteryMv: number;
  signalRssi: number;
}

export interface HistoricalReading {
  tempC: number;
  moisturePct: number;
  ph: number;
  methanePpm: number;
  airPressureHpa: number;
  timestamp: Date | string;
}

export interface QualityValidationResult {
  cleaned: RawSensorReading;
  quality: ITelemetryQuality;
}

// Physical operational boundaries for Indore Smart Spear nodes
export const SENSOR_BOUNDS = {
  TEMP_MIN: -10,
  TEMP_MAX: 95,
  MOISTURE_MIN: 0,
  MOISTURE_MAX: 100,
  PH_MIN: 2.0,
  PH_MAX: 12.0,
  METHANE_MIN: 0,
  METHANE_MAX: 50000,
  PRESSURE_MIN: 850,
  PRESSURE_MAX: 1100,
  BATTERY_MIN: 2400,
  BATTERY_MAX: 4500,
  MAX_TEMP_STEP_PER_15MIN: 15.0, // °C max physical rise without external heat
  MAX_MOISTURE_STEP_PER_15MIN: 25.0, // %
};

/**
 * Calculates median of an array of numbers
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Hampel filter for single outlier detection using Median Absolute Deviation (MAD)
 */
function hampelCheck(
  value: number,
  history: number[],
  thresholdMultiplier = 3.0
): { isSpike: boolean; medianValue: number } {
  if (history.length < 3) return { isSpike: false, medianValue: value };

  const med = median(history);
  const deviations = history.map((v) => Math.abs(v - med));
  const mad = median(deviations);

  // Standard normal consistency factor
  const sigma = 1.4826 * mad;

  if (sigma > 0.001) {
    const diff = Math.abs(value - med);
    if (diff > thresholdMultiplier * sigma) {
      return { isSpike: true, medianValue: med };
    }
  }

  return { isSpike: false, medianValue: med };
}

/**
 * Checks if a sensor has been stuck at an identical value for consecutive readings
 */
function isFrozen(history: number[]): boolean {
  if (history.length < 8) return false;
  const first = history[0];
  return history.every((v) => Math.abs(v - first) < 0.0001);
}

/**
 * Validates, filters, and sanitizes incoming hardware telemetry
 */
export function validateSensorQuality(
  incoming: RawSensorReading,
  recentHistory: HistoricalReading[] = []
): QualityValidationResult {
  const issues: string[] = [];
  let status: SensorQualityStatus = 'VALID';

  const cleaned: RawSensorReading = { ...incoming };

  const rawValues = {
    rawTempC: incoming.tempC,
    rawMoisturePct: incoming.moisturePct,
    rawPh: incoming.ph,
    rawMethanePpm: incoming.methanePpm,
    rawPressureHpa: incoming.airPressureHpa,
  };

  // 1. Physical Bounds Checks
  if (incoming.tempC < SENSOR_BOUNDS.TEMP_MIN || incoming.tempC > SENSOR_BOUNDS.TEMP_MAX) {
    issues.push(`Temperature ${incoming.tempC}°C out of physical bounds [${SENSOR_BOUNDS.TEMP_MIN}, ${SENSOR_BOUNDS.TEMP_MAX}]`);
    status = 'OUT_OF_BOUNDS';
    cleaned.tempC = Math.max(SENSOR_BOUNDS.TEMP_MIN, Math.min(SENSOR_BOUNDS.TEMP_MAX, incoming.tempC));
  }

  if (incoming.moisturePct < SENSOR_BOUNDS.MOISTURE_MIN || incoming.moisturePct > SENSOR_BOUNDS.MOISTURE_MAX) {
    issues.push(`Moisture ${incoming.moisturePct}% out of bounds [0, 100]`);
    status = 'OUT_OF_BOUNDS';
    cleaned.moisturePct = Math.max(0, Math.min(100, incoming.moisturePct));
  }

  if (incoming.ph < SENSOR_BOUNDS.PH_MIN || incoming.ph > SENSOR_BOUNDS.PH_MAX) {
    issues.push(`pH ${incoming.ph} out of biological sensor bounds [2.0, 12.0]`);
    status = 'OUT_OF_BOUNDS';
    cleaned.ph = Math.max(SENSOR_BOUNDS.PH_MIN, Math.min(SENSOR_BOUNDS.PH_MAX, incoming.ph));
  }

  if (incoming.airPressureHpa < SENSOR_BOUNDS.PRESSURE_MIN || incoming.airPressureHpa > SENSOR_BOUNDS.PRESSURE_MAX) {
    issues.push(`Barometric pressure ${incoming.airPressureHpa} hPa out of bounds [850, 1100]`);
    status = 'OUT_OF_BOUNDS';
    cleaned.airPressureHpa = Math.max(SENSOR_BOUNDS.PRESSURE_MIN, Math.min(SENSOR_BOUNDS.PRESSURE_MAX, incoming.airPressureHpa));
  }

  if (incoming.methanePpm < SENSOR_BOUNDS.METHANE_MIN || incoming.methanePpm > SENSOR_BOUNDS.METHANE_MAX) {
    issues.push(`Methane ${incoming.methanePpm} PPM out of bounds`);
    status = 'OUT_OF_BOUNDS';
    cleaned.methanePpm = Math.max(0, incoming.methanePpm);
  }

  // 2. Hampel Spike Rejection
  if (recentHistory.length >= 3) {
    const tempHistory = recentHistory.map((r) => r.tempC);
    const tempHampel = hampelCheck(cleaned.tempC, tempHistory);
    if (tempHampel.isSpike) {
      issues.push(`Hampel spike detected on Temperature: ${cleaned.tempC}°C -> suppressed to median ${tempHampel.medianValue}°C`);
      cleaned.tempC = tempHampel.medianValue;
      if (status !== 'OUT_OF_BOUNDS') status = 'SPIKE_SUPPRESSED';
    }

    const moistHistory = recentHistory.map((r) => r.moisturePct);
    const moistHampel = hampelCheck(cleaned.moisturePct, moistHistory);
    if (moistHampel.isSpike) {
      issues.push(`Hampel spike detected on Moisture: ${cleaned.moisturePct}% -> suppressed to median ${moistHampel.medianValue}%`);
      cleaned.moisturePct = moistHampel.medianValue;
      if (status !== 'OUT_OF_BOUNDS') status = 'SPIKE_SUPPRESSED';
    }

    const pressureHistory = recentHistory.map((r) => r.airPressureHpa);
    const pressureHampel = hampelCheck(cleaned.airPressureHpa, pressureHistory);
    if (pressureHampel.isSpike) {
      issues.push(`Hampel spike on Pressure: ${cleaned.airPressureHpa} hPa -> suppressed to median ${pressureHampel.medianValue} hPa`);
      cleaned.airPressureHpa = pressureHampel.medianValue;
      if (status !== 'OUT_OF_BOUNDS') status = 'SPIKE_SUPPRESSED';
    }

    // 3. Frozen Sensor Check (Stuck at identical float value)
    if (recentHistory.length >= 8) {
      if (isFrozen([...tempHistory, incoming.tempC])) {
        issues.push('Temperature sensor stuck: 8+ identical consecutive readings');
        status = 'SENSOR_FROZEN';
      }
      if (isFrozen([...moistHistory, incoming.moisturePct])) {
        issues.push('Moisture sensor stuck: 8+ identical consecutive readings');
        status = 'SENSOR_FROZEN';
      }
    }
  }

  return {
    cleaned,
    quality: {
      status,
      issues: issues.length > 0 ? issues : undefined,
      ...rawValues,
    },
  };
}
