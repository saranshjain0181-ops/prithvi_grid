import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { CompostBatch } from '../../db/models/CompostBatch';
import { FacilityLocation } from '../../db/models/FacilityLocation';
import {
  createCompostBatch,
  transitionBatchStage,
  certifyCompostBatch,
  harvestCompostBatch,
  generateEsgLedger,
} from '../../services/compost-batch.service';
import { assertTenantOwnership, buildTenantQuery } from '../../middleware/tenant-guard';
import { toValidObjectId } from '../../utils/safe-lookup';
import type { JwtPayload } from '../../types';

const createBatchSchema = z.object({
  facilityId: z.string().min(1),
  boxId: z.string().min(1),
  initialWasteWeightKg: z.number().positive(),
  notes: z.string().optional(),
});

const certifySchema = z.object({
  certificateNumber: z.string().min(3),
  nitrogenPct: z.number().min(0).max(10),
  phosphorusPct: z.number().min(0).max(10),
  potassiumPct: z.number().min(0).max(10),
  cnRatio: z.number().min(5).max(40),
  ph: z.number().min(4).max(10),
  moisturePct: z.number().min(10).max(60),
  heavyMetalsPassed: z.boolean().default(true),
  labTechnician: z.string().default('Certified Agronomist'),
});

const harvestSchema = z.object({
  curedCompostWeightKg: z.number().positive(),
  ratePerKgInr: z.number().positive().optional(),
  buyerOrganization: z.string().optional(),
  notes: z.string().optional(),
});

export const batchRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/batches
   * List compost batches (tenant-isolated)
   */
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const { stage, facilityId } = request.query as { stage?: string; facilityId?: string };

      const baseQuery: any = {};
      if (stage) baseQuery.stage = stage;
      if (facilityId && toValidObjectId(facilityId)) {
        baseQuery.facilityId = toValidObjectId(facilityId);
      }

      const query = buildTenantQuery(user, baseQuery);

      const batches = await CompostBatch.find(query)
        .populate('facilityId', 'facilityName code')
        .populate('boxId', 'name assetCode')
        .sort({ createdAt: -1 })
        .lean();

      return reply.send({
        success: true,
        data: batches,
        count: batches.length,
      });
    }
  );

  /**
   * POST /api/v1/batches
   * Start a new compost batch
   */
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, fastify.requireRole('BWG_MANAGER')] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const parse = createBatchSchema.safeParse(request.body);

      if (!parse.success) {
        return reply.code(400).send({
          success: false,
          error: 'ValidationError',
          message: parse.error.errors[0]?.message,
        });
      }

      const { facilityId, boxId, initialWasteWeightKg, notes } = parse.data;

      const fac = await FacilityLocation.findById(facilityId);
      if (!fac) {
        return reply.code(404).send({ success: false, message: 'Facility not found' });
      }

      if (!assertTenantOwnership(user, fac.entityId, reply, 'Facility')) {
        return;
      }

      const batch = await createCompostBatch({
        entityId: fac.entityId,
        facilityId,
        boxId,
        initialWasteWeightKg,
        notes,
      });

      return reply.code(201).send({
        success: true,
        message: 'Compost batch initiated successfully with ESG carbon baseline',
        data: batch,
      });
    }
  );

  /**
   * POST /api/v1/batches/:id/stage
   */
  fastify.post(
    '/:id/stage',
    { preHandler: [fastify.authenticate, fastify.requireRole('BWG_MANAGER')] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const { id } = request.params as { id: string };
      const { stage } = request.body as { stage: any };

      if (!toValidObjectId(id)) {
        return reply.code(400).send({ success: false, message: 'Invalid batch ID format' });
      }

      const existing = await CompostBatch.findById(id);
      if (!existing) {
        return reply.code(404).send({ success: false, message: 'Batch not found' });
      }

      if (!assertTenantOwnership(user, existing.entityId, reply, 'Batch')) {
        return;
      }

      const updated = await transitionBatchStage(id, stage);
      return reply.send({
        success: true,
        message: `Batch transitioned to ${stage}`,
        data: updated,
      });
    }
  );

  /**
   * POST /api/v1/batches/:id/certify
   */
  fastify.post(
    '/:id/certify',
    { preHandler: [fastify.authenticate, fastify.requireRole('BWG_MANAGER')] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const { id } = request.params as { id: string };
      const parse = certifySchema.safeParse(request.body);

      if (!parse.success) {
        return reply.code(400).send({
          success: false,
          error: 'ValidationError',
          message: parse.error.errors[0]?.message,
        });
      }

      if (!toValidObjectId(id)) {
        return reply.code(400).send({ success: false, message: 'Invalid batch ID format' });
      }

      const existing = await CompostBatch.findById(id);
      if (!existing) {
        return reply.code(404).send({ success: false, message: 'Batch not found' });
      }

      if (!assertTenantOwnership(user, existing.entityId, reply, 'Batch')) {
        return;
      }

      const certified = await certifyCompostBatch(id, parse.data);
      return reply.send({
        success: true,
        message: 'Official laboratory certificate attached',
        data: certified,
      });
    }
  );

  /**
   * POST /api/v1/batches/:id/harvest
   */
  fastify.post(
    '/:id/harvest',
    { preHandler: [fastify.authenticate, fastify.requireRole('BWG_MANAGER')] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const { id } = request.params as { id: string };
      const parse = harvestSchema.safeParse(request.body);

      if (!parse.success) {
        return reply.code(400).send({
          success: false,
          error: 'ValidationError',
          message: parse.error.errors[0]?.message,
        });
      }

      if (!toValidObjectId(id)) {
        return reply.code(400).send({ success: false, message: 'Invalid batch ID format' });
      }

      const existing = await CompostBatch.findById(id);
      if (!existing) {
        return reply.code(404).send({ success: false, message: 'Batch not found' });
      }

      if (!assertTenantOwnership(user, existing.entityId, reply, 'Batch')) {
        return;
      }

      const harvested = await harvestCompostBatch(id, parse.data);
      return reply.send({
        success: true,
        message: 'Batch successfully harvested with commercial valuation and volume reduction calculation',
        data: harvested,
      });
    }
  );

  /**
   * GET /api/v1/batches/esg-ledger
   */
  fastify.get(
    '/esg-ledger',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const targetEntityId = user.role === 'SUPREME_HEAD' && (request.query as any).entityId
        ? (request.query as any).entityId
        : user.entityId;

      if (!targetEntityId) {
        return reply.code(400).send({ success: false, message: 'Target entity ID required' });
      }

      const ledger = await generateEsgLedger(targetEntityId);
      return reply.send({
        success: true,
        data: ledger,
      });
    }
  );
};
