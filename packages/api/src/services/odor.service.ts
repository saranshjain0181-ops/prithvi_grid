import { LiveTelemetry } from '../db/models/LiveTelemetry';
import { AiAlertSanjivani } from '../db/models/AiAlertSanjivani';
import { PhysicalAsset } from '../db/models/PhysicalAsset';
import { AI_THRESHOLDS } from '../config/constants';
import type { Server as SocketIOServer } from 'socket.io';

export interface OdorPredictionResult {
  nodeId: string;
  odorRisk: boolean;
  rawDeltaPressure: number;
  compensatedDeltaPressure: number;
  methaneRiseRatePerHour: number;
  predictionHours: number;
  message?: string;
  cooldownActive?: boolean;
}

/**
 * Computes diurnal solar thermal atmospheric tide for Central India (Indore, elevation ~550m).
 * Semi-diurnal harmonic S2 oscillates with an amplitude of ~2.2 hPa over a 12-hour cycle,
 * peaking near 10:00 AM / 10:00 PM local time (IST, UTC+5:30).
 */
export function getIndoreDiurnalAtmosphericTide(date: Date): number {
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60;
  const localIstHours = (utcHours + 5.5) % 24;
  // S2 semi-diurnal harmonic: period = 12h, peaks at 10:00 AM & 10:00 PM, troughs at 4:00 AM & 4:00 PM
  return 2.2 * Math.cos(((localIstHours - 10) * 2 * Math.PI) / 12);
}

/**
 * Removes natural barometric weather fluctuations to obtain true sub-surface compaction gauge pressure.
 */
export function computeCompensatedGaugePressure(measuredHpa: number, timestamp: Date): number {
  const weatherTide = getIndoreDiurnalAtmosphericTide(new Date(timestamp));
  return Number((measuredHpa - weatherTide).toFixed(2));
}

/**
 * Predicts foul odor 24 hours in advance by cross-verifying weather-compensated compaction pressure
 * and anaerobic methane spike trends over the past 6 hours.
 */
export async function evaluateOdorRisk(
  nodeId: string,
  facilityId: string,
  io?: SocketIOServer
): Promise<OdorPredictionResult> {
  const windowMs = AI_THRESHOLDS.ODOR_PREDICTION_WINDOW_HRS * 60 * 60 * 1000;
  const since = new Date(Date.now() - windowMs);

  const readings = await LiveTelemetry.find({
    nodeId,
    timestamp: { $gte: since },
  })
    .sort({ timestamp: 1 })
    .lean();

  if (readings.length < 3) {
    return {
      nodeId,
      odorRisk: false,
      rawDeltaPressure: 0,
      compensatedDeltaPressure: 0,
      methaneRiseRatePerHour: 0,
      predictionHours: 24,
      message: 'Insufficient historical telemetry points within 6-hour evaluation window',
    };
  }

  const first = readings[0];
  const last = readings[readings.length - 1];

  const durationHours =
    (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / (1000 * 60 * 60);

  if (durationHours < 1.0) {
    return {
      nodeId,
      odorRisk: false,
      rawDeltaPressure: 0,
      compensatedDeltaPressure: 0,
      methaneRiseRatePerHour: 0,
      predictionHours: 24,
      message: 'Sampling duration too short (< 1 hour)',
    };
  }

  // 1. Raw vs. Weather-compensated barometric pressure deltas
  const rawDeltaPressure = Number(Math.abs(last.airPressureHpa - first.airPressureHpa).toFixed(2));

  const firstCompensated = computeCompensatedGaugePressure(first.airPressureHpa, first.timestamp);
  const lastCompensated = computeCompensatedGaugePressure(last.airPressureHpa, last.timestamp);
  const compensatedDeltaPressure = Number(Math.abs(lastCompensated - firstCompensated).toFixed(2));

  // 2. Anaerobic Methane dynamics
  const deltaMethane = last.methanePpm - first.methanePpm;
  const methaneRiseRatePerHour = Number((deltaMethane / durationHours).toFixed(1));

  // Compaction signature:
  // In a clogged, compacted pit, pore air circulation ceases: compensated pressure remains static (<= 2.5 hPa delta)
  // while anaerobic methanogenesis surges (> 50 PPM/hr and latest methane > 300 PPM)
  const isCompactedOrStable = compensatedDeltaPressure <= 2.8;
  const isMethaneSurging =
    methaneRiseRatePerHour >= AI_THRESHOLDS.METHANE_RISE_RATE_PPM_PER_HR &&
    last.methanePpm >= AI_THRESHOLDS.METHANE_ALERT;

  if (isCompactedOrStable && isMethaneSurging) {
    // Check if an active unacknowledged odor alert was already issued within 12 hours (hysteresis)
    const recentAlert = await AiAlertSanjivani.findOne({
      nodeId,
      alertType: 'ODOR_WARNING',
      status: { $in: ['OPEN', 'ACKNOWLEDGED'] },
      createdAt: { $gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
    });

    if (recentAlert) {
      return {
        nodeId,
        odorRisk: true,
        cooldownActive: true,
        rawDeltaPressure,
        compensatedDeltaPressure,
        methaneRiseRatePerHour,
        predictionHours: 24,
        message: 'Odor risk ongoing. Repeated alert suppressed by 12-hr debounce window.',
      };
    }

    // Lookup pit size to scale neem and carbon recommendations
    const nodeAsset = await PhysicalAsset.findById(nodeId).lean();
    let capacityKg = 1000;
    let entityId = nodeAsset?.entityId;

    if (nodeAsset?.parentBoxId) {
      const box = await PhysicalAsset.findById(nodeAsset.parentBoxId).lean();
      if (box?.capacityKg) capacityKg = box.capacityKg;
      if (box?.entityId) entityId = box.entityId;
    }

    const scale = Math.max(0.2, Math.min(20, capacityKg / 1000));
    const neemCakeKg = Math.round(4 * scale);

    const alertDoc = await AiAlertSanjivani.create({
      entityId,
      facilityId,
      nodeId,
      boxId: nodeAsset?.parentBoxId,
      alertType: 'ODOR_WARNING',
      severity: 'WARNING',
      status: 'OPEN',
      triggerValues: {
        airPressureHpa: last.airPressureHpa,
        methanePpm: last.methanePpm,
        methaneRiseRatePerHour,
        compensatedDeltaPressure,
      },
      recipeCard: {
        problem: `Micro-Atmospheric Odor Warning (24-Hour Advance Predictor)`,
        diagnosis: `Compacted bottom layer with anaerobic methane surge (${methaneRiseRatePerHour} PPM/hr) in ${capacityKg}kg pit. Foul odor outbreak predicted within 24 hours.`,
        actions: [
          `Turn compost immediately from bottom up to relieve compaction (aerobic venting).`,
          `Dust ${neemCakeKg} kg neem seed cake or spray bio-enzymatic odor neutralizer over top surface.`,
          `Inspect and clear leachate exit drain pipe.`,
        ],
        estimatedRecoveryHrs: 24,
      },
      whatsappSent: false,
    });

    if (io) {
      io.to(`facility:${facilityId}`).emit('odor:warning', {
        alertId: alertDoc._id,
        nodeId,
        facilityId,
        rawDeltaPressure,
        compensatedDeltaPressure,
        methaneRiseRatePerHour,
        predictedOutbreakHours: 24,
      });
    }

    return {
      nodeId,
      odorRisk: true,
      cooldownActive: false,
      rawDeltaPressure,
      compensatedDeltaPressure,
      methaneRiseRatePerHour,
      predictionHours: 24,
      message: 'Critical compaction and anaerobic methane surge detected — 24-hr advance odor alert issued',
    };
  }

  return {
    nodeId,
    odorRisk: false,
    rawDeltaPressure,
    compensatedDeltaPressure,
    methaneRiseRatePerHour,
    predictionHours: 24,
  };
}
