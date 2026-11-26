import type { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { PhysicalAsset } from '../db/models/PhysicalAsset';
import { env } from '../config/env';
import { toValidObjectId } from '../utils/safe-lookup';

// In-memory nonce cache with TTL to prevent telemetry replay attacks
const seenNonces = new Map<string, number>();

// Periodic cleanup of expired nonces (every 5 minutes) without holding the event loop open
const nonceCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, expiresAt] of seenNonces.entries()) {
    if (expiresAt <= now) {
      seenNonces.delete(key);
    }
  }
}, 5 * 60 * 1000);
nonceCleanupTimer.unref();

const REPLAY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes max clock drift / latency
const NONCE_TTL_MS = 10 * 60 * 1000;    // 10 minutes nonce retention

/**
 * hardwareAuthMiddleware
 * Enforces cryptographic authenticity on raw hardware packets.
 *
 * Preferred Protocol:
 *   X-Node-Id: <MongoDB ObjectId or Node Asset Code / MAC>
 *   X-Timestamp: <ISO 8601 string or epoch ms>
 *   X-Nonce: <unique hex/uuid>
 *   X-Signature: HMAC-SHA256(secretKey, `${nodeId}:${timestamp}:${nonce}:${payload}`)
 *
 * Backward-compatible Legacy Protocol (Dev / Deprecated):
 *   X-Device-Key: <plaintext device key>
 *   X-Node-Id: <nodeId>
 */
export async function hardwareAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const signature = request.headers['x-signature'] as string | undefined;
  const timestampHeader = request.headers['x-timestamp'] as string | undefined;
  const nonce = request.headers['x-nonce'] as string | undefined;
  const nodeId = request.headers['x-node-id'] as string | undefined;
  const legacyDeviceKey = request.headers['x-device-key'] as string | undefined;

  if (!nodeId) {
    return reply.code(401).send({
      success: false,
      error: 'Unauthorized',
      message: 'Missing X-Node-Id header',
    });
  }

  // 1. Optional IP allowlist check
  const allowedIps = env.ALLOWED_HARDWARE_IPS.split(',').map((ip) => ip.trim());
  const clientIp = request.ip;
  if (allowedIps.length > 0 && !allowedIps.includes('*') && !allowedIps.includes(clientIp)) {
    request.log.warn({ clientIp, nodeId }, 'Hardware auth: IP not in allowlist');
    return reply.code(403).send({
      success: false,
      error: 'Forbidden',
      message: 'IP address not authorized for hardware ingestion',
    });
  }

  try {
    // Look up active IoT node
    const isObjectId = toValidObjectId(nodeId);
    const assetQuery = isObjectId
      ? { _id: isObjectId, type: 'IOT_NODE', status: 'ACTIVE' }
      : {
          $or: [{ assetCode: nodeId }, { macAddress: nodeId }, { serialNumber: nodeId }],
          type: 'IOT_NODE',
          status: 'ACTIVE',
        };

    const asset = await PhysicalAsset.findOne(assetQuery).select('+deviceKeyHash +deviceKey');

    if (!asset) {
      return reply.code(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Node not found or not active in registry',
      });
    }

    // 2. Cryptographic Verification: Modern HMAC-SHA256 Scheme
    if (signature && timestampHeader && nonce) {
      const packetTime = new Date(timestampHeader).getTime();
      const now = Date.now();

      // Check timestamp freshness
      if (isNaN(packetTime) || Math.abs(now - packetTime) > REPLAY_WINDOW_MS) {
        request.log.warn({ nodeId, timestampHeader, diffMs: Math.abs(now - packetTime) }, 'HMAC Auth: Timestamp outside replay window');
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Telemetry packet expired or clock drift exceeds 5 minutes',
        });
      }

      // Check replay of nonce
      const nonceKey = `${asset._id.toString()}:${nonce}`;
      if (seenNonces.has(nonceKey)) {
        request.log.warn({ nodeId, nonce }, 'HMAC Auth: Replayed nonce detected');
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Duplicate or replayed nonce detected',
        });
      }

      // Record nonce
      seenNonces.set(nonceKey, now + NONCE_TTL_MS);

      // Secret key used for signing: deviceKey or deviceKeyHash
      const secret = (asset as any).deviceKey || asset.deviceKeyHash;
      if (!secret) {
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Node secret key not configured in registry',
        });
      }

      // Canonical payload calculation
      const rawBody = typeof request.body === 'string' ? request.body : JSON.stringify(request.body || {});
      const canonicalData = `${nodeId}:${timestampHeader}:${nonce}:${rawBody}`;

      const computedHmac = crypto
        .createHmac('sha256', secret)
        .update(canonicalData)
        .digest('hex');

      const isSigValid =
        signature.length === computedHmac.length &&
        crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(computedHmac, 'hex'));

      if (!isSigValid) {
        request.log.warn({ nodeId }, 'HMAC Auth: Signature verification failed');
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid cryptographic packet signature (HMAC-SHA256 mismatch)',
        });
      }
    } else if (legacyDeviceKey) {
      // 3. Fallback: Legacy Plaintext Device Key (Development / Simulated fleet only)
      if (!asset.deviceKeyHash) {
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Node has no device key configured',
        });
      }

      const incomingHash = crypto
        .createHash('sha256')
        .update(legacyDeviceKey)
        .digest('hex');

      const isKeyValid =
        incomingHash.length === asset.deviceKeyHash.length &&
        crypto.timingSafeEqual(
          Buffer.from(incomingHash, 'hex'),
          Buffer.from(asset.deviceKeyHash, 'hex')
        );

      if (!isKeyValid) {
        request.log.warn({ nodeId, clientIp }, 'Hardware auth: invalid device key');
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid device key',
        });
      }

      request.log.info({ nodeId }, '⚠️ Hardware packet ingested using legacy X-Device-Key. Please upgrade firmware to HMAC-SHA256.');
    } else {
      return reply.code(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Missing cryptographic authentication headers (X-Signature or legacy X-Device-Key)',
      });
    }

    // Attach verified asset to request
    (request as any).hardwareAsset = asset;

    // Asynchronously bump last seen timestamp
    PhysicalAsset.updateOne({ _id: asset._id }, { lastSeenAt: new Date(), ipAddress: clientIp })
      .exec()
      .catch((err) => request.log.error({ err }, 'Failed to update lastSeenAt'));
  } catch (err: any) {
    request.log.error({ err: err.message, nodeId }, 'Hardware auth error');
    return reply.code(500).send({
      success: false,
      error: 'Internal Server Error',
      message: 'Hardware authentication failed',
    });
  }
}
