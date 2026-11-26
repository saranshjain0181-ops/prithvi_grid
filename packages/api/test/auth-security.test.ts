import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  canRequestOtp,
  recordOtpRequest,
  canVerifyOtp,
  recordFailedVerify,
  resetVerifyAttempts,
} from '../src/services/auth-rate-limit.service';

describe('Authentication Hardening & Rate Limiting', () => {
  const testPhone = '9999988888';

  it('allows initial OTP requests within threshold', () => {
    const check1 = canRequestOtp(testPhone);
    assert.strictEqual(check1.allowed, true);
    recordOtpRequest(testPhone);
  });

  it('enforces rate limit after 5 OTP requests within 15 minutes', () => {
    // Fill up quota to 5
    for (let i = 0; i < 4; i++) {
      recordOtpRequest(testPhone);
    }

    // 6th request must be rejected with retryAfter
    const checkBlocked = canRequestOtp(testPhone);
    assert.strictEqual(checkBlocked.allowed, false);
    assert.ok((checkBlocked.retryAfterSeconds || 0) > 0);
  });

  it('locks account after 5 consecutive failed verification attempts', () => {
    const targetPhone = '9999911111';

    // 4 failed attempts should not lock yet
    for (let i = 0; i < 4; i++) {
      const res = recordFailedVerify(targetPhone);
      assert.strictEqual(res.locked, false);
      assert.strictEqual(res.attemptsLeft, 4 - i);
    }

    // 5th failed attempt triggers lockout
    const fifth = recordFailedVerify(targetPhone);
    assert.strictEqual(fifth.locked, true);
    assert.strictEqual(fifth.attemptsLeft, 0);

    // Subsequent verification must be blocked
    const guard = canVerifyOtp(targetPhone);
    assert.strictEqual(guard.allowed, false);
    assert.ok((guard.retryAfterSeconds || 0) > 0);

    // Resetting attempts unlocks
    resetVerifyAttempts(targetPhone);
    const afterReset = canVerifyOtp(targetPhone);
    assert.strictEqual(afterReset.allowed, true);
  });
});
