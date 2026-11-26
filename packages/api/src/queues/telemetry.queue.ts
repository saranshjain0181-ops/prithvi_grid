import { Queue, Worker, Job } from 'bullmq';
import { env } from '../config/env';
import { QUEUE_NAMES } from '../config/constants';
import { LiveTelemetry } from '../db/models/LiveTelemetry';
import { PhysicalAsset } from '../db/models/PhysicalAsset';
import { evaluateSanjivaniTrigger } from '../services/sanjivani.service';
import { validateSensorQuality } from '../services/sensor-quality.service';
import { assessHardwareHealth } from '../services/hardware-health.service';
import { evaluateDeviceLifecycle, transitionDeviceStatus } from '../services/device-lifecycle.service';
import { evaluateOtaEligibility, stageOtaForNode } from '../services/ota.service';
import type { Server as SocketIOServer } from 'socket.io';

export interface TelemetryJobData {
  nodeId: string;
  facilityId: string;
  entityId: string;
  boxId?: string;
  timestamp: string;
  tempC: number;
  moisturePct: number;
  ph: number;
  methanePpm: number;
  airPressureHpa: number;
  batteryMv: number;
  signalRssi: number;
  rawEncrypted?: string;
}

let telemetryQueue: Queue<TelemetryJobData> | null = null;
let telemetryDlq: Queue<any> | null = null;
let telemetryWorker: Worker<TelemetryJobData> | null = null;
let globalIo: SocketIOServer | null = null;

export function getTelemetryDlq(): Queue<any> {
  if (!telemetryDlq) {
    telemetryDlq = new Queue(QUEUE_NAMES.TELEMETRY_DLQ, {
      connection: { url: env.REDIS_URL },
    });
    telemetryDlq.on('error', () => {});
  }
  return telemetryDlq;
}

export function getTelemetryQueue(): Queue<TelemetryJobData> {
  if (!telemetryQueue) {
    telemetryQueue = new Queue<TelemetryJobData>(QUEUE_NAMES.TELEMETRY_INGEST, {
      connection: { url: env.REDIS_URL },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });

    telemetryQueue.on('error', (err) => {
      // Gracefully handle Redis offline in local environment
    });
  }
  return telemetryQueue;
}

/**
 * Direct synchronous processor used when Redis is unavailable or in test environments.
 */
export async function processTelemetryPacket(data: TelemetryJobData, io?: SocketIOServer) {
  const effectiveIo = io || globalIo;
  const timestamp = new Date(data.timestamp);

  // 1. Fetch recent history for Hampel filter & stuck-sensor analysis
  const recentHistory = await LiveTelemetry.find({ nodeId: data.nodeId })
    .sort({ timestamp: -1 })
    .limit(10)
    .select('tempC moisturePct ph methanePpm airPressureHpa timestamp')
    .lean();

  // 2. Validate sensor data quality layer
  const { cleaned, quality } = validateSensorQuality(
    {
      tempC: data.tempC,
      moisturePct: data.moisturePct,
      ph: data.ph,
      methanePpm: data.methanePpm,
      airPressureHpa: data.airPressureHpa,
      batteryMv: data.batteryMv,
      signalRssi: data.signalRssi,
    },
    recentHistory
  );

  // 3. Store in LiveTelemetry collection
  const telemetryDoc = await LiveTelemetry.create({
    nodeId: data.nodeId,
    facilityId: data.facilityId,
    entityId: data.entityId,
    boxId: data.boxId,
    timestamp,
    tempC: cleaned.tempC,
    moisturePct: cleaned.moisturePct,
    ph: cleaned.ph,
    methanePpm: cleaned.methanePpm,
    airPressureHpa: cleaned.airPressureHpa,
    batteryMv: cleaned.batteryMv,
    signalRssi: cleaned.signalRssi,
    quality,
    rawEncrypted: data.rawEncrypted,
  });

  // 2. Hardware health assessment & lifecycle state machine
  const hardwareAssessment = assessHardwareHealth({
    supercapMv: data.batteryMv,
    signalRssi: data.signalRssi,
  });

  const nodeDoc = await PhysicalAsset.findById(data.nodeId);
  if (nodeDoc) {
    const lifecycleTransition = evaluateDeviceLifecycle({
      currentStatus: nodeDoc.status,
      lastSeenAt: nodeDoc.lastSeenAt,
      supercapVoltageMv: data.batteryMv,
      vDropBurstMv: hardwareAssessment.vDropBurstMv,
      healthScorePct: hardwareAssessment.healthScorePct,
      now: new Date(),
    });

    if (lifecycleTransition.shouldTransition) {
      await transitionDeviceStatus(
        nodeDoc._id,
        lifecycleTransition.toStatus,
        lifecycleTransition.reason,
        'SYSTEM:TELEMETRY_INGEST'
      );
    } else {
      nodeDoc.lastSeenAt = new Date();
      nodeDoc.supercapacitorHealth = {
        voltageMv: hardwareAssessment.voltageMv,
        vDropBurstMv: hardwareAssessment.vDropBurstMv,
        tegDeltaTC: hardwareAssessment.tegDeltaTC,
        harvestEfficiencyPct: hardwareAssessment.harvestEfficiencyPct,
        estimatedEsrMilliOhms: hardwareAssessment.estimatedEsrMilliOhms,
        healthScorePct: hardwareAssessment.healthScorePct,
        brownoutRisk: hardwareAssessment.brownoutRisk,
        assessedAt: new Date(),
      };
      await nodeDoc.save();
    }

    // Check OTA firmware eligibility
    try {
      const otaCheck = await evaluateOtaEligibility(nodeDoc, data.batteryMv, data.signalRssi);
      if (otaCheck.isEligible && otaCheck.release && nodeDoc.otaLastStatus !== 'PENDING') {
        await stageOtaForNode(nodeDoc, otaCheck.release);
      }
    } catch {
      // Non-critical OTA check error suppression
    }
  }

  // 3. Broadcast real-time packet via Socket.IO
  if (effectiveIo) {
    effectiveIo.emit('telemetry:update', {
      nodeId: data.nodeId,
      facilityId: data.facilityId,
      boxId: data.boxId,
      timestamp,
      tempC: data.tempC,
      moisturePct: data.moisturePct,
      ph: data.ph,
      methanePpm: data.methanePpm,
      airPressureHpa: data.airPressureHpa,
      batteryMv: data.batteryMv,
      signalRssi: data.signalRssi,
    });
  }

  // 4. Evaluate biological Sanjivani triggers asynchronously
  evaluateSanjivaniTrigger(
    {
      facilityId: data.facilityId,
      nodeId: data.nodeId,
      boxId: data.boxId,
      tempC: data.tempC,
      ph: data.ph,
      moisturePct: data.moisturePct,
    },
    effectiveIo || undefined
  ).catch((err) => {
    console.error('[TelemetryQueue] Sanjivani evaluation error:', err.message);
  });

  return telemetryDoc;
}

export function initTelemetryWorker(io?: SocketIOServer): Worker<TelemetryJobData> {
  if (io) globalIo = io;
  if (telemetryWorker) return telemetryWorker;

  telemetryWorker = new Worker<TelemetryJobData>(
    QUEUE_NAMES.TELEMETRY_INGEST,
    async (job: Job<TelemetryJobData>) => {
      await processTelemetryPacket(job.data, io);
    },
    {
      connection: { url: env.REDIS_URL },
      concurrency: 10,
    }
  );

  telemetryWorker.on('failed', async (job, err) => {
    console.error(`[TelemetryWorker] Job ${job?.id} failed:`, err.message);
    if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
      try {
        const dlq = getTelemetryDlq();
        await dlq.add('dead-telemetry-packet', {
          originalJobId: job.id,
          data: job.data,
          failedReason: err.message,
          failedAt: new Date().toISOString(),
        });
        console.warn(`[TelemetryDLQ] Moved failed packet ${job.id} to Dead Letter Queue.`);
      } catch (dlqErr: any) {
        console.error('[TelemetryDLQ] Failed to push to DLQ:', dlqErr.message);
      }
    }
  });

  return telemetryWorker;
}
