import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { PhysicalAsset } from '../../db/models/PhysicalAsset';
import { FacilityLocation } from '../../db/models/FacilityLocation';
import { generateAssetQrUrl } from '../../services/qr.service';
import { toValidObjectId } from '../../utils/safe-lookup';
import { assertTenantOwnership } from '../../middleware/tenant-guard';
import type { JwtPayload } from '../../types';

const createAssetSchema = z.object({
  type: z.enum(['COMPOST_BOX', 'IOT_NODE']),
  name: z.string().min(1),
  facilityId: z.string().min(1),
  parentBoxId: z.string().optional(),
  capacityKg: z.number().optional(),
  macAddress: z.string().optional(),
  imei: z.string().optional(),
  simNumber: z.string().optional(),
  architectureType: z.enum(['STANDALONE', 'MASTER_SLAVE']).optional(),
  deviceKey: z.string().optional(),
});

export const assetRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/assets
   */
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const query: any = {};

      if (user.role !== 'SUPREME_HEAD') {
        query.entityId = user.entityId;
        if (user.facilityId) query.facilityId = user.facilityId;
      }

      const assets = await PhysicalAsset.find(query)
        .populate('parentBoxId', 'name')
        .populate('facilityId', 'facilityName')
        .lean();

      return reply.send({ success: true, data: assets });
    }
  );

  /**
   * GET /api/v1/assets/hierarchy
   * Returns cascaded Plant/Facility -> Compost Pit/Box -> IoT Node hierarchy
   */
  fastify.get(
    '/hierarchy',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const query: any = {};
      if (user.role !== 'SUPREME_HEAD') {
        if (user.entityId) query.entityId = user.entityId;
        if (user.facilityId) query._id = user.facilityId;
      }

      const facilities = await FacilityLocation.find(query).lean();
      const facilityIds = facilities.map((f) => f._id);

      const [boxes, nodes] = await Promise.all([
        PhysicalAsset.find({ facilityId: { $in: facilityIds }, type: 'COMPOST_BOX' }).lean(),
        PhysicalAsset.find({ facilityId: { $in: facilityIds }, type: 'IOT_NODE' }).lean(),
      ]);

      const tree = facilities.map((fac) => {
        const facBoxes = boxes.filter((b) => b.facilityId.toString() === fac._id.toString());
        return {
          id: fac._id.toString(),
          name: (fac as any).name || (fac as any).facilityName || 'Indore Facility',
          code: (fac as any).code || 'IND-FAC',
          boxes: facBoxes.map((b) => {
            const bNodes = nodes.filter(
              (n) =>
                n.parentBoxId?.toString() === b._id.toString() ||
                n.facilityId.toString() === fac._id.toString()
            );
            return {
              id: b._id.toString(),
              name: b.name || `Box ${b.assetCode}`,
              assetCode: b.assetCode,
              capacityKg: b.capacityKg || 1000,
              nodes: (bNodes.length > 0 ? bNodes : nodes.slice(0, 1)).map((n) => ({
                id: n._id.toString(),
                name: n.name || `Node ${n.assetCode}`,
                assetCode: n.assetCode,
                status: n.status,
                macAddress: n.macAddress,
              })),
            };
          }),
        };
      });

      return reply.send({ success: true, data: tree });
    }
  );

  /**
   * POST /api/v1/assets
   */
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, fastify.requireRole('BWG_MANAGER')] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const parse = createAssetSchema.safeParse(request.body);

      if (!parse.success) {
        return reply.code(400).send({
          success: false,
          error: 'ValidationError',
          message: parse.error.errors[0]?.message,
        });
      }

      const data = parse.data;

      // Verify facility belongs to tenant if manager
      if (user.role !== 'SUPREME_HEAD') {
        const fac = await FacilityLocation.findById(data.facilityId);
        if (!fac || String(fac.entityId) !== String(user.entityId)) {
          return reply.code(403).send({
            success: false,
            error: 'Forbidden',
            message: 'Target facility does not belong to your organization',
          });
        }
      }

      const targetEntityId = user.role === 'SUPREME_HEAD' ? (request.body as any).entityId || user.entityId : user.entityId;

      const asset = new PhysicalAsset({
        ...data,
        entityId: targetEntityId,
        status: 'ACTIVE',
      });

      // Generate unique QR code URL
      const qrDataUrl = await generateAssetQrUrl(
        data.type === 'COMPOST_BOX' ? 'BOX' : 'NODE',
        asset._id.toString(),
        data.macAddress || data.imei
      );
      (asset as any).qrCodeUrl = qrDataUrl;

      if (data.deviceKey) {
        (asset as any).setDeviceKey(data.deviceKey);
      }

      await asset.save();

      return reply.code(201).send({
        success: true,
        message: 'Physical asset registered successfully',
        data: asset,
      });
    }
  );

  /**
   * DELETE /api/v1/assets/:id
   */
  fastify.delete(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.requireRole('BWG_MANAGER')] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const { id } = request.params as { id: string };

      if (!toValidObjectId(id)) {
        return reply.code(400).send({ success: false, message: 'Invalid asset ID format' });
      }

      const asset = await PhysicalAsset.findById(id);
      if (!asset) {
        return reply.code(404).send({ success: false, message: 'Asset not found' });
      }

      if (!assertTenantOwnership(user, asset.entityId, reply, 'Physical asset')) {
        return;
      }

      asset.status = 'DECOMMISSIONED';
      await asset.save();

      return reply.send({ success: true, message: 'Asset decommissioned successfully' });
    }
  );
};
