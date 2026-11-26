/**
 * Prithvi-Grid Innovation Playbook Volume 5 — Feature 6
 * Field Device and App Health Console
 * Telemetry and diagnostics for phones, shared kiosks, tablets, and wallboards.
 * [PRIVACY-PRESERVING] No personal tracking, zero location logging, offline sync hygiene.
 */

export type DeviceRole = 'KIOSK' | 'WALLBOARD' | 'PERSONAL_SUPERVISOR' | 'PERSONAL_WORKER';
export type DeviceHealthState = 'HEALTHY' | 'ATTENTION' | 'UNHEALTHY';

export interface ClientDevice {
  deviceId: string;
  tenantId: string;
  facilityId: string;
  deviceRole: DeviceRole;
  appVersion: string;
  osVersion: string;
  enrolledAt: string;
  healthState: DeviceHealthState;
  healthReason?: string;
  lastHeartbeatAt?: string;
}

export interface DeviceHeartbeat {
  heartbeatId: string;
  deviceId: string;
  freeStorageMb: number;
  batteryPct: number;
  networkType: 'WIFI' | '4G' | '2G' | 'OFFLINE';
  offlineQueueLength: number;
  oldestQueueItemHours: number;
  serverClockOffsetMs: number;
  lastSuccessfulSyncAt: string;
  timestamp: string;
}

export interface RemoteAction {
  actionId: string;
  deviceId: string;
  actionType: 'FORCE_SYNC' | 'REQUIRE_UPDATE' | 'LOCK_KIOSK' | 'CLEAR_CACHE_CONFIRMED';
  status: 'PENDING' | 'EXECUTED' | 'FAILED';
  issuedAt: string;
  executedAt?: string;
}

export interface MinVersionPolicy {
  tenantId: string;
  minAppVersion: string;
  recommendedVersion: string;
  enforceBlockBefore: string;
}
