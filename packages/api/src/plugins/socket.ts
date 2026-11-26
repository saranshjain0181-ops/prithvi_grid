import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { Server as SocketIOServer, type Socket } from 'socket.io';
import { env } from '../config/env';
import type { JwtPayload } from '../types';
import jwt from 'jsonwebtoken';

declare module 'fastify' {
  interface FastifyInstance {
    io: SocketIOServer;
  }
}

const socketPlugin: FastifyPluginAsync = async (fastify) => {
  const io = new SocketIOServer(fastify.server, {
    cors: {
      origin: env.NODE_ENV === 'production' ? false : '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    path: '/ws',
  });

  // JWT authentication middleware for Socket.IO
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error('Authentication token required'));
    }
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      (socket as Socket & { user: JwtPayload }).user = payload;
      next();
    } catch {
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as Socket & { user: JwtPayload }).user;
    fastify.log.info({ userId: user?.userId, socketId: socket.id }, 'Socket.IO client connected');

    // Join rooms based on entity and facility
    if (user?.entityId) {
      void socket.join(`entity:${user.entityId}`);
    }

    socket.on('join:facility', (facilityId: string) => {
      if (facilityId) {
        void socket.join(`facility:${facilityId}`);
        fastify.log.debug({ socketId: socket.id, facilityId }, 'Client joined facility room');
      }
    });

    socket.on('join:node', (nodeId: string) => {
      if (nodeId) {
        void socket.join(`node:${nodeId}`);
      }
    });

    socket.on('leave:facility', (facilityId: string) => {
      void socket.leave(`facility:${facilityId}`);
    });

    socket.on('disconnect', (reason) => {
      fastify.log.debug({ socketId: socket.id, reason }, 'Socket.IO client disconnected');
    });
  });

  fastify.decorate('io', io);

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    await new Promise<void>((resolve) => io.close(() => resolve()));
    fastify.log.info('Socket.IO server closed');
  });
};

export default fp(socketPlugin, { name: 'socket' });
