import {
  ClientDevice,
  DeviceHeartbeat,
  RemoteAction,
  MinVersionPolicy,
  DeviceHealthState,
} from '../db/models/DeviceAppHealth';

export class DeviceAppHealthService {
  private devices: Map<string, ClientDevice> = new Map();
  private heartbeats: Map<string, DeviceHeartbeat[]> = new Map();
  private actions: Map<string, RemoteAction> = new Map();
  private minVersionPolicies: Map<string, MinVersionPolicy> = new Map();

  public registerMinVersionPolicy(policy: MinVersionPolicy): void {
    this.minVersionPolicies.set(policy.tenantId, policy);
  }

  public enrollDevice(params: {
    deviceId: string;
    tenantId: string;
    facilityId: string;
    deviceRole: 'KIOSK' | 'WALLBOARD' | 'PERSONAL_SUPERVISOR' | 'PERSONAL_WORKER';
    appVersion: string;
    osVersion: string;
  }): ClientDevice {
    const device: ClientDevice = {
      deviceId: params.deviceId,
      tenantId: params.tenantId,
      facilityId: params.facilityId,
      deviceRole: params.deviceRole,
      appVersion: params.appVersion,
      osVersion: params.osVersion,
      enrolledAt: new Date().toISOString(),
      healthState: 'HEALTHY',
    };

    this.devices.set(params.deviceId, device);
    return device;
  }

  public recordHeartbeat(params: {
    deviceId: string;
    freeStorageMb: number;
    batteryPct: number;
    networkType: 'WIFI' | '4G' | '2G' | 'OFFLINE';
    offlineQueueLength: number;
    oldestQueueItemHours: number;
    serverClockOffsetMs: number;
    lastSuccessfulSyncAt: string;
  }): { device: ClientDevice; healthState: DeviceHealthState; alerts: string[] } {
    const device = this.devices.get(params.deviceId);
    if (!device) throw new Error(`Device ${params.deviceId} not enrolled`);

    const alerts: string[] = [];
    let state: DeviceHealthState = 'HEALTHY';

    // 1. Clock drift check (critical for timestamp verification integrity)
    if (Math.abs(params.serverClockOffsetMs) > 180000) {
      // > 3 minutes drift
      state = 'UNHEALTHY';
      alerts.push(
        `Critical clock drift: offset is ${Math.round(params.serverClockOffsetMs / 1000)}s`
      );
    }

    // 2. Stuck offline queue check
    if (params.oldestQueueItemHours > 24) {
      state = 'UNHEALTHY';
      alerts.push(`Stuck queue: oldest unsynced item is ${params.oldestQueueItemHours.toFixed(1)}h old`);
    } else if (params.offlineQueueLength > 50) {
      if (state !== 'UNHEALTHY') state = 'ATTENTION';
      alerts.push(`Deep offline queue: ${params.offlineQueueLength} items pending sync`);
    }

    // 3. Storage check
    if (params.freeStorageMb < 100) {
      if (state !== 'UNHEALTHY') state = 'ATTENTION';
      alerts.push(`Low storage warning: only ${params.freeStorageMb}MB free`);
    }

    // 4. Minimum version policy check
    const policy = this.minVersionPolicies.get(device.tenantId);
    if (policy && device.appVersion < policy.minAppVersion) {
      state = 'UNHEALTHY';
      alerts.push(
        `App version ${device.appVersion} is below minimum requirement ${policy.minAppVersion}`
      );
    }

    device.healthState = state;
    device.healthReason = alerts.join('; ') || undefined;
    device.lastHeartbeatAt = new Date().toISOString();

    const heartbeat: DeviceHeartbeat = {
      heartbeatId: `HB-${Date.now()}`,
      deviceId: params.deviceId,
      freeStorageMb: params.freeStorageMb,
      batteryPct: params.batteryPct,
      networkType: params.networkType,
      offlineQueueLength: params.offlineQueueLength,
      oldestQueueItemHours: params.oldestQueueItemHours,
      serverClockOffsetMs: params.serverClockOffsetMs,
      lastSuccessfulSyncAt: params.lastSuccessfulSyncAt,
      timestamp: new Date().toISOString(),
    };

    const hbList = this.heartbeats.get(params.deviceId) || [];
    hbList.push(heartbeat);
    this.heartbeats.set(params.deviceId, hbList);

    return { device, healthState: state, alerts };
  }

  public issueRemoteAction(params: {
    deviceId: string;
    actionType: 'FORCE_SYNC' | 'REQUIRE_UPDATE' | 'LOCK_KIOSK' | 'CLEAR_CACHE_CONFIRMED';
  }): RemoteAction {
    const device = this.devices.get(params.deviceId);
    if (!device) throw new Error(`Device ${params.deviceId} not found`);

    const actionId = `ACT-${Date.now()}`;
    const action: RemoteAction = {
      actionId,
      deviceId: params.deviceId,
      actionType: params.actionType,
      status: 'PENDING',
      issuedAt: new Date().toISOString(),
    };

    this.actions.set(actionId, action);
    return action;
  }

  public getFleetHealth(tenantId?: string) {
    const devices = Array.from(this.devices.values()).filter(
      (d) => !tenantId || d.tenantId === tenantId
    );

    const healthy = devices.filter((d) => d.healthState === 'HEALTHY');
    const attention = devices.filter((d) => d.healthState === 'ATTENTION');
    const unhealthy = devices.filter((d) => d.healthState === 'UNHEALTHY');

    return {
      totalDevices: devices.length,
      healthyCount: healthy.length,
      attentionCount: attention.length,
      unhealthyCount: unhealthy.length,
      devices,
    };
  }
}
