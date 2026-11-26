import { Queue, Worker, Job } from 'bullmq';
import { env } from '../config/env';
import { QUEUE_NAMES, AI_THRESHOLDS } from '../config/constants';
import { PhysicalAsset } from '../db/models/PhysicalAsset';
import { evaluateOdorRisk } from '../services/odor.service';
import type { Server as SocketIOServer } from 'socket.io';

export interface AlertJobData {
  type: 'ODOR_CHECK' | 'OFFLINE_NODE_CHECK';
}

let alertQueue: Queue<AlertJobData> | null = null;
let alertWorker: Worker<AlertJobData> | null = null;

export function getAlertQueue(): Queue<AlertJobData> {
  if (!alertQueue) {
    alertQueue = new Queue<AlertJobData>(QUEUE_NAMES.ALERT_DISPATCH, {
      connection: { url: env.REDIS_URL },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
    alertQueue.on('error', (err) => {
      // Gracefully handle Redis offline
    });
  }
  return alertQueue;
}

export function initAlertWorker(io?: SocketIOServer): Worker<AlertJobData> {
  if (alertWorker) return alertWorker;

  alertWorker = new Worker<AlertJobData>(
    QUEUE_NAMES.ALERT_DISPATCH,
    async (job: Job<AlertJobData>) => {
      if (job.data.type === 'ODOR_CHECK') {
        // Fetch all active IoT nodes
        const nodes = await PhysicalAsset.find({ type: 'IOT_NODE', status: 'ACTIVE' }).lean();

        for (const node of nodes) {
          try {
            await evaluateOdorRisk(node._id.toString(), node.facilityId.toString(), io);
          } catch (err) {
            console.error(`[Odor Check Error] Node ${node._id}:`, err);
          }
        }
      } else if (job.data.type === 'OFFLINE_NODE_CHECK') {
        const timeoutDate = new Date(Date.now() - AI_THRESHOLDS.NODE_OFFLINE_TIMEOUT_MS);
        const offlineNodes = await PhysicalAsset.find({
          type: 'IOT_NODE',
          status: 'ACTIVE',
          lastSeenAt: { $lt: timeoutDate },
        }).lean();

        if (offlineNodes.length > 0 && io) {
          for (const node of offlineNodes) {
            io.emit('node:offline', {
              nodeId: node._id,
              facilityId: node.facilityId,
              lastSeenAt: node.lastSeenAt,
            });
          }
        }
      }
    },
    {
      connection: { url: env.REDIS_URL },
      concurrency: 2,
    }
  );

  alertWorker.on('error', (err) => {
    // Gracefully handle Redis offline
  });

  return alertWorker;
}

/**
 * Schedule repeatable background health & odor checks
 */
export async function scheduleBackgroundJobs(): Promise<void> {
  const queue = getAlertQueue();

  // Every 30 minutes run odor check
  await queue.add(
    'odor-check-routine',
    { type: 'ODOR_CHECK' },
    {
      repeat: { every: 30 * 60 * 1000 },
      jobId: 'repeatable-odor-check',
    }
  );

  // Every 15 minutes run offline node check
  await queue.add(
    'offline-node-routine',
    { type: 'OFFLINE_NODE_CHECK' },
    {
      repeat: { every: 15 * 60 * 1000 },
      jobId: 'repeatable-offline-check',
    }
  );
}
