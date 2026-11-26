import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { resolveNodeAsset } from '../../utils/safe-lookup';
import { assertTenantOwnership } from '../../middleware/tenant-guard';
import { RemoteCommand } from '../../db/models/RemoteCommand';
import type { JwtPayload } from '../../types';

const alarmResetSchema = z.object({
  nodeId: z.string().min(1),
  reason: z.string().optional(),
});

const queueCommandSchema = z.object({
  nodeId: z.string().min(1),
  command: z.enum(['BUZZER_MUTE', 'LED_STROBE', 'SET_BURST_INTERVAL', 'REBOOT', 'DIAGNOSTIC_PING']),
  payload: z.record(z.any()).optional(),
  expiresInHours: z.number().min(1).max(168).optional().default(24),
});

export const alarmRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/v1/alarm/reset
   * Remote piezo buzzer silence / alarm override
   */
  fastify.post(
    '/reset',
    { preHandler: [fastify.authenticate, fastify.requireRole('BWG_MANAGER')] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const parse = alarmResetSchema.safeParse(request.body);

      if (!parse.success) {
        return reply.code(400).send({
          success: false,
          error: 'ValidationError',
          message: parse.error.errors[0]?.message,
        });
      }

      const { nodeId, reason } = parse.data;

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

      // Record alarm reset state in node
      (node as any).alarmActive = false;
      (node as any).lastAlarmResetAt = new Date();
      (node as any).lastAlarmResetBy = user.userId;
      await node.save();

      // Stage asynchronous remote command for battery-less node wake-up piggybacking (Workstream D4)
      const commandDoc = await RemoteCommand.create({
        nodeId: node._id,
        facilityId: node.facilityId,
        entityId: node.entityId,
        command: 'BUZZER_MUTE',
        payload: { reason: reason || 'Remote silence triggered by manager' },
        status: 'PENDING',
        issuedBy: user.userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      // Emit downstream hardware buzzer mute event for connected dashboard WebSockets
      fastify.io.emit('alarm:reset', {
        nodeId: node._id.toString(),
        resetBy: user.userId,
        reason: reason || 'Remote silence triggered by manager',
        commandId: commandDoc._id.toString(),
        timestamp: new Date().toISOString(),
      });

      return reply.send({
        success: true,
        message: `Remote piezo buzzer for node ${node.name} marked for silence. Will be delivered on next modem wake-up.`,
        data: {
          nodeId: node._id.toString(),
          alarmActive: false,
          commandId: commandDoc._id.toString(),
          commandStatus: commandDoc.status,
          resetAt: new Date().toISOString(),
        },
      });
    }
  );

  /**
   * POST /api/v1/alarm/command
   * Enqueue arbitrary wake-up command for the battery-less IoT node
   */
  fastify.post(
    '/command',
    { preHandler: [fastify.authenticate, fastify.requireRole('BWG_MANAGER')] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const parse = queueCommandSchema.safeParse(request.body);

      if (!parse.success) {
        return reply.code(400).send({
          success: false,
          error: 'ValidationError',
          message: parse.error.errors[0]?.message,
        });
      }

      const { nodeId, command, payload, expiresInHours } = parse.data;
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

      const commandDoc = await RemoteCommand.create({
        nodeId: node._id,
        facilityId: node.facilityId,
        entityId: node.entityId,
        command,
        payload: payload || {},
        status: 'PENDING',
        issuedBy: user.userId,
        expiresAt: new Date(Date.now() + (expiresInHours || 24) * 60 * 60 * 1000),
      });

      return reply.code(201).send({
        success: true,
        message: `Command ${command} queued for node ${node.name}. Delivered on next wake-up burst.`,
        data: {
          commandId: commandDoc._id.toString(),
          nodeId: node._id.toString(),
          command: commandDoc.command,
          status: commandDoc.status,
          expiresAt: commandDoc.expiresAt,
        },
      });
    }
  );

  /**
   * GET /api/v1/alarm/commands/:nodeId
   * Retrieve command queue and delivery audit log for a node
   */
  fastify.get(
    '/commands/:nodeId',
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

      const commands = await RemoteCommand.find({ nodeId: node._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('issuedBy', 'name phone role')
        .lean();

      return reply.send({
        success: true,
        data: {
          nodeId: node._id.toString(),
          name: node.name,
          commands,
        },
      });
    }
  );

  /**
   * GET /api/v1/alarm/status/:nodeId
   */
  fastify.get(
    '/status/:nodeId',
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

      return reply.send({
        success: true,
        data: {
          nodeId: node._id.toString(),
          name: node.name,
          alarmActive: (node as any).alarmActive ?? false,
          lastAlarmResetAt: (node as any).lastAlarmResetAt,
        },
      });
    }
  );
};
