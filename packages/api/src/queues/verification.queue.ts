import { Queue, Worker, Job } from 'bullmq';
import { env } from '../config/env';
import { QUEUE_NAMES, AI_THRESHOLDS } from '../config/constants';
import { LabourExecutionLedger } from '../db/models/LabourExecutionLedger';
import { LiveTelemetry } from '../db/models/LiveTelemetry';
import { UserAuthRoster } from '../db/models/UserAuthRoster';
import { sendWhatsAppAlert } from '../services/whatsapp.service';
import type { Server as SocketIOServer } from 'socket.io';

export interface VerificationJobData {
  ledgerId: string;
  nodeId: string;
  boxId: string;
  labourId: string;
  actionType: string;
  t0: string; // ISO String of when labour pressed Mark Done
}

let verificationQueue: Queue<VerificationJobData> | null = null;
let verificationWorker: Worker<VerificationJobData> | null = null;

export function getVerificationQueue(): Queue<VerificationJobData> {
  if (!verificationQueue) {
    verificationQueue = new Queue<VerificationJobData>(QUEUE_NAMES.VERIFICATION, {
      connection: { url: env.REDIS_URL },
      defaultJobOptions: {
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });
    verificationQueue.on('error', (err) => {
      // Gracefully handle Redis offline
    });
  }
  return verificationQueue;
}

export function initVerificationWorker(io?: SocketIOServer): Worker<VerificationJobData> {
  if (verificationWorker) return verificationWorker;

  verificationWorker = new Worker<VerificationJobData>(
    QUEUE_NAMES.VERIFICATION,
    async (job: Job<VerificationJobData>) => {
      const { ledgerId, nodeId, actionType, t0, labourId } = job.data;
      const t0Date = new Date(t0);
      const t15Date = new Date();

      console.log(`[Kaam Ka Saboot] Running verification for ledger ${ledgerId} (Action: ${actionType})`);

      // Retrieve telemetry around t0 (-5 mins to +2 mins)
      const telemetryBefore = await LiveTelemetry.findOne({
        nodeId,
        timestamp: {
          $gte: new Date(t0Date.getTime() - 5 * 60 * 1000),
          $lte: new Date(t0Date.getTime() + 2 * 60 * 1000),
        },
      })
        .sort({ timestamp: -1 })
        .lean();

      // Retrieve telemetry around t15 (now)
      const telemetryAfter = await LiveTelemetry.findOne({
        nodeId,
        timestamp: {
          $gte: new Date(t15Date.getTime() - 15 * 60 * 1000),
          $lte: t15Date,
        },
      })
        .sort({ timestamp: -1 })
        .lean();

      let status: 'VERIFIED_GENUINE' | 'FAKE_FLAG' | 'INCONCLUSIVE' = 'INCONCLUSIVE';
      let confidenceScore = 0;
      let inconclusiveReason: string | undefined;
      let deltaTemp = 0;
      let deltaMoisture = 0;
      let deltaPressure = 0;

      if (!telemetryBefore && !telemetryAfter) {
        status = 'INCONCLUSIVE';
        confidenceScore = 0;
        inconclusiveReason = 'Node sleeping: No telemetry packets received before or after task execution (t0 / t15)';
        console.info(`[Kaam Ka Saboot] Node ${nodeId} was asleep. Setting ledger ${ledgerId} to INCONCLUSIVE.`);
      } else if (!telemetryBefore) {
        status = 'INCONCLUSIVE';
        confidenceScore = 35;
        inconclusiveReason = 'Baseline telemetry missing at task initiation window (t0 - 15m)';
      } else if (!telemetryAfter) {
        status = 'INCONCLUSIVE';
        confidenceScore = 35;
        inconclusiveReason = 'Follow-up telemetry missing at post-task window (t0 + 15m)';
      } else {
        // High confidence: both baseline and follow-up packets exist
        confidenceScore = 100;
        deltaTemp = Math.abs(telemetryAfter.tempC - telemetryBefore.tempC);
        deltaMoisture = Math.abs(telemetryAfter.moisturePct - telemetryBefore.moisturePct);
        deltaPressure = Math.abs(telemetryAfter.airPressureHpa - telemetryBefore.airPressureHpa);

        const { TEMP_MIN_CHANGE, MOISTURE_MIN_CHANGE, PRESSURE_MIN_CHANGE } =
          AI_THRESHOLDS.VERIFICATION_DELTA;

        let isGenuine = false;

        const actionUpper = actionType.toUpperCase();
        if (
          actionUpper.includes('PAANI') || actionUpper.includes('GUD') || actionUpper.includes('WATER')
        ) {
          // Liquid input actions must induce moisture change or evaporative thermal response
          isGenuine = deltaMoisture >= MOISTURE_MIN_CHANGE || deltaTemp >= TEMP_MIN_CHANGE;
        } else if (
          actionUpper.includes('GHUMAYA') || actionUpper.includes('LEVEL') || actionUpper.includes('HAWA') || actionUpper.includes('TURN')
        ) {
          // Waste turning aerates pit, causing compaction pressure loosening or thermal perturbation
          isGenuine = deltaPressure >= PRESSURE_MIN_CHANGE || deltaTemp >= TEMP_MIN_CHANGE;
        } else if (actionUpper.includes('KHAD_NIKALI') || actionUpper.includes('HARVEST')) {
          // Harvest removes weight, dropping bottom static compaction pressure
          isGenuine = deltaPressure >= PRESSURE_MIN_CHANGE || deltaTemp >= TEMP_MIN_CHANGE;
        } else {
          // General maintenance / input activity
          isGenuine =
            deltaTemp >= TEMP_MIN_CHANGE ||
            deltaMoisture >= MOISTURE_MIN_CHANGE ||
            deltaPressure >= PRESSURE_MIN_CHANGE;
        }

        status = isGenuine ? 'VERIFIED_GENUINE' : 'FAKE_FLAG';
      }

      // Update Ledger entry
      const updatedLedger = await LabourExecutionLedger.findByIdAndUpdate(
        ledgerId,
        {
          verificationStatus: status,
          confidenceScore,
          inconclusiveReason,
          sensorDelta: {
            temp: Number(deltaTemp.toFixed(2)),
            moisture: Number(deltaMoisture.toFixed(2)),
            pressure: Number(deltaPressure.toFixed(2)),
          },
          telemetryAtT0: telemetryBefore
            ? {
                tempC: telemetryBefore.tempC,
                moisturePct: telemetryBefore.moisturePct,
                airPressureHpa: telemetryBefore.airPressureHpa,
              }
            : undefined,
          telemetryAtT15: telemetryAfter
            ? {
                tempC: telemetryAfter.tempC,
                moisturePct: telemetryAfter.moisturePct,
                airPressureHpa: telemetryAfter.airPressureHpa,
              }
            : undefined,
          verifiedAt: new Date(),
        },
        { new: true }
      );

      // Emit Socket.IO event to Manager and Supreme Command
      if (io) {
        io.emit('verification:result', {
          ledgerId,
          labourId,
          nodeId,
          actionType,
          status,
          sensorDelta: { temp: deltaTemp, moisture: deltaMoisture, pressure: deltaPressure },
          timestamp: new Date().toISOString(),
        });
      }

      // If strictly flagged fake (never for inconclusive), alert BWG Manager
      if (status === 'FAKE_FLAG') {
        const labour = await UserAuthRoster.findById(labourId).lean();
        const labourName = labour?.name || 'Safai Mitra';

        console.warn(
          `[Kaam Ka Saboot Alert] Action '${actionType}' by ${labourName} flagged FAKE (zero sensor variance with active telemetry).`
        );
      }

      return { status, deltaTemp, deltaMoisture, deltaPressure };
    },
    {
      connection: { url: env.REDIS_URL },
      concurrency: 5,
    }
  );

  verificationWorker.on('error', (err) => {
    // Gracefully handle Redis offline
  });

  verificationWorker.on('failed', (job, err) => {
    console.error(`[Kaam Ka Saboot Worker Error] Job ${job?.id} failed:`, err);
  });

  return verificationWorker;
}
