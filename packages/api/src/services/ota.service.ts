import crypto from 'crypto';
import { Types } from 'mongoose';
import { OtaFirmware, IOtaFirmware, OtaRolloutStatus } from '../db/models/OtaFirmware';
import { PhysicalAsset, IPhysicalAsset } from '../db/models/PhysicalAsset';
import { enqueueRemoteCommand } from '../db/models/RemoteCommand';

export interface CreateOtaReleaseInput {
  version: string;
  hardwareRevision: string;
  binaryUrl: string;
  sha256: string;
  fileSizeBytes: number;
  minSupercapVoltageMv?: number;
  minRssiDbm?: number;
  releaseNotes?: string;
  createdBy?: string | Types.ObjectId;
}

export interface OtaEligibilityResult {
  isEligible: boolean;
  release?: IOtaFirmware;
  reason: string;
  targetVersion?: string;
}

/**
 * Deterministic hash bucket (0-99) for a given nodeId and firmware version
 */
export function getCanaryBucket(nodeId: string, version: string): number {
  const hash = crypto.createHash('md5').update(`${nodeId}:${version}`).digest('hex');
  const intVal = parseInt(hash.substring(0, 8), 16);
  return intVal % 100;
}

/**
 * Evaluates whether an IoT node is eligible for an active OTA rollout
 */
export async function evaluateOtaEligibility(
  node: IPhysicalAsset,
  currentSupercapMv: number,
  currentRssiDbm: number
): Promise<OtaEligibilityResult> {
  // Find active rollout for node's hardware revision
  const activeRelease = await OtaFirmware.findOne({
    hardwareRevision: node.hardwareRevision || 'REV_B_ESP32_A7670C',
    rolloutStatus: { $in: ['CANARY', 'GENERAL_AVAILABILITY'] },
    isCircuitBreakerTripped: false,
  }).sort({ createdAt: -1 });

  if (!activeRelease) {
    return { isEligible: false, reason: 'No active OTA firmware release found for hardware revision' };
  }

  // Already on this version
  if (node.firmwareVersion === activeRelease.version) {
    return { isEligible: false, reason: `Node is already running target firmware version ${activeRelease.version}` };
  }

  // Check supercapacitor voltage threshold (CRITICAL: prevent mid-write brownout)
  if (currentSupercapMv < activeRelease.minSupercapVoltageMv) {
    return {
      isEligible: false,
      reason: `Insufficient supercapacitor charge: ${currentSupercapMv}mV (minimum ${activeRelease.minSupercapVoltageMv}mV required for flash write)`,
    };
  }

  // Check cellular signal strength threshold
  if (currentRssiDbm < activeRelease.minRssiDbm) {
    return {
      isEligible: false,
      reason: `Marginal cellular RSSI: ${currentRssiDbm} dBm (minimum ${activeRelease.minRssiDbm} dBm required)`,
    };
  }

  // If CANARY, check hash ring bucket
  if (activeRelease.rolloutStatus === 'CANARY') {
    const bucket = getCanaryBucket(node._id.toString(), activeRelease.version);
    const isExplicitCanary = activeRelease.canaryNodeIds?.some(
      (id) => id.toString() === node._id.toString()
    );

    if (!isExplicitCanary && bucket >= activeRelease.canaryPercentage) {
      return {
        isEligible: false,
        reason: `Node bucket (${bucket}) exceeds current canary rollout percentage (${activeRelease.canaryPercentage}%)`,
      };
    }
  }

  return {
    isEligible: true,
    release: activeRelease,
    reason: `Node qualified for ${activeRelease.rolloutStatus} deployment of ${activeRelease.version}`,
    targetVersion: activeRelease.version,
  };
}

/**
 * Stage OTA update onto node by creating an OTA_TRIGGER remote command
 */
export async function stageOtaForNode(
  node: IPhysicalAsset,
  release: IOtaFirmware
): Promise<boolean> {
  const commandPayload = {
    targetVersion: release.version,
    binaryUrl: release.binaryUrl,
    sha256: release.sha256,
    fileSizeBytes: release.fileSizeBytes,
    chunkSizeBytes: 4096, // 4KB chunks optimal for supercapacitor burst budget
  };

  await enqueueRemoteCommand({
    nodeId: node._id.toString(),
    command: 'OTA_TRIGGER',
    payload: commandPayload,
    issuedBy: 'OTA_CANARY_ENGINE',
  });

  // Update node tracking
  node.otaTargetVersion = release.version;
  node.otaLastStatus = 'PENDING';
  node.otaLastAttemptAt = new Date();
  await node.save();

  // Increment staged count
  release.metrics.stagedCount += 1;
  await release.save();

  return true;
}

/**
 * Record node OTA status update and evaluate Canary Circuit Breaker
 */
export async function recordOtaProgress(
  nodeId: string | Types.ObjectId,
  version: string,
  status: 'DOWNLOADING' | 'FLASHING' | 'SUCCESS' | 'FAILED_REVERTED',
  failureReason?: string
): Promise<{ release: IOtaFirmware | null; circuitBreakerTripped: boolean }> {
  const [node, release] = await Promise.all([
    PhysicalAsset.findById(nodeId),
    OtaFirmware.findOne({ version }),
  ]);

  if (!node || !release) {
    return { release: null, circuitBreakerTripped: false };
  }

  node.otaLastStatus = status;

  if (status === 'SUCCESS') {
    node.firmwareVersion = version;
    node.otaTargetVersion = undefined;
    release.metrics.successCount += 1;
  } else if (status === 'FAILED_REVERTED') {
    node.otaFailureCount = (node.otaFailureCount || 0) + 1;
    release.metrics.failedRollbackCount += 1;
  } else if (status === 'DOWNLOADING') {
    release.metrics.downloadedCount += 1;
  }

  // Recalculate failure rate
  const totalCompleted = release.metrics.successCount + release.metrics.failedRollbackCount;
  if (totalCompleted > 0) {
    release.metrics.failureRatePct = Number(
      ((release.metrics.failedRollbackCount / totalCompleted) * 100).toFixed(2)
    );
  }

  // Circuit Breaker Evaluation:
  // If failure rate exceeds threshold (default 2.0%) with minimum sample size (>= 3 nodes), automatically abort!
  let tripped = false;
  if (
    totalCompleted >= 3 &&
    release.metrics.failureRatePct >= release.autoRollbackThresholdPct &&
    !release.isCircuitBreakerTripped
  ) {
    release.isCircuitBreakerTripped = true;
    release.rolloutStatus = 'ROLLED_BACK';
    release.circuitBreakerTrippedAt = new Date();
    release.circuitBreakerReason = `Automated circuit breaker tripped: failure rate hit ${release.metrics.failureRatePct}% (exceeds ${release.autoRollbackThresholdPct}% limit)`;
    tripped = true;
  }

  await Promise.all([node.save(), release.save()]);

  return { release, circuitBreakerTripped: tripped };
}
