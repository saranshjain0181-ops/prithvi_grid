import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Types } from 'mongoose';
import { PhysicalAsset, AssetStatus } from '../../db/models/PhysicalAsset';
import { OtaFirmware, OtaRolloutStatus } from '../../db/models/OtaFirmware';
import { FacilityLocation } from '../../db/models/FacilityLocation';
import { toValidObjectId } from '../../utils/safe-lookup';
import { assertTenantOwnership, buildTenantQuery } from '../../middleware/tenant-guard';
import { assessHardwareHealth } from '../../services/hardware-health.service';
import { transitionDeviceStatus, isValidTransition } from '../../services/device-lifecycle.service';
import { factoryProvisionDevice } from '../../services/provisioning.service';
import { SensorTrustRecord } from '../../db/models/SensorTrustScore';
import { virtualSensorService, estimateVirtualMoisture, estimateVirtualPh, estimateVirtualMethane } from '../../services/virtual-sensor.service';
import { wakeSchedulerService } from '../../services/wake-scheduler.service';
import { WakeSchedulePlan } from '../../db/models/WakeSchedulePlan';


import type { JwtPayload } from '../../types';

const updateStatusSchema = z.object({
  status: z.enum(['PROVISIONED', 'ACTIVE', 'DEGRADED', 'OFFLINE', 'MAINTENANCE', 'DECOMMISSIONED']),
  reason: z.string().min(3),
});

const provisionSchema = z.object({
  facilityId: z.string().min(1),
  parentBoxId: z.string().optional(),
  name: z.string().optional(),
  macAddress: z.string().regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, 'Invalid MAC address format'),
  imei: z.string().optional(),
  simNumber: z.string().optional(),
  hardwareRevision: z.string().default('REV_B_ESP32_A7670C'),
});

const createOtaReleaseSchema = z.object({
  version: z.string().regex(/^v?\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/, 'Invalid semantic version'),
  hardwareRevision: z.string().default('REV_B_ESP32_A7670C'),
  binaryUrl: z.string().url(),
  sha256: z.string().length(64, 'SHA-256 must be 64 hex characters'),
  fileSizeBytes: z.number().positive(),
  minSupercapVoltageMv: z.number().default(4800),
  minRssiDbm: z.number().default(-85),
  releaseNotes: z.string().default(''),
});

const updateRolloutSchema = z.object({
  rolloutStatus: z.enum(['DRAFT', 'CANARY', 'GENERAL_AVAILABILITY', 'PAUSED', 'ROLLED_BACK', 'DEPRECATED']),
  canaryPercentage: z.number().min(0).max(100).optional(),
});

export const fleetRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/fleet/nodes
   * List all IoT nodes with hardware health metrics and lifecycle status
   */
  fastify.get(
    '/nodes',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const { status, facilityId } = request.query as { status?: string; facilityId?: string };

      const baseQuery: any = { type: 'IOT_NODE' };
      if (status) {
        baseQuery.status = status;
      }
      if (facilityId && toValidObjectId(facilityId)) {
        baseQuery.facilityId = toValidObjectId(facilityId);
      }

      const query = buildTenantQuery(user, baseQuery);

      const nodes = await PhysicalAsset.find(query)
        .populate('facilityId', 'facilityName code')
        .populate('parentBoxId', 'name assetCode')
        .sort({ updatedAt: -1 })
        .lean();

      const items = nodes.map((node: any) => {
        const supercap = node.supercapacitorHealth || {
          voltageMv: 5000,
          vDropBurstMv: 150,
          tegDeltaTC: 20,
          harvestEfficiencyPct: 85,
          estimatedEsrMilliOhms: 75,
          healthScorePct: 92,
          brownoutRisk: 'LOW',
        };

        return {
          id: node._id.toString(),
          assetCode: node.assetCode,
          name: node.name,
          facilityId: node.facilityId?._id?.toString() || node.facilityId?.toString() || '',
          facilityName: node.facilityId?.facilityName || 'Central Indore Facility',
          boxName: node.parentBoxId?.name || 'Compost Pit A',
          status: node.status,
          firmwareVersion: node.firmwareVersion || 'v1.0.0',
          hardwareRevision: node.hardwareRevision || 'REV_B_ESP32_A7670C',
          lastSeenAt: node.lastSeenAt ? new Date(node.lastSeenAt).toISOString() : null,
          supercapacitor: supercap,
          signalRssi: node.metadata?.signalRssi ?? -75,
          macAddress: node.macAddress,
          imei: node.imei,
          otaTargetVersion: node.otaTargetVersion,
          otaLastStatus: node.otaLastStatus || 'IDLE',
        };
      });

      return reply.send({
        success: true,
        data: items,
        count: items.length,
      });
    }
  );

  /**
   * GET /api/v1/fleet/nodes/:id/health
   * Detailed health assessment and predictive maintenance inspection
   */
  fastify.get(
    '/nodes/:id/health',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const { id } = request.params as { id: string };

      if (!toValidObjectId(id)) {
        return reply.code(400).send({ success: false, message: 'Invalid node ID format' });
      }

      const node = await PhysicalAsset.findById(id).populate('facilityId', 'facilityName');
      if (!node) {
        return reply.code(404).send({ success: false, message: 'Node not found' });
      }

      if (!assertTenantOwnership(user, node.entityId, reply, 'Node')) {
        return;
      }

      const supercap = node.supercapacitorHealth || {
        voltageMv: 5000,
        vDropBurstMv: 150,
        tegDeltaTC: 22,
        harvestEfficiencyPct: 85,
        estimatedEsrMilliOhms: 75,
      };

      const assessment = assessHardwareHealth({
        supercapMv: supercap.voltageMv,
        vDropBurstMv: supercap.vDropBurstMv,
        tegDeltaTC: supercap.tegDeltaTC,
        harvestMv: (supercap.harvestEfficiencyPct / 100) * (supercap.tegDeltaTC * 15),
        signalRssi: (node.metadata as any)?.signalRssi ?? -75,
      });

      return reply.send({
        success: true,
        data: {
          nodeId: node._id.toString(),
          assetCode: node.assetCode,
          name: node.name,
          status: node.status,
          firmwareVersion: node.firmwareVersion,
          hardwareRevision: node.hardwareRevision,
          lastSeenAt: node.lastSeenAt,
          assessment,
          lifecycleHistory: node.lifecycleHistory || [],
        },
      });
    }
  );

  /**
   * POST /api/v1/fleet/nodes/:id/status
   * Update device lifecycle state machine
   */
  fastify.post(
    '/nodes/:id/status',
    { preHandler: [fastify.authenticate, fastify.requireRole('BWG_MANAGER')] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const { id } = request.params as { id: string };
      const parse = updateStatusSchema.safeParse(request.body);

      if (!parse.success) {
        return reply.code(400).send({
          success: false,
          error: 'ValidationError',
          message: parse.error.errors[0]?.message,
        });
      }

      if (!toValidObjectId(id)) {
        return reply.code(400).send({ success: false, message: 'Invalid node ID format' });
      }

      const node = await PhysicalAsset.findById(id);
      if (!node) {
        return reply.code(404).send({ success: false, message: 'Node not found' });
      }

      if (!assertTenantOwnership(user, node.entityId, reply, 'Node')) {
        return;
      }

      const { status, reason } = parse.data;

      if (!isValidTransition(node.status, status)) {
        return reply.code(400).send({
          success: false,
          error: 'InvalidTransition',
          message: `Cannot transition node from ${node.status} to ${status}`,
        });
      }

      const result = await transitionDeviceStatus(
        id,
        status,
        reason,
        user.role + ':' + (user.userId || 'ADMIN')
      );

      return reply.send({
        success: true,
        message: `Node lifecycle status transitioned to ${status}`,
        data: result.asset,
      });
    }
  );

  /**
   * POST /api/v1/fleet/provision
   * Factory provision a new node (Workstream D1)
   */
  fastify.post(
    '/provision',
    { preHandler: [fastify.authenticate, fastify.requireRole('BWG_MANAGER')] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const parse = provisionSchema.safeParse(request.body);

      if (!parse.success) {
        return reply.code(400).send({
          success: false,
          error: 'ValidationError',
          message: parse.error.errors[0]?.message,
        });
      }

      const { facilityId, parentBoxId, name, macAddress, imei, simNumber, hardwareRevision } = parse.data;

      // Ensure facility belongs to tenant
      const fac = await FacilityLocation.findById(facilityId);
      if (!fac) {
        return reply.code(404).send({ success: false, message: 'Facility not found' });
      }

      if (!assertTenantOwnership(user, fac.entityId, reply, 'Facility')) {
        return;
      }

      // Check for duplicate MAC
      const existing = await PhysicalAsset.findOne({ macAddress: macAddress.toUpperCase() });
      if (existing) {
        return reply.code(409).send({
          success: false,
          error: 'DuplicateMacAddress',
          message: `A device with MAC address ${macAddress} is already registered`,
        });
      }

      const result = await factoryProvisionDevice({
        entityId: fac.entityId,
        facilityId,
        parentBoxId,
        name,
        macAddress,
        imei,
        simNumber,
        hardwareRevision,
      });

      return reply.code(201).send({
        success: true,
        message: 'Node successfully factory-provisioned',
        data: {
          nodeId: result.asset._id.toString(),
          assetCode: result.asset.assetCode,
          serialNumber: result.asset.serialNumber,
          status: result.asset.status,
          rawDeviceKey: result.rawDeviceKey,
          deviceKeyHash: result.deviceKeyHash,
          nvsConfig: result.nvsConfig,
          qrCodeUrl: result.qrCodeUrl,
        },
      });
    }
  );

  /**
   * GET /api/v1/fleet/ota
   * List OTA firmware releases
   */
  fastify.get(
    '/ota',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const releases = await OtaFirmware.find()
        .sort({ createdAt: -1 })
        .lean();

      return reply.send({
        success: true,
        data: releases,
      });
    }
  );

  /**
   * POST /api/v1/fleet/ota/releases
   * Create new firmware release artifact
   */
  fastify.post(
    '/ota/releases',
    { preHandler: [fastify.authenticate, fastify.requireRole('SUPREME_HEAD')] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const parse = createOtaReleaseSchema.safeParse(request.body);

      if (!parse.success) {
        return reply.code(400).send({
          success: false,
          error: 'ValidationError',
          message: parse.error.errors[0]?.message,
        });
      }

      const data = parse.data;

      // Check duplicate version
      const existing = await OtaFirmware.findOne({
        version: data.version,
        hardwareRevision: data.hardwareRevision,
      });

      if (existing) {
        return reply.code(409).send({
          success: false,
          message: `Release version ${data.version} already exists for ${data.hardwareRevision}`,
        });
      }

      const release = new OtaFirmware({
        ...data,
        createdBy: toValidObjectId(user.userId),
        rolloutStatus: 'DRAFT',
      });

      await release.save();

      return reply.code(201).send({
        success: true,
        message: 'Firmware release created in DRAFT stage',
        data: release,
      });
    }
  );

  /**
   * POST /api/v1/fleet/ota/releases/:id/rollout
   * Update rollout status (Canary staging, GA promotion, or pause)
   */
  fastify.post(
    '/ota/releases/:id/rollout',
    { preHandler: [fastify.authenticate, fastify.requireRole('SUPREME_HEAD')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parse = updateRolloutSchema.safeParse(request.body);

      if (!parse.success) {
        return reply.code(400).send({
          success: false,
          error: 'ValidationError',
          message: parse.error.errors[0]?.message,
        });
      }

      if (!toValidObjectId(id)) {
        return reply.code(400).send({ success: false, message: 'Invalid release ID format' });
      }

      const release = await OtaFirmware.findById(id);
      if (!release) {
        return reply.code(404).send({ success: false, message: 'Firmware release not found' });
      }

      const { rolloutStatus, canaryPercentage } = parse.data;

      release.rolloutStatus = rolloutStatus;
      if (typeof canaryPercentage === 'number') {
        release.canaryPercentage = canaryPercentage;
      }

      // If promoting to CANARY or GENERAL_AVAILABILITY, deprecate older active releases for this hardware rev
      if (rolloutStatus === 'CANARY' || rolloutStatus === 'GENERAL_AVAILABILITY') {
        await OtaFirmware.updateMany(
          {
            _id: { $ne: release._id },
            hardwareRevision: release.hardwareRevision,
            rolloutStatus: { $in: ['CANARY', 'GENERAL_AVAILABILITY'] },
          },
          { $set: { rolloutStatus: 'DEPRECATED' } }
        );
      }

      await release.save();

      return reply.send({
        success: true,
        message: `Firmware release updated to ${rolloutStatus}`,
        data: release,
      });
    }
  );

  /**
   * POST /api/v1/fleet/ota/releases/:id/abort
   * Emergency circuit breaker abort for canary rollout
   */
  fastify.post(
    '/ota/releases/:id/abort',
    { preHandler: [fastify.authenticate, fastify.requireRole('SUPREME_HEAD')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      if (!toValidObjectId(id)) {
        return reply.code(400).send({ success: false, message: 'Invalid release ID format' });
      }

      const release = await OtaFirmware.findById(id);
      if (!release) {
        return reply.code(404).send({ success: false, message: 'Firmware release not found' });
      }

      release.rolloutStatus = 'ROLLED_BACK';
      release.isCircuitBreakerTripped = true;
      release.circuitBreakerTrippedAt = new Date();
      release.circuitBreakerReason = 'Manual operator emergency abort invoked from Supreme HQ';

      await release.save();

      return reply.send({
        success: true,
        message: 'Canary rollout aborted and rolled back immediately',
        data: release,
      });
    }
  );

  /**
   * GET /api/v1/fleet/sensors/trust/:nodeId
   * Retrieves latest Sensor Trust Scores, physical probe metrics, and virtual sensor correlations (Feature 4)
   */
  fastify.get(
    '/sensors/trust/:nodeId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { nodeId } = request.params as { nodeId: string };
      const validId = toValidObjectId(nodeId);
      if (!validId) {
        return reply.code(400).send({ success: false, message: 'Invalid node ID' });
      }

      const latestRecord = await SensorTrustRecord.findOne({ nodeId: validId })
        .sort({ assessedAt: -1 })
        .lean();

      if (!latestRecord) {
        return reply.code(404).send({
          success: false,
          message: 'No sensor trust evaluation found for this node.',
        });
      }

      // Compute live virtual estimates for reference
      const vMoisture = estimateVirtualMoisture({
        coreTempC: 56.4,
        ambientTempC: 28.0,
        lastWateringHoursAgo: 18,
      });
      const vPh = estimateVirtualPh({
        tempSlopePerHour: -0.2,
        methaneSlopePerHour: 4.0,
        lastLoadedHoursAgo: 24,
      });
      const vMethane = estimateVirtualMethane({
        airPressureHpa: 1012.0,
        tempC: 56.4,
        stagnationHours: 16,
      });

      return reply.send({
        success: true,
        data: {
          ...latestRecord,
          virtualSensors: [vMoisture, vPh, vMethane],
        },
      });
    }
  );

  /**
   * POST /api/v1/fleet/sensors/diagnostics/:nodeId/trigger-avoidance
   * Manually runs or advances the Truck-Roll Avoidance sequence before dispatching a ₹750 visit (Feature 4)
   */
  fastify.post(
    '/sensors/diagnostics/:nodeId/trigger-avoidance',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { nodeId } = request.params as { nodeId: string };
      const validId = toValidObjectId(nodeId);
      if (!validId) {
        return reply.code(400).send({ success: false, message: 'Invalid node ID' });
      }

      const body = (request.body as {
        pitId?: string;
        facilityId?: string;
        readings?: {
          tempC?: number;
          moisturePct?: number;
          ph?: number;
          methanePpm?: number;
        };
      }) || {};

      const nodeAsset = await PhysicalAsset.findById(validId);
      if (!nodeAsset) {
        return reply.code(404).send({ success: false, message: 'Node asset not found' });
      }

      const pitId = body.pitId || nodeAsset.parentBoxId?.toString() || validId.toString();
      const facilityId = body.facilityId || nodeAsset.facilityId?.toString() || '6717a0000000000000000001';

      const assessment = await virtualSensorService.evaluateNodeHealthAndTrust({
        nodeId: validId,
        pitId,
        facilityId,
        readings: body.readings || {
          tempC: 58.2,
          moisturePct: 50.1,
          ph: 6.8,
          methanePpm: 110,
        },
      });

      return reply.send({
        success: true,
        message: 'Sensor health assessed and Truck-Roll Avoidance state evaluated.',
        data: assessment,
      });
    }
  );

  /**
   * GET /api/v1/fleet/scheduler/:nodeId
   * Retrieves planned wake appointments, energy budget, and brownout risk (Feature 1)
   */
  fastify.get(
    '/scheduler/:nodeId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { nodeId } = request.params as { nodeId: string };
      const validId = toValidObjectId(nodeId);
      if (!validId) {
        return reply.code(400).send({ success: false, message: 'Invalid node ID' });
      }

      const today = new Date().toISOString().slice(0, 10);
      const plan = await WakeSchedulePlan.findOne({
        nodeId: validId,
        scheduleDate: today,
      }).lean();

      if (!plan) {
        // Return default plan if none generated yet
        const defaultPlan = await wakeSchedulerService.planDailyWakeAppointments({
          nodeId: validId,
          pitId: validId,
          facilityId: '6717a0000000000000000001',
          scheduleDate: today,
          energyParams: {
            currentSupercapMv: 4850,
            tegDeltaTC: 26,
          },
        });
        return reply.send({ success: true, data: defaultPlan });
      }

      return reply.send({ success: true, data: plan });
    }
  );

  /**
   * POST /api/v1/fleet/scheduler/generate
   * Generates or re-optimizes dynamic wake appointments based on roster and risk triggers (Feature 1)
   */
  fastify.post(
    '/scheduler/generate',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = request.body as {
        nodeId: string;
        pitId: string;
        facilityId: string;
        scheduleDate?: string;
        currentSupercapMv?: number;
        tegDeltaTC?: number;
        rosteredTasks?: Array<{
          taskName: string;
          workerName: string;
          expectedStartTime: string;
          taskType: 'TURNING' | 'WATERING' | 'LOADING';
        }>;
        hasRisingMethaneRisk?: boolean;
      };

      if (!body.nodeId || !body.pitId || !body.facilityId) {
        return reply.code(400).send({
          success: false,
          error: 'nodeId, pitId, and facilityId are required.',
        });
      }

      const today = body.scheduleDate || new Date().toISOString().slice(0, 10);
      const tasks = body.rosteredTasks?.map((t) => ({
        taskName: t.taskName,
        workerName: t.workerName,
        expectedStartTime: new Date(t.expectedStartTime),
        taskType: t.taskType,
      }));

      const plan = await wakeSchedulerService.planDailyWakeAppointments({
        nodeId: body.nodeId,
        pitId: body.pitId,
        facilityId: body.facilityId,
        scheduleDate: today,
        energyParams: {
          currentSupercapMv: body.currentSupercapMv ?? 4900,
          tegDeltaTC: body.tegDeltaTC ?? 24,
        },
        rosteredTasks: tasks,
        hasRisingMethaneRisk: body.hasRisingMethaneRisk,
      });

      return reply.send({
        success: true,
        message: 'Dynamic harvest-aware wake schedule generated.',
        data: plan,
      });
    }
  );
};
