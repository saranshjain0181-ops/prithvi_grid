import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../config/env';
import { ROLE_WEIGHTS } from '../config/constants';
import type { UserRole } from '../db/models/UserAuthRoster';
import type { JwtPayload } from '../types';

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Register access token JWT
  fastify.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_ACCESS_EXPIRES_IN },
    namespace: 'access',
    jwtVerify: 'accessVerify',
    jwtSign: 'accessSign',
  });

  // Register refresh token JWT with a different secret
  fastify.register(fastifyJwt, {
    secret: env.JWT_REFRESH_SECRET,
    sign: { expiresIn: env.JWT_REFRESH_EXPIRES_IN },
    namespace: 'refresh',
    jwtVerify: 'refreshVerify',
    jwtSign: 'refreshSign',
  });

  /**
   * Decorator: authenticate — validates the access token and attaches user to request.
   */
  fastify.decorate(
    'authenticate',
    async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
      try {
        if (typeof (request as any).accessVerify === 'function') {
          await (request as any).accessVerify();
        } else {
          const authHeader = request.headers.authorization;
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.code(401).send({ error: 'Unauthorized', message: 'Missing Bearer token' });
          }
          const token = authHeader.substring(7);
          const jwtMod = await import('jsonwebtoken');
          const decoded = jwtMod.default.verify(token, env.JWT_SECRET) as any;
          request.user = decoded;
        }
      } catch (err) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired access token' });
      }
    }
  );

  /**
   * Decorator: requireRole — returns a preHandler that enforces minimum role level.
   */
  fastify.decorate(
    'requireRole',
    function (minimumRole: UserRole) {
      return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const user = request.user as JwtPayload;
        if (!user) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }
        const userWeight = ROLE_WEIGHTS[user.role] ?? 0;
        const requiredWeight = ROLE_WEIGHTS[minimumRole] ?? 0;
        if (userWeight < requiredWeight) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: `This action requires at least ${minimumRole} privileges`,
          });
        }
      };
    }
  );
};

export default fp(authPlugin, { name: 'auth' });

// Module augmentation for Fastify
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (role: UserRole) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
