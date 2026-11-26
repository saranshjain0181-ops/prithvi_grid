import type { FastifyRequest, FastifyReply } from 'fastify';
import { ROLE_WEIGHTS } from '../config/constants';
import type { UserRole } from '../db/models/UserAuthRoster';
import type { JwtPayload } from '../types';

/**
 * requireRole — Returns a Fastify preHandler that enforces role-based access.
 * SUPREME_HEAD > BWG_MANAGER > SAFAI_MITRA
 */
export function requireRole(minimumRole: UserRole) {
  return async function rbacHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      return reply.code(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const userWeight = ROLE_WEIGHTS[user.role] ?? 0;
    const requiredWeight = ROLE_WEIGHTS[minimumRole] ?? 0;

    if (userWeight < requiredWeight) {
      return reply.code(403).send({
        success: false,
        error: 'Forbidden',
        message: `This action requires ${minimumRole} or higher privileges. Your role: ${user.role}`,
      });
    }
  };
}

/**
 * isSameEntityGuard — Ensures the requesting user belongs to the same entity
 * as the resource being accessed.
 */
export async function isSameEntityGuard(
  request: FastifyRequest<{ Params: { entityId?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const user = request.user as JwtPayload | undefined;
  const targetEntityId = request.params?.entityId;

  if (!user) {
    return reply.code(401).send({ success: false, error: 'Unauthorized' });
  }

  // SUPREME_HEAD can access any entity
  if (user.role === 'SUPREME_HEAD') return;

  if (targetEntityId && user.entityId !== targetEntityId) {
    return reply.code(403).send({
      success: false,
      error: 'Forbidden',
      message: 'You do not have access to this entity',
    });
  }
}
