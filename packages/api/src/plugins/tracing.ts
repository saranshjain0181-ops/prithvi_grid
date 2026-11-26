import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';
import { metricsRegistry } from '../services/metrics.service';

export const tracingPlugin: FastifyPluginAsync = fp(async (fastify) => {
  // 1. Inbound trace correlation hook
  fastify.addHook('onRequest', async (request, reply) => {
    const traceId = (request.headers['x-trace-id'] as string) || crypto.randomUUID();
    (request as any).traceId = traceId;
    (request as any).startTime = process.hrtime();
    reply.header('x-trace-id', traceId);
  });

  // 2. Outbound response metrics & latency hook
  fastify.addHook('onResponse', async (request, reply) => {
    const startTime = (request as any).startTime;
    if (startTime) {
      const diff = process.hrtime(startTime);
      const durationMs = diff[0] * 1000 + diff[1] / 1e6;

      const method = request.method;
      const urlPath = request.routerPath || request.url.split('?')[0];
      const statusCode = reply.statusCode;

      metricsRegistry.incrementCounter('prithvi_http_requests_total', {
        method,
        route: urlPath,
        status: statusCode,
      });

      metricsRegistry.observeHistogram('prithvi_http_request_duration_ms', durationMs, {
        method,
        route: urlPath,
      });
    }
  });

  // 3. Prometheus / OpenMetrics scrape endpoint
  fastify.get('/metrics', async (_, reply) => {
    const metricsText = metricsRegistry.toPrometheusFormat();
    return reply
      .header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
      .send(metricsText);
  });
});
