import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { LabourExecutionLedger } from '../../db/models/LabourExecutionLedger';
import { PhysicalAsset } from '../../db/models/PhysicalAsset';
import { AI_THRESHOLDS } from '../../config/constants';
import { toValidObjectId, resolveNodeAsset, resolveBoxAsset } from '../../utils/safe-lookup';
import { assertTenantOwnership } from '../../middleware/tenant-guard';
import { getVerificationQueue } from '../../queues/verification.queue';
import { proximityProofService } from '../../services/proximity-proof.service';
import { Types } from 'mongoose';

import type { JwtPayload } from '../../types';

const triggerActionSchema = z.object({
  boxId: z.string().min(1),
  nodeId: z.string().optional(),
  actionType: z.string().min(1),
  locationLat: z.number().optional(),
  locationLong: z.number().optional(),
});

const overrideSchema = z.object({
  ledgerId: z.string().min(1),
  status: z.enum(['VERIFIED_GENUINE', 'FAKE_FLAG', 'MANAGER_OVERRIDE']),
  managerRemark: z.string().min(2),
});

export const verificationRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/v1/verification/trigger
   * Labour taps "Kaam Pura Hua" (Mark Done) on PWA
   */
  fastify.post(
    '/trigger',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const parse = triggerActionSchema.safeParse(request.body);

      if (!parse.success) {
        return reply.code(400).send({
          success: false,
          error: 'ValidationError',
          message: parse.error.errors[0]?.message,
        });
      }

      const { boxId, nodeId, actionType, locationLat, locationLong } = parse.data;

      // Safe lookup for box and node scoped to tenant
      const box = await resolveBoxAsset(boxId, undefined, user.role !== 'SUPREME_HEAD' ? user.entityId : undefined);
      if (!box) {
        return reply.code(404).send({ success: false, message: 'Compost box not found in your organization' });
      }

      let node = nodeId
        ? await resolveNodeAsset(nodeId, user.role !== 'SUPREME_HEAD' ? user.entityId : undefined)
        : null;

      if (!node) {
        node = await PhysicalAsset.findOne({
          parentBoxId: box._id,
          type: 'IOT_NODE',
          status: 'ACTIVE',
        });
      }

      const t0 = new Date();

      // Create ledger entry in PENDING status
      const ledgerEntry = await LabourExecutionLedger.create({
        entityId: box.entityId,
        facilityId: box.facilityId,
        boxId: box._id,
        nodeId: node ? node._id : undefined,
        labourId: user.userId,
        actionType,
        executedAt: t0,
        verificationStatus: 'PENDING',
        gpsLocation: locationLat && locationLong ? { lat: locationLat, long: locationLong } : undefined,
      });

      // Schedule 15-minute verification job via BullMQ
      const delayMs = process.env.NODE_ENV === 'test' ? 100 : AI_THRESHOLDS.VERIFICATION_WAIT_MS;
      const job = await getVerificationQueue().add(
        'verify-action',
        {
          ledgerId: ledgerEntry._id.toString(),
          boxId: box._id.toString(),
          nodeId: node ? node._id.toString() : '',
          labourId: user.userId,
          actionType,
          t0: t0.toISOString(),
        },
        { delay: delayMs }
      );

      return reply.code(201).send({
        success: true,
        message: 'Task recorded. 15-minute sensor verification engine running.',
        data: {
          ledgerId: ledgerEntry._id,
          jobId: job.id,
          waitMinutes: 15,
          status: 'PENDING',
        },
      });
    }
  );

  /**
   * GET /api/v1/verification/status/:ledgerId
   */
  fastify.get(
    '/status/:ledgerId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const { ledgerId } = request.params as { ledgerId: string };
      if (!toValidObjectId(ledgerId)) {
        return reply.code(400).send({ success: false, message: 'Invalid ledger record ID' });
      }

      const ledger = await LabourExecutionLedger.findById(ledgerId)
        .populate('labourId', 'name phone')
        .populate('nodeId', 'name')
        .populate('boxId', 'name')
        .lean();

      if (!ledger) {
        return reply.code(404).send({ success: false, message: 'Ledger record not found' });
      }

      // Enforce tenant boundary
      if (!assertTenantOwnership(user, ledger.entityId, reply, 'Ledger record')) {
        return;
      }

      // Safai Mitra can only view their own ledger entries
      if (user.role === 'SAFAI_MITRA' && String(ledger.labourId?._id || ledger.labourId) !== String(user.userId)) {
        return reply.code(403).send({
          success: false,
          error: 'Forbidden',
          message: 'You can only view your own task records',
        });
      }

      return reply.send({ success: true, data: ledger });
    }
  );

  /**
   * GET /api/v1/verification/history
   * Used for "Mere Pichle Kaam" (Safai Mitra) and Manager Audits
   */
  fastify.get(
    '/history',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const query: any = {};

      if (user.role === 'SAFAI_MITRA') {
        query.labourId = user.userId;
      } else if (user.role !== 'SUPREME_HEAD') {
        query.entityId = user.entityId;
        if (user.facilityId) query.facilityId = user.facilityId;
      }

      const history = await LabourExecutionLedger.find(query)
        .sort({ executedAt: -1 })
        .limit(50)
        .populate('labourId', 'name phone')
        .populate('boxId', 'name')
        .populate('nodeId', 'name')
        .lean();

      return reply.send({ success: true, data: history });
    }
  );

  /**
   * POST /api/v1/verification/override
   * BWG Manager can manually approve, reject, or comment on labour claims
   */
  fastify.post(
    '/override',
    { preHandler: [fastify.authenticate, fastify.requireRole('BWG_MANAGER')] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const parse = overrideSchema.safeParse(request.body);

      if (!parse.success) {
        return reply.code(400).send({
          success: false,
          error: 'ValidationError',
          message: parse.error.errors[0]?.message,
        });
      }

      const { ledgerId, status, managerRemark } = parse.data;

      if (!toValidObjectId(ledgerId)) {
        return reply.code(400).send({ success: false, message: 'Invalid ledger ID format' });
      }

      const existingLedger = await LabourExecutionLedger.findById(ledgerId);
      if (!existingLedger) {
        return reply.code(404).send({ success: false, message: 'Ledger record not found' });
      }

      // Enforce tenant boundary
      if (!assertTenantOwnership(user, existingLedger.entityId, reply, 'Ledger record')) {
        return;
      }

      existingLedger.verificationStatus = status;
      existingLedger.overrideReason = managerRemark;
      existingLedger.overrideBy = new Types.ObjectId(user.userId);
      existingLedger.managerId = new Types.ObjectId(user.userId);
      existingLedger.verifiedAt = new Date();
      await existingLedger.save();

      return reply.send({
        success: true,
        message: 'Ledger status updated successfully by Manager',
        data: existingLedger,
      });
    }
  );

  /**
   * GET /api/v1/verification/proximity-challenge
   * Generates a fresh random 128-bit cryptographic challenge nonce for BLE handshake (Feature 2)
   */
  fastify.get(
    '/proximity-challenge',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const nonce = proximityProofService.generateChallengeNonce();
      return reply.send({
        success: true,
        data: {
          nonce,
          expiresInSeconds: 300,
        },
      });
    }
  );

  /**
   * POST /api/v1/verification/proximity-proof
   * Verifies signed BLE handshake directly proving worker presence at the pit (Feature 2)
   */
  fastify.post(
    '/proximity-proof',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const body = request.body as {
        nodeId: string;
        pitId: string;
        facilityId: string;
        nonce: string;
        workerHash: string;
        nodeTimestamp: string;
        readingsSnapshot: {
          tempC: number;
          moisturePct: number;
          ph: number;
          methanePpm: number;
          supercapMv: number;
        };
        signature: string;
        syncedFromOffline?: boolean;
      };

      if (!body.nodeId || !body.pitId || !body.nonce || !body.signature) {
        return reply.code(400).send({
          success: false,
          error: 'nodeId, pitId, nonce, and signature are required.',
        });
      }

      try {
        const proof = await proximityProofService.verifyAndStoreProximityProof({
          workerId: user.userId,
          nodeId: body.nodeId,
          pitId: body.pitId,
          facilityId: body.facilityId || '6717a0000000000000000001',
          nonce: body.nonce,
          workerHash: body.workerHash || user.userId,
          nodeTimestamp: body.nodeTimestamp,
          readingsSnapshot: body.readingsSnapshot,
          signature: body.signature,
          syncedFromOffline: body.syncedFromOffline,
        });

        return reply.send({
          success: true,
          message: proof.verificationStatus === 'VALID'
            ? 'Pit proximity verified successfully over Bluetooth.'
            : 'Proximity proof recorded with verification flags.',
          data: proof,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error verifying proximity proof';
        return reply.code(400).send({
          success: false,
          error: msg,
        });
      }
    }
  );
};
