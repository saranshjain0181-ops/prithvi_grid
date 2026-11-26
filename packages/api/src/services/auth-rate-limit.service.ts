/**
 * In-memory & Redis-ready rate limiter and brute-force lockout guard for OTP authentication.
 */

interface RateRecord {
  requests: number[];
  failedAttempts: number;
  lockedUntil?: number;
}

const rateStore = new Map<string, RateRecord>();

// Clean up stale records periodically without holding the Node process open
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [phone, record] of rateStore.entries()) {
    record.requests = record.requests.filter((t) => now - t < 15 * 60 * 1000);
    if (record.requests.length === 0 && (!record.lockedUntil || record.lockedUntil < now) && record.failedAttempts === 0) {
      rateStore.delete(phone);
    }
  }
}, 5 * 60 * 1000);
cleanupTimer.unref();

const MAX_OTP_REQUESTS_PER_15_MIN = 5;
const MAX_VERIFY_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function canRequestOtp(phone: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  let record = rateStore.get(phone);
  if (!record) {
    record = { requests: [], failedAttempts: 0 };
    rateStore.set(phone, record);
  }

  // Filter out timestamps older than 15 minutes
  record.requests = record.requests.filter((t) => now - t < 15 * 60 * 1000);

  if (record.requests.length >= MAX_OTP_REQUESTS_PER_15_MIN) {
    const oldestRequest = record.requests[0];
    const retryAfter = Math.ceil((oldestRequest + 15 * 60 * 1000 - now) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfter) };
  }

  return { allowed: true };
}

export function recordOtpRequest(phone: string): void {
  const record = rateStore.get(phone);
  if (record) {
    record.requests.push(Date.now());
  } else {
    rateStore.set(phone, { requests: [Date.now()], failedAttempts: 0 });
  }
}

export function canVerifyOtp(phone: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = rateStore.get(phone);
  if (!record) return { allowed: true };

  if (record.lockedUntil && record.lockedUntil > now) {
    const retryAfter = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfter) };
  }

  // Lockout expired
  if (record.lockedUntil && record.lockedUntil <= now) {
    record.lockedUntil = undefined;
    record.failedAttempts = 0;
  }

  return { allowed: true };
}

export function recordFailedVerify(phone: string): { locked: boolean; attemptsLeft: number } {
  const now = Date.now();
  let record = rateStore.get(phone);
  if (!record) {
    record = { requests: [], failedAttempts: 0 };
    rateStore.set(phone, record);
  }

  record.failedAttempts += 1;

  if (record.failedAttempts >= MAX_VERIFY_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    return { locked: true, attemptsLeft: 0 };
  }

  return { locked: false, attemptsLeft: MAX_VERIFY_ATTEMPTS - record.failedAttempts };
}

export function resetVerifyAttempts(phone: string): void {
  const record = rateStore.get(phone);
  if (record) {
    record.failedAttempts = 0;
    record.lockedUntil = undefined;
  }
}
