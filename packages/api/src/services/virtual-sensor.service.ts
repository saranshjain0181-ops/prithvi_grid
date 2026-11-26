import { Types } from 'mongoose';
import { SensorTrustRecord, ISensorTrustRecord, ISensorHealthMetrics } from '../db/models/SensorTrustScore';

export interface VirtualSensorEstimate {
  sensorType: 'MOISTURE' | 'PH' | 'METHANE';
  estimatedValue: number;
  uncertaintyBand: { min: number; max: number };
  isEstimated: true; // Hardcoded true for honest transparency
  confidencePct: number;
  basis: string;
}

export interface EvaluateNodeSensorsInput {
  nodeId: string | Types.ObjectId;
  pitId: string | Types.ObjectId;
  facilityId: string | Types.ObjectId;
  readings: {
    tempC?: number;
    moisturePct?: number;
    ph?: number;
    methanePpm?: number;
    airPressureHpa?: number;
    ambientTempC?: number;
  };
  historicalReadings?: Array<{
    tempC: number;
    moisturePct: number;
    ph: number;
    methanePpm: number;
    recordedAt: Date;
  }>;
  lastWateringHoursAgo?: number;
  lastLoadedHoursAgo?: number;
  calibrationAges?: {
    phDays?: number;
    moistureDays?: number;
    methaneDays?: number;
  };
}

/**
 * 1. Virtual Moisture Estimator
 * Models moisture loss via thermophilic vaporization and ambient dry air.
 */
export function estimateVirtualMoisture(params: {
  coreTempC: number;
  ambientTempC: number;
  lastWateringHoursAgo: number;
  lastKnownMoisturePct?: number;
}): VirtualSensorEstimate {
  const baseMoisture = params.lastKnownMoisturePct ?? 55;
  const hours = Math.max(0, params.lastWateringHoursAgo);
  const tempDelta = Math.max(0, params.coreTempC - params.ambientTempC);

  // Evaporative loss rate increases with high thermophilic delta
  const evaporationRatePerHour = 0.15 + (tempDelta / 50) * 0.25;
  const estimatedValue = Math.max(20, Math.min(80, baseMoisture - (hours * evaporationRatePerHour)));

  return {
    sensorType: 'MOISTURE',
    estimatedValue: Number(estimatedValue.toFixed(1)),
    uncertaintyBand: {
      min: Number((estimatedValue - 6.0).toFixed(1)),
      max: Number((estimatedValue + 6.0).toFixed(1)),
    },
    isEstimated: true,
    confidencePct: Math.max(40, 90 - (hours * 1.5)),
    basis: `Thermophilic evaporation model (Core: ${params.coreTempC}°C, Ambient: ${params.ambientTempC}°C, Elapsed: ${hours}h)`,
  };
}

/**
 * 2. Virtual pH Acid-Crash Proxy
 * Predicts acidification risk when high-protein/oily food waste decomposes anaerobically.
 */
export function estimateVirtualPh(params: {
  tempSlopePerHour: number; // e.g. -1.2 °C/hr
  methaneSlopePerHour: number; // e.g. +15 ppm/hr
  lastLoadedHoursAgo: number;
  lastKnownPh?: number;
}): VirtualSensorEstimate {
  const basePh = params.lastKnownPh ?? 6.8;
  let estimatedPh = basePh;
  let confidence = 80;

  // Acid-crash indicators: falling temperature combined with rising methane post-loading
  if (params.tempSlopePerHour < -0.5 && params.methaneSlopePerHour > 10) {
    const acidificationImpact = Math.min(2.0, (Math.abs(params.tempSlopePerHour) * 0.4) + (params.methaneSlopePerHour * 0.02));
    estimatedPh = Math.max(4.0, basePh - acidificationImpact);
    confidence = 85;
  }

  return {
    sensorType: 'PH',
    estimatedValue: Number(estimatedPh.toFixed(2)),
    uncertaintyBand: {
      min: Number((estimatedPh - 0.4).toFixed(2)),
      max: Number((estimatedPh + 0.4).toFixed(2)),
    },
    isEstimated: true,
    confidencePct: confidence,
    basis: `Biochemical acidification kinetics (TempSlope: ${params.tempSlopePerHour}°C/h, CH4Slope: ${params.methaneSlopePerHour} ppm/h)`,
  };
}

/**
 * 3. Virtual Methane Proxy
 * Infers compaction and anaerobic methanogenesis from barometric pressure and pile stagnation.
 */
export function estimateVirtualMethane(params: {
  airPressureHpa: number;
  tempC: number;
  stagnationHours: number;
}): VirtualSensorEstimate {
  const isCompacted = params.airPressureHpa > 1014;
  let estimatedPpm = 95;

  if (isCompacted && params.tempC > 50) {
    estimatedPpm += Math.min(350, params.stagnationHours * 4.5);
  }

  return {
    sensorType: 'METHANE',
    estimatedValue: Math.round(estimatedPpm),
    uncertaintyBand: {
      min: Math.max(20, Math.round(estimatedPpm * 0.75)),
      max: Math.round(estimatedPpm * 1.35),
    },
    isEstimated: true,
    confidencePct: 75,
    basis: `Bed compaction differential (Pressure: ${params.airPressureHpa} hPa, Pile Age: ${params.stagnationHours}h)`,
  };
}

/**
 * Computes Sensor Trust Score (0-100) for a physical probe.
 */
export function computeIndividualSensorTrust(params: {
  sensorType: ISensorHealthMetrics['sensorType'];
  measuredValue: number;
  virtualValue?: number;
  calibrationAgeDays: number;
  isStuck: boolean;
  noisePct: number;
}): ISensorHealthMetrics {
  let score = 100;
  let status: ISensorHealthMetrics['status'] = 'HEALTHY';
  let action: string | undefined;

  // 1. Stuck signal penalty
  if (params.isStuck) {
    score -= 50;
    status = 'FAILED';
    action = 'SENSOR_SIGNAL_FROZEN';
  }

  // 2. Calibration age penalty
  if (params.calibrationAgeDays > 60) {
    score -= 35;
    if (status !== 'FAILED') status = 'DEGRADED';
    action = action ?? 'CALIBRATION_CRITICALLY_OVERDUE';
  } else if (params.calibrationAgeDays > 30) {
    score -= 15;
    if (status !== 'FAILED') status = 'DEGRADED';
    action = action ?? 'CALIBRATION_RECOMMENDED';
  }

  // 3. Noise penalty
  if (params.noisePct > 30) {
    score -= 25;
    if (status !== 'FAILED') status = 'DEGRADED';
    action = action ?? 'EXCESSIVE_ELECTRICAL_NOISE';
  }

  // 4. Divergence from virtual sensor proxy
  let divergencePct = 0;
  if (params.virtualValue !== undefined && params.virtualValue > 0) {
    divergencePct = Math.min(100, Math.abs(((params.measuredValue - params.virtualValue) / params.virtualValue) * 100));
    if (divergencePct > 45) {
      score -= 20;
      if (status !== 'FAILED') status = 'DEGRADED';
      action = action ?? 'HIGH_DIVERGENCE_FROM_VIRTUAL_PROXY';
    }
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  return {
    sensorType: params.sensorType,
    trustScore: finalScore,
    calibrationAgeDays: params.calibrationAgeDays,
    driftPpmOrUnit: Number((divergencePct * 0.1).toFixed(2)),
    stuckSignalFlag: params.isStuck,
    noiseLevelPct: params.noisePct,
    virtualSensorDivergencePct: Number(divergencePct.toFixed(1)),
    status,
    actionRequired: action,
  };
}

export class VirtualSensorService {
  /**
   * Evaluates all sensors on a Smart Spear node and executes the Truck-Roll Avoidance state machine.
   */
  public async evaluateNodeHealthAndTrust(input: EvaluateNodeSensorsInput): Promise<ISensorTrustRecord> {
    const nodeObjId = new Types.ObjectId(input.nodeId.toString());
    const pitObjId = new Types.ObjectId(input.pitId.toString());
    const facilityObjId = new Types.ObjectId(input.facilityId.toString());

    const coreTemp = input.readings.tempC ?? 55.0;
    const ambientTemp = input.readings.ambientTempC ?? 28.0;

    // 1. Generate Virtual Estimates
    const vMoisture = estimateVirtualMoisture({
      coreTempC: coreTemp,
      ambientTempC: ambientTemp,
      lastWateringHoursAgo: input.lastWateringHoursAgo ?? 24,
      lastKnownMoisturePct: input.readings.moisturePct,
    });

    const vPh = estimateVirtualPh({
      tempSlopePerHour: -0.2,
      methaneSlopePerHour: 4.0,
      lastLoadedHoursAgo: input.lastLoadedHoursAgo ?? 12,
      lastKnownPh: input.readings.ph,
    });

    const vMethane = estimateVirtualMethane({
      airPressureHpa: input.readings.airPressureHpa ?? 1012.0,
      tempC: coreTemp,
      stagnationHours: 18,
    });

    // 2. Evaluate individual probes
    const probes: ISensorHealthMetrics[] = [];

    if (input.readings.moisturePct !== undefined) {
      probes.push(computeIndividualSensorTrust({
        sensorType: 'MOISTURE',
        measuredValue: input.readings.moisturePct,
        virtualValue: vMoisture.estimatedValue,
        calibrationAgeDays: input.calibrationAges?.moistureDays ?? 12,
        isStuck: false,
        noisePct: 6,
      }));
    }

    if (input.readings.ph !== undefined) {
      probes.push(computeIndividualSensorTrust({
        sensorType: 'PH',
        measuredValue: input.readings.ph,
        virtualValue: vPh.estimatedValue,
        calibrationAgeDays: input.calibrationAges?.phDays ?? 15,
        isStuck: false,
        noisePct: 8,
      }));
    }

    if (input.readings.methanePpm !== undefined) {
      probes.push(computeIndividualSensorTrust({
        sensorType: 'METHANE',
        measuredValue: input.readings.methanePpm,
        virtualValue: vMethane.estimatedValue,
        calibrationAgeDays: input.calibrationAges?.methaneDays ?? 20,
        isStuck: false,
        noisePct: 10,
      }));
    }

    if (input.readings.tempC !== undefined) {
      probes.push(computeIndividualSensorTrust({
        sensorType: 'TEMPERATURE',
        measuredValue: input.readings.tempC,
        calibrationAgeDays: 5,
        isStuck: false,
        noisePct: 2,
      }));
    }

    // 3. Compute overall node trust score
    const avgScore = probes.length > 0
      ? Math.round(probes.reduce((sum, p) => sum + p.trustScore, 0) / probes.length)
      : 80;

    // 4. Execute Truck-Roll Avoidance State Machine
    let recommendedAction: ISensorTrustRecord['recommendedAction'] = 'NO_ACTION';
    let targetStage: ISensorTrustRecord['truckRollAvoidance']['currentStage'] = 'STAGE_0_NORMAL';
    const logNotes: string[] = [];

    if (avgScore >= 75) {
      targetStage = 'STAGE_0_NORMAL';
      recommendedAction = 'NO_ACTION';
      logNotes.push('Node sensors healthy. No technician intervention required.');
    } else if (avgScore >= 60) {
      targetStage = 'STAGE_1_REMOTE_DIAGNOSTICS';
      recommendedAction = 'FORCE_READ';
      logNotes.push('Mild sensor degradation detected. Queuing dense sampling burst on next wake appointment.');
    } else if (avgScore >= 45) {
      targetStage = 'STAGE_2_REMOTE_SELF_CLEAN';
      recommendedAction = 'BUZZER_TEST';
      logNotes.push('Moderate sensor degradation. Triggering piggyback piezoelectric buzzer acoustic vibration test to clear biofilm.');
    } else if (avgScore >= 35) {
      targetStage = 'STAGE_3_GROUND_ASSIST';
      recommendedAction = 'REMOTE_CALIBRATION';
      logNotes.push('Persistent sensor fouling. Prompting Safai Mitra via PWA to rinse probe shroud with water during morning round.');
    } else {
      targetStage = 'STAGE_4_BATCHED_DISPATCH';
      recommendedAction = 'DISPATCH_FIELD_VISIT';
      logNotes.push('Critical hardware failure. Remote recovery failed. Queuing ₹750 field service visit batched with nearby IMC zone pits.');
    }

    const doc = await SensorTrustRecord.create({
      nodeId: nodeObjId,
      pitId: pitObjId,
      facilityId: facilityObjId,
      assessedAt: new Date(),
      overallNodeTrustScore: avgScore,
      sensorMetrics: probes,
      recommendedAction,
      truckRollAvoidance: {
        currentStage: targetStage,
        lastStageTransitionAt: new Date(),
        resolvedWithoutDispatch: targetStage !== 'STAGE_4_BATCHED_DISPATCH',
        avoidanceLogNotes: logNotes,
      },
    });

    return doc;
  }
}

export const virtualSensorService = new VirtualSensorService();
