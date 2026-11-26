import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

import { env } from './config/env';
import { connectDatabase } from './db/mongoose';
import authPlugin from './plugins/auth';
import socketPlugin from './plugins/socket';
import redisPlugin from './plugins/redis';
import { tracingPlugin } from './plugins/tracing';

import { authRoutes } from './routes/auth';
import { telemetryRoutes } from './routes/telemetry';
import { verificationRoutes } from './routes/verification';
import { sanjivaniRoutes } from './routes/sanjivani';
import { odorPredictorRoutes } from './routes/odor-predictor';
import { pitMonitorRoutes } from './routes/pit-monitor';
import { alarmRoutes } from './routes/alarm';
import { assetRoutes } from './routes/assets';
import { userRoutes } from './routes/users';
import { hqRoutes } from './routes/hq';
import { aiRoutes } from './routes/ai';
import { complianceRoutes } from './routes/compliance';
import { fleetRoutes } from './routes/fleet';
import { batchRoutes } from './routes/batches';
import { passportRoutes } from './routes/passport';
import { craftRoutes } from './routes/craft';
import { vol3Routes } from './routes/vol3';
import { vol4Routes } from './routes/vol4';
import { vol5Routes } from './routes/vol5';


import { initVerificationWorker } from './queues/verification.queue';
import { initAlertWorker, scheduleBackgroundJobs } from './queues/alert.queue';
import { initTelemetryWorker } from './queues/telemetry.queue';
import { bootstrapMasterAdmin } from './scripts/init_master_admin';

async function bootstrap() {
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
    trustProxy: true,
  });

  // Security & Utility Plugins
  await fastify.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production',
  });

  await fastify.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
  });

  // Database Connection
  try {
    await connectDatabase();
    fastify.log.info('🌿 Connected to MongoDB Atlas Data Lake');
    await bootstrapMasterAdmin();
  } catch (dbErr) {
    fastify.log.warn('⚠️ MongoDB connection pending. Please configure MONGODB_URI in packages/api/.env or start local MongoDB.');
  }

  // Tracing, Redis, Socket.IO & Auth Plugins
  await fastify.register(tracingPlugin);
  await fastify.register(redisPlugin);
  await fastify.register(socketPlugin);
  await fastify.register(authPlugin);

  // Initialize BullMQ Workers with Socket.IO access
  try {
    initVerificationWorker(fastify.io);
    initAlertWorker(fastify.io);
    initTelemetryWorker(fastify.io);
    scheduleBackgroundJobs().catch(() => {
      fastify.log.warn('Background scheduler queued until Redis comes online');
    });
    fastify.log.info('⚙️ BullMQ Algorithmic Verification & Health Workers initialized');
  } catch (queueErr) {
    fastify.log.warn({ queueErr }, 'Queue workers startup warning (Redis may be offline)');
  }

  // Health check routes
  fastify.get('/health', async () => ({
    status: 'HEALTHY',
    system: 'Prithvi Grid Central Engine',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }));

  fastify.get('/', async () => ({
    message: '🌱 Prithvi Grid API (api.prithvigrid.com) — Central Node.js & Algorithm Engine',
    docs: '/api/v1/docs',
    version: '1.0.0',
  }));

  // Public Pit Passport direct URL (e.g. prithvigrid.com/passport/PG-PIT-042)
  fastify.register(passportRoutes, { prefix: '/passport' });

  // Register All API v1 Routes
  fastify.register(
    async (v1) => {
      v1.register(authRoutes, { prefix: '/auth' });
      v1.register(telemetryRoutes, { prefix: '/telemetry' });
      v1.register(verificationRoutes, { prefix: '/verification' });
      v1.register(sanjivaniRoutes, { prefix: '/sanjivani' });
      v1.register(odorPredictorRoutes, { prefix: '/odor-predictor' });
      v1.register(pitMonitorRoutes, { prefix: '/pit-monitor' });
      v1.register(alarmRoutes, { prefix: '/alarm' });
      v1.register(assetRoutes, { prefix: '/assets' });
      v1.register(userRoutes, { prefix: '/users' });
      v1.register(hqRoutes, { prefix: '/hq' });
      v1.register(aiRoutes, { prefix: '/ai' });
      v1.register(complianceRoutes, { prefix: '/compliance' });
      v1.register(fleetRoutes, { prefix: '/fleet' });
      v1.register(batchRoutes, { prefix: '/batches' });
      v1.register(passportRoutes, { prefix: '/passport' });
      v1.register(craftRoutes, { prefix: '/craft' });
      v1.register(vol3Routes, { prefix: '/vol3' });
      v1.register(vol4Routes, { prefix: '/vol4' });
      v1.register(vol5Routes, { prefix: '/vol5' });
    },
    { prefix: '/api/v1' }
  );

  // Graceful shutdown handling
  const signals = ['SIGINT', 'SIGTERM'] as const;
  for (const sig of signals) {
    process.on(sig, async () => {
      fastify.log.info(`Received ${sig}, closing Prithvi Grid server...`);
      await fastify.close();
      process.exit(0);
    });
  }

  // Start HTTP + WebSocket Server
  try {
    await fastify.listen({ port: env.PORT, host: '0.0.0.0' });
    fastify.log.info(`🚀 Prithvi Grid API active at http://0.0.0.0:${env.PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

bootstrap();
