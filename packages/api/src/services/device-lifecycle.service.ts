import { Types } from 'mongoose';
import { PhysicalAsset, AssetStatus, IPhysicalAsset } from '../db/models/PhysicalAsset';

export interface DeviceLifecycleEvaluationInput {
  currentStatus: AssetStatus;
  lastSeenAt?: Date | null;
  supercapVoltageMv?: number;
  vDropBurstMv?: number;
  healthScorePct?: number;
  clockDriftSeconds?: number;
  consecutiveSensorErrors?: number;
  now?: Date;
  offlineTimeoutMs?: number;
}

export interface DeviceLifecycleTransition {
  shouldTransition: boolean;
  fromStatus: AssetStatus;
  toStatus: AssetStatus;
  reason: string;
}

/**
 * Permitted transitions in the Device Lifecycle FSM
 */
export const ALLOWED_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  PROVISIONED: ['ACTIVE', 'MAINTENANCE', 'DECOMMISSIONED'],
  ACTIVE: ['DEGRADED', 'OFFLINE', 'MAINTENANCE', 'DECOMMISSIONED'],
  DEGRADED: ['ACTIVE', 'OFFLINE', 'MAINTENANCE', 'DECOMMISSIONED'],
  OFFLINE: ['ACTIVE', 'DEGRADED', 'MAINTENANCE', 'DECOMMISSIONED'],
  MAINTENANCE: ['PROVISIONED', 'ACTIVE', 'DEGRADED', 'DECOMMISSIONED'],
  DECOMMISSIONED: ['PROVISIONED'], // Rare factory refurbishment
};

export const DEFAULT_OFFLINE_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 hours for thermal energy harvesting nodes

/**
 * Pure evaluation function for node lifecycle state machine
 */
export function evaluateDeviceLifecycle(
  input: DeviceLifecycleEvaluationInput
): DeviceLifecycleTransition {
  const {
    currentStatus,
    lastSeenAt,
    supercapVoltageMv = 5000,
    vDropBurstMv = 150,
    healthScorePct = 90,
    clockDriftSeconds = 0,
    consecutiveSensorErrors = 0,
    now = new Date(),
    offlineTimeoutMs = DEFAULT_OFFLINE_TIMEOUT_MS,
  } = input;

  const currentTime = now.getTime();
  const lastSeenTime = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
  const elapsedSinceSeenMs = lastSeenTime > 0 ? currentTime - lastSeenTime : Infinity;

  // Never automatically transition manual operational states
  if (currentStatus === 'DECOMMISSIONED' || currentStatus === 'MAINTENANCE') {
    return {
      shouldTransition: false,
      fromStatus: currentStatus,
      toStatus: currentStatus,
      reason: `Node is held in manual ${currentStatus} state`,
    };
  }

  // 1. First packet from newly provisioned node
  if (currentStatus === 'PROVISIONED') {
    if (lastSeenTime > 0) {
      return {
        shouldTransition: true,
        fromStatus: 'PROVISIONED',
        toStatus: 'ACTIVE',
        reason: 'Initial verified telemetry packet ingested from compost pit',
      };
    }
    return {
      shouldTransition: false,
      fromStatus: 'PROVISIONED',
      toStatus: 'PROVISIONED',
      reason: 'Awaiting initial telemetry packet',
    };
  }

  // 2. Check for offline timeout
  if (elapsedSinceSeenMs > offlineTimeoutMs) {
    if (currentStatus !== 'OFFLINE') {
      const elapsedHours = (elapsedSinceSeenMs / (1000 * 3600)).toFixed(1);
      return {
        shouldTransition: true,
        fromStatus: currentStatus,
        toStatus: 'OFFLINE',
        reason: `No telemetry received for ${elapsedHours} hours (exceeds ${offlineTimeoutMs / 3600000}h threshold)`,
      };
    }
    return {
      shouldTransition: false,
      fromStatus: 'OFFLINE',
      toStatus: 'OFFLINE',
      reason: 'Node remains offline',
    };
  }

  // Node is currently transmitting within acceptable time window.
  // 3. Check for degradation indicators:
  // - High supercapacitor burst drop (> 450 mV implies capacitor ESR degradation)
  // - Low health score (< 50)
  // - Sensor read errors
  // - Severe clock drift (> 900 seconds)
  const isDegradedCondition =
    healthScorePct < 50 ||
    vDropBurstMv > 450 ||
    supercapVoltageMv < 3400 ||
    consecutiveSensorErrors >= 3 ||
    Math.abs(clockDriftSeconds) > 900;

  if (isDegradedCondition) {
    if (currentStatus !== 'DEGRADED') {
      let specificReason = 'Composite health score fell below 50%';
      if (vDropBurstMv > 450) {
        specificReason = `Severe supercapacitor discharge: ${vDropBurstMv}mV burst drop (ESR degraded)`;
      } else if (supercapVoltageMv < 3400) {
        specificReason = `Critical low voltage: ${supercapVoltageMv}mV (brownout threshold: 3000mV)`;
      } else if (consecutiveSensorErrors >= 3) {
        specificReason = `${consecutiveSensorErrors} consecutive sensor reading failures detected`;
      } else if (Math.abs(clockDriftSeconds) > 900) {
        specificReason = `Excessive hardware clock drift: ${clockDriftSeconds}s`;
      }

      return {
        shouldTransition: true,
        fromStatus: currentStatus,
        toStatus: 'DEGRADED',
        reason: specificReason,
      };
    }
    return {
      shouldTransition: false,
      fromStatus: 'DEGRADED',
      toStatus: 'DEGRADED',
      reason: 'Node remains in degraded health state',
    };
  }

  // 4. Recovery: Degraded or Offline back to Active
  if ((currentStatus === 'DEGRADED' || currentStatus === 'OFFLINE') && healthScorePct >= 70) {
    return {
      shouldTransition: true,
      fromStatus: currentStatus,
      toStatus: 'ACTIVE',
      reason: `Node telemetry healthy and verified (Health Score: ${healthScorePct}%)`,
    };
  }

  return {
    shouldTransition: false,
    fromStatus: currentStatus,
    toStatus: currentStatus,
    reason: 'Node operating normally within active parameters',
  };
}

/**
 * Validate whether a status transition is permitted by FSM
 */
export function isValidTransition(from: AssetStatus, to: AssetStatus): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_TRANSITIONS[from];
  return Boolean(allowed && allowed.includes(to));
}

/**
 * Apply status transition to PhysicalAsset in database with audit logging
 */
export async function transitionDeviceStatus(
  nodeId: string | Types.ObjectId,
  newStatus: AssetStatus,
  reason: string,
  changedBy: string = 'SYSTEM'
): Promise<{ success: boolean; asset?: IPhysicalAsset; error?: string }> {
  const asset = await PhysicalAsset.findById(nodeId);
  if (!asset) {
    return { success: false, error: 'Asset not found' };
  }

  if (asset.status === newStatus) {
    return { success: true, asset };
  }

  if (!isValidTransition(asset.status, newStatus)) {
    return {
      success: false,
      error: `Invalid lifecycle transition from ${asset.status} to ${newStatus}`,
    };
  }

  const fromStatus = asset.status;
  asset.status = newStatus;

  if (!asset.lifecycleHistory) {
    asset.lifecycleHistory = [];
  }

  asset.lifecycleHistory.push({
    fromStatus,
    toStatus: newStatus,
    reason,
    changedAt: new Date(),
    changedBy,
  });

  await asset.save();
  return { success: true, asset };
}
