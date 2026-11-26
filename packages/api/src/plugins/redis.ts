import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import Redis from 'ioredis';
import { env } from '../config/env';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

const redisPlugin: FastifyPluginAsync = async (fastify) => {
  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 5 && env.NODE_ENV === 'development') {
        return null;
      }
      return Math.min(times * 500, 3000);
    },
  });

  redis.on('connect', () => fastify.log.info('🌿 Redis connected'));
  redis.on('error', (err) => {
    if (env.NODE_ENV !== 'development') {
      fastify.log.error({ err }, 'Redis error');
    }
  });

  redis.connect().catch(() => {
    fastify.log.warn('⚠️ Redis offline. BullMQ verification workers will connect once Redis is started.');
  });

  fastify.decorate('redis', redis);

  fastify.addHook('onClose', async () => {
    try {
      await redis.quit();
    } catch {}
    fastify.log.info('Redis disconnected gracefully');
  });
};

export default fp(redisPlugin, { name: 'redis' });
