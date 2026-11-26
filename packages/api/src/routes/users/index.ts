import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { UserAuthRoster } from '../../db/models/UserAuthRoster';
import { FacilityLocation } from '../../db/models/FacilityLocation';
import { toValidObjectId } from '../../utils/safe-lookup';
import type { JwtPayload } from '../../types';

const createUserSchema = z.object({
  phone: z.string().min(10),
  name: z.string().min(2),
  role: z.enum(['BWG_MANAGER', 'SAFAI_MITRA']),
  facilityId: z.string().optional(),
  assignedBoxes: z.array(z.string()).default([]),
  assignedNodes: z.array(z.string()).default([]),
  shiftStart: z.string().default('08:00'),
  shiftEnd: z.string().default('16:00'),
  activeDays: z.array(z.string()).default(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']),
});

const updateRosterSchema = z.object({
  assignedBoxes: z.array(z.string()).optional(),
  assignedNodes: z.array(z.string()).optional(),
  shiftStart: z.string().optional(),
  shiftEnd: z.string().optional(),
  activeDays: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/users/roster
   */
  fastify.get(
    '/roster',
    { preHandler: [fastify.authenticate, fastify.requireRole('BWG_MANAGER')] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const query: any = { role: 'SAFAI_MITRA' };

      if (user.role !== 'SUPREME_HEAD') {
        query.entityId = user.entityId;
        if (user.facilityId) query.facilityId = user.facilityId;
      }

      const workers = await UserAuthRoster.find(query)
        .populate('assignedBoxes', 'name')
        .populate('assignedNodes', 'name')
        .lean();

      return reply.send({ success: true, data: workers });
    }
  );

  /**
   * POST /api/v1/users
   * Add new labour or manager into duty roster
   */
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, fastify.requireRole('BWG_MANAGER')] },
    async (request, reply) => {
      const currentUser = request.user as JwtPayload;
      const parse = createUserSchema.safeParse(request.body);

      if (!parse.success) {
        return reply.code(400).send({
          success: false,
          error: 'ValidationError',
          message: parse.error.errors[0]?.message,
        });
      }

      const data = parse.data;

      // Only SUPREME_HEAD can create BWG_MANAGER accounts; Managers can only create SAFAI_MITRA
      if (currentUser.role !== 'SUPREME_HEAD' && data.role === 'BWG_MANAGER') {
        return reply.code(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Only Supreme Head can register new BWG Managers',
        });
      }

      // Ensure phone does not already exist
      const existing = await UserAuthRoster.findOne({ phone: data.phone });
      if (existing) {
        return reply.code(409).send({
          success: false,
          message: 'Phone number already registered in roster',
        });
      }

      // Verify facility belongs to tenant if specified
      const targetFacilityId = data.facilityId || currentUser.facilityId;
      if (targetFacilityId && currentUser.role !== 'SUPREME_HEAD') {
        const fac = await FacilityLocation.findById(targetFacilityId);
        if (!fac || String(fac.entityId) !== String(currentUser.entityId)) {
          return reply.code(403).send({
            success: false,
            error: 'Forbidden',
            message: 'Facility does not belong to your organization',
          });
        }
      }

      const newUser = await UserAuthRoster.create({
        ...data,
        entityId: currentUser.role === 'SUPREME_HEAD' ? (request.body as any).entityId || currentUser.entityId : currentUser.entityId,
        facilityId: targetFacilityId,
        isActive: true,
      });

      return reply.code(201).send({
        success: true,
        message: 'Worker registered into duty roster successfully',
        data: newUser,
      });
    }
  );

  /**
   * PATCH /api/v1/users/roster/:id
   * Update duty roster schedule & assignments with strict tenant scoping
   */
  fastify.patch(
    '/roster/:id',
    { preHandler: [fastify.authenticate, fastify.requireRole('BWG_MANAGER')] },
    async (request, reply) => {
      const currentUser = request.user as JwtPayload;
      const { id } = request.params as { id: string };

      if (!toValidObjectId(id)) {
        return reply.code(400).send({ success: false, message: 'Invalid user ID format' });
      }

      const parse = updateRosterSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.code(400).send({
          success: false,
          error: 'ValidationError',
          message: parse.error.errors[0]?.message,
        });
      }

      const filter: any = { _id: id };
      if (currentUser.role !== 'SUPREME_HEAD') {
        filter.entityId = currentUser.entityId;
      }

      const updated = await UserAuthRoster.findOneAndUpdate(filter, parse.data, { new: true })
        .populate('assignedBoxes', 'name')
        .populate('assignedNodes', 'name');

      if (!updated) {
        return reply.code(404).send({
          success: false,
          message: 'Worker record not found or not in your organization',
        });
      }

      return reply.send({
        success: true,
        message: 'Duty roster updated successfully',
        data: updated,
      });
    }
  );
};
