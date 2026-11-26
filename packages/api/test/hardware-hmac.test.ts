import { describe, it } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';

describe('Hardware Ingestion HMAC-SHA256 Cryptographic Contract', () => {
  const secretKey = 'test-node-secret-key-32-chars!!';
  const nodeId = '6715f50f757f4955b20b1234';
  const timestamp = new Date().toISOString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = JSON.stringify({ tempC: 58.5, moisturePct: 50.2, ph: 6.8 });

  function generateSignature(node: string, time: string, n: string, body: string, key: string) {
    const canonical = `${node}:${time}:${n}:${body}`;
    return crypto.createHmac('sha256', key).update(canonical).digest('hex');
  }

  it('generates and validates authentic HMAC-SHA256 signature', () => {
    const signature = generateSignature(nodeId, timestamp, nonce, payload, secretKey);

    const canonical = `${nodeId}:${timestamp}:${nonce}:${payload}`;
    const computed = crypto.createHmac('sha256', secretKey).update(canonical).digest('hex');

    const isValid =
      signature.length === computed.length &&
      crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(computed, 'hex'));

    assert.strictEqual(isValid, true);
  });

  it('fails verification if payload is tampered in transit', () => {
    const signature = generateSignature(nodeId, timestamp, nonce, payload, secretKey);
    const tamperedPayload = JSON.stringify({ tempC: 75.0, moisturePct: 50.2, ph: 6.8 });

    const canonical = `${nodeId}:${timestamp}:${nonce}:${tamperedPayload}`;
    const computed = crypto.createHmac('sha256', secretKey).update(canonical).digest('hex');

    const isValid =
      signature.length === computed.length &&
      crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(computed, 'hex'));

    assert.strictEqual(isValid, false);
  });

  it('fails verification if wrong device secret is used', () => {
    const wrongKey = 'attacker-wrong-secret-key-32-!!';
    const signature = generateSignature(nodeId, timestamp, nonce, payload, wrongKey);

    const canonical = `${nodeId}:${timestamp}:${nonce}:${payload}`;
    const computed = crypto.createHmac('sha256', secretKey).update(canonical).digest('hex');

    const isValid =
      signature.length === computed.length &&
      crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(computed, 'hex'));

    assert.strictEqual(isValid, false);
  });
});
