import type { FastifyRequest, FastifyReply } from 'fastify';
import { Types } from 'mongoose';
import type { JwtPayload } from '../types';

/**
 * Tenant scoping utility for Mongoose queries.
 * Supreme Head can query across all entities unless explicitly filtering.
 * All other roles (BWG_MANAGER, SAFAI_MITRA) are strictly locked to their user.entityId.
 */
export function buildTenantQuery<T extends Record<string, any>>(
  user: JwtPayload,
  baseQuery: T = {} as T
): T & { entityId?: Types.ObjectId | string } {
  if (user.role === 'SUPREME_HEAD') {
    return { ...baseQuery };
  }

  const query: any = { ...baseQuery };

  if (user.entityId && Types.ObjectId.isValid(user.entityId)) {
    query.entityId = new Types.ObjectId(user.entityId);
  } else if (user.entityId) {
    query.entityId = user.entityId;
  }

  return query;
}

/**
 * Enforce that a retrieved resource belongs to the requesting user's tenant.
 * Returns true if allowed, otherwise responds with 403 or 404 and returns false.
 */
export function assertTenantOwnership(
  user: JwtPayload,
  resourceEntityId: Types.ObjectId | string | undefined | null,
  reply: FastifyReply,
  resourceName = 'Resource'
): boolean {
  if (user.role === 'SUPREME_HEAD') {
    return true;
  }

  if (!resourceEntityId) {
    reply.code(403).send({
      success: false,
      error: 'Forbidden',
      message: `${resourceName} is not associated with any verified entity`,
    });
    return false;
  }

  const userEntityStr = user.entityId ? String(user.entityId) : '';
  const resourceEntityStr = String(resourceEntityId);

  if (userEntityStr !== resourceEntityStr) {
    reply.code(403).send({
      success: false,
      error: 'Forbidden',
      message: `Access denied. You do not have permission to access or modify this ${resourceName.toLowerCase()} across organizations.`,
    });
    return false;
  }

  return true;
}
