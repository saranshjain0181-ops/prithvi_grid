import apiClient from './client';
import type { ApiResponse } from '@/types';

export type DeviceLifecycleStatus =
  | 'PROVISIONED'
  | 'ACTIVE'
  | 'DEGRADED'
  | 'OFFLINE'
  | 'MAINTENANCE'
  | 'DECOMMISSIONED';

export type OtaRolloutStatus =
  | 'DRAFT'
  | 'CANARY'
  | 'GENERAL_AVAILABILITY'
  | 'PAUSED'
  | 'ROLLED_BACK'
  | 'DEPRECATED';

export interface SupercapacitorMetrics {
  voltageMv: number;
  vDropBurstMv: number;
  tegDeltaTC: number;
  harvestEfficiencyPct: number;
  estimatedEsrMilliOhms: number;
  healthScorePct: number;
  brownoutRisk: 'LOW' | 'MODERATE' | 'CRITICAL';
}

export interface FleetNodeItem {
  id: string;
  assetCode: string;
  name: string;
  facilityId: string;
  facilityName: string;
  boxName?: string;
  status: DeviceLifecycleStatus;
  firmwareVersion: string;
  hardwareRevision: string;
  lastSeenAt: string | null;
  supercapacitor: SupercapacitorMetrics;
  signalRssi: number;
  macAddress?: string;
  imei?: string;
  otaTargetVersion?: string;
  otaLastStatus?: string;
}

export interface NodeHealthAssessment {
  nodeId: string;
  assetCode: string;
  name: string;
  status: DeviceLifecycleStatus;
  firmwareVersion: string;
  hardwareRevision: string;
  lastSeenAt: string | null;
  assessment: {
    healthScorePct: number;
    voltageMv: number;
    vDropBurstMv: number;
    tegDeltaTC: number;
    harvestEfficiencyPct: number;
    estimatedEsrMilliOhms: number;
    brownoutRisk: 'LOW' | 'MODERATE' | 'CRITICAL';
    recommendations: string[];
    requiresTechnicianDispatch: boolean;
  };
  lifecycleHistory: Array<{
    fromStatus: string;
    toStatus: string;
    reason: string;
    changedAt: string;
    changedBy?: string;
  }>;
}

export interface OtaReleaseItem {
  _id: string;
  version: string;
  hardwareRevision: string;
  binaryUrl: string;
  sha256: string;
  fileSizeBytes: number;
  minSupercapVoltageMv: number;
  minRssiDbm: number;
  rolloutStatus: OtaRolloutStatus;
  canaryPercentage: number;
  metrics: {
    stagedCount: number;
    downloadedCount: number;
    successCount: number;
    failedRollbackCount: number;
    failureRatePct: number;
  };
  isCircuitBreakerTripped: boolean;
  circuitBreakerReason?: string;
  releaseNotes: string;
  createdAt: string;
}

export interface ProvisionPayload {
  facilityId: string;
  parentBoxId?: string;
  name?: string;
  macAddress: string;
  imei?: string;
  simNumber?: string;
  hardwareRevision?: string;
}

export const fleetApi = {
  listNodes: async (status?: string, facilityId?: string): Promise<{ success: boolean; data: FleetNodeItem[] }> => {
    const { data } = await apiClient.get('/fleet/nodes', { params: { status, facilityId } });
    return data;
  },

  getNodeHealth: async (id: string): Promise<{ success: boolean; data: NodeHealthAssessment }> => {
    const { data } = await apiClient.get(`/fleet/nodes/${id}/health`);
    return data;
  },

  updateNodeStatus: async (
    id: string,
    status: DeviceLifecycleStatus,
    reason: string
  ): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post(`/fleet/nodes/${id}/status`, { status, reason });
    return data;
  },

  provisionNode: async (payload: ProvisionPayload): Promise<{ success: boolean; data: any }> => {
    const { data } = await apiClient.post('/fleet/provision', payload);
    return data;
  },

  listOtaReleases: async (): Promise<{ success: boolean; data: OtaReleaseItem[] }> => {
    const { data } = await apiClient.get('/fleet/ota');
    return data;
  },

  createOtaRelease: async (payload: {
    version: string;
    hardwareRevision: string;
    binaryUrl: string;
    sha256: string;
    fileSizeBytes: number;
    minSupercapVoltageMv?: number;
    minRssiDbm?: number;
    releaseNotes?: string;
  }): Promise<{ success: boolean; data: OtaReleaseItem }> => {
    const { data } = await apiClient.post('/fleet/ota/releases', payload);
    return data;
  },

  updateRollout: async (
    id: string,
    rolloutStatus: OtaRolloutStatus,
    canaryPercentage?: number
  ): Promise<{ success: boolean; data: OtaReleaseItem }> => {
    const { data } = await apiClient.post(`/fleet/ota/releases/${id}/rollout`, {
      rolloutStatus,
      canaryPercentage,
    });
    return data;
  },

  abortRollout: async (id: string): Promise<{ success: boolean; data: OtaReleaseItem }> => {
    const { data } = await apiClient.post(`/fleet/ota/releases/${id}/abort`);
    return data;
  },

  resetAlarm: async (nodeId: string): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post(`/alarm/reset/${nodeId}`);
    return data;
  },
};
