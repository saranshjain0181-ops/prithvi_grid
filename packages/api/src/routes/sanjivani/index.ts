import type { FastifyPluginAsync } from 'fastify';
import { Types } from 'mongoose';
import { z } from 'zod';
import { AiAlertSanjivani } from '../../db/models/AiAlertSanjivani';
import { FacilityLocation } from '../../db/models/FacilityLocation';
import { evaluateSanjivaniTrigger } from '../../services/sanjivani.service';
import { assertTenantOwnership } from '../../middleware/tenant-guard';
import { toValidObjectId } from '../../utils/safe-lookup';
import type { JwtPayload } from '../../types';

const evaluateSchema = z.object({
  facilityId: z.string().min(1),
  nodeId: z.string().min(1),
  boxId: z.string().optional(),
  tempC: z.number(),
  ph: z.number(),
  moisturePct: z.number(),
  managerPhone: z.string().optional(),
});

export const sanjivaniRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/sanjivani/alerts/:facilityId
   */
  fastify.get(
    '/alerts/:facilityId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const { facilityId } = request.params as { facilityId: string };

      if (!toValidObjectId(facilityId)) {
        return reply.code(400).send({ success: false, message: 'Invalid facility ID format' });
      }

      if (user.role !== 'SUPREME_HEAD') {
        const fac = await FacilityLocation.findById(facilityId);
        if (!fac || !assertTenantOwnership(user, fac.entityId, reply, 'Facility')) {
          return;
        }
      }

      const alerts = await AiAlertSanjivani.find({
        facilityId,
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('nodeId', 'name')
        .populate('boxId', 'name')
        .lean();

      return reply.send({ success: true, data: alerts });
    }
  );

  /**
   * POST /api/v1/sanjivani/evaluate
   */
  fastify.post(
    '/evaluate',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const parse = evaluateSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.code(400).send({
          success: false,
          error: 'ValidationError',
          message: parse.error.errors[0]?.message,
        });
      }

      if (user.role !== 'SUPREME_HEAD') {
        const fac = await FacilityLocation.findById(parse.data.facilityId);
        if (!fac || !assertTenantOwnership(user, fac.entityId, reply, 'Facility')) {
          return;
        }
      }

      const result = await evaluateSanjivaniTrigger(parse.data, fastify.io);
      return reply.send({ success: true, data: result });
    }
  );

  /**
   * POST /api/v1/sanjivani/reset/:alertId
   */
  fastify.post(
    '/reset/:alertId',
    { preHandler: [fastify.authenticate, fastify.requireRole('BWG_MANAGER')] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const { alertId } = request.params as { alertId: string };

      if (!toValidObjectId(alertId)) {
        return reply.code(400).send({ success: false, message: 'Invalid alert ID format' });
      }

      const alert = await AiAlertSanjivani.findById(alertId);
      if (!alert) {
        return reply.code(404).send({ success: false, message: 'Alert not found' });
      }

      if (user.role !== 'SUPREME_HEAD') {
        const fac = await FacilityLocation.findById(alert.facilityId);
        if (!fac || !assertTenantOwnership(user, fac.entityId, reply, 'Facility alert')) {
          return;
        }
      }

      alert.status = 'ACKNOWLEDGED';
      alert.acknowledgedBy = new Types.ObjectId(user.userId);
      alert.acknowledgedAt = new Date();
      await alert.save();

      return reply.send({
        success: true,
        message: 'Sanjivani emergency alert acknowledged and reset',
        data: alert,
      });
    }
  );
};
