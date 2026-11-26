import type { FastifyPluginAsync } from 'fastify';
import { evaluateOdorRisk } from '../../services/odor.service';
import { AiAlertSanjivani } from '../../db/models/AiAlertSanjivani';
import { PhysicalAsset } from '../../db/models/PhysicalAsset';
import { FacilityLocation } from '../../db/models/FacilityLocation';
import { resolveNodeAsset } from '../../utils/safe-lookup';
import { assertTenantOwnership } from '../../middleware/tenant-guard';
import type { JwtPayload } from '../../types';

export const odorPredictorRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/odor-predictor/check/:nodeId
   */
  fastify.get(
    '/check/:nodeId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const { nodeId } = request.params as { nodeId: string };
      const node = await resolveNodeAsset(
        nodeId,
        user.role !== 'SUPREME_HEAD' ? user.entityId : undefined
      );

      if (!node) {
        return reply.code(404).send({ success: false, message: 'Node not found in your organization' });
      }

      if (!assertTenantOwnership(user, node.entityId, reply, 'Node asset')) {
        return;
      }

      const result = await evaluateOdorRisk(
        node._id.toString(),
        node.facilityId.toString(),
        fastify.io
      );

      return reply.send({ success: true, data: result });
    }
  );

  /**
   * GET /api/v1/odor-predictor/active
   */
  fastify.get(
    '/active',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const query: any = {
        alertType: 'ODOR_WARNING',
        acknowledged: false,
      };

      if (user.role !== 'SUPREME_HEAD') {
        const facilities = await FacilityLocation.find({ entityId: user.entityId }).select('_id');
        const facIds = facilities.map((f) => f._id);
        query.facilityId = { $in: facIds };
      }

      const activeOdorAlerts = await AiAlertSanjivani.find(query)
        .sort({ createdAt: -1 })
        .populate('nodeId', 'name')
        .populate('facilityId', 'facilityName')
        .lean();

      return reply.send({ success: true, data: activeOdorAlerts });
    }
  );
};
