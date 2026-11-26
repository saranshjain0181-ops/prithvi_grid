import axios from 'axios';
import crypto from 'crypto';
import { env } from '../config/env';

export interface SendOtpResult {
  sessionId: string;
  success: boolean;
  provider: string;
}

export interface VerifyOtpResult {
  valid: boolean;
  message: string;
}

/**
 * OTP Service — Supports MSG91 and Twilio.
 * Stores session state in-memory (replace with Redis for multi-instance deployments).
 */

// In-memory OTP store — use Redis in production for horizontal scaling
const otpStore = new Map<string, { otp: string; phone: string; expiresAt: number }>();

function generateOtp(): string {
  // Cryptographically random 6-digit OTP
  return (crypto.randomInt(100000, 999999)).toString();
}

/**
 * Send OTP via MSG91
 */
async function sendViaMSG91(phone: string, otp: string): Promise<void> {
  if (!env.OTP_PROVIDER_API_KEY) {
    // Dev mode: just log the OTP
    console.log(`[DEV] OTP for ${phone}: ${otp}`);
    return;
  }

  await axios.post(
    'https://api.msg91.com/api/v5/otp',
    {
      template_id: env.OTP_TEMPLATE_ID,
      mobile: phone,
      otp,
    },
    {
      headers: {
        authkey: env.OTP_PROVIDER_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 10_000,
    }
  );
}

/**
 * Send OTP via Twilio
 */
async function sendViaTwilio(phone: string, otp: string): Promise<void> {
  if (!env.OTP_PROVIDER_API_KEY) {
    console.log(`[DEV] OTP for ${phone}: ${otp}`);
    return;
  }
  // Twilio Verify API
  const [accountSid, authToken] = env.OTP_PROVIDER_API_KEY.split(':');
  await axios.post(
    `https://verify.twilio.com/v2/Services/${env.OTP_TEMPLATE_ID}/Verifications`,
    new URLSearchParams({ To: phone, Channel: 'sms', CustomCode: otp }).toString(),
    {
      auth: { username: accountSid, password: authToken },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10_000,
    }
  );
}

/**
 * Send OTP to phone number. Returns a sessionId for subsequent verification.
 */
export async function sendOtp(phone: string): Promise<SendOtpResult> {
  const otp = generateOtp();
  const sessionId = crypto.randomUUID();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Store mapping (sessionId → { otp, phone, expiresAt })
  otpStore.set(sessionId, { otp, phone, expiresAt });

  // Clean up expired entries periodically
  if (otpStore.size > 1000) {
    const now = Date.now();
    for (const [key, val] of otpStore.entries()) {
      if (val.expiresAt < now) otpStore.delete(key);
    }
  }

  if (env.OTP_PROVIDER === 'TWILIO') {
    await sendViaTwilio(phone, otp);
  } else {
    await sendViaMSG91(phone, otp);
  }

  return { sessionId, success: true, provider: env.OTP_PROVIDER };
}

/**
 * Verify OTP by sessionId.
 */
export function verifyOtp(sessionId: string, phone: string, otp: string): VerifyOtpResult {
  const entry = otpStore.get(sessionId);

  if (!entry) {
    return { valid: false, message: 'Invalid or expired session' };
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(sessionId);
    return { valid: false, message: 'OTP has expired' };
  }

  if (entry.phone !== phone) {
    return { valid: false, message: 'Phone number mismatch' };
  }

  const isMatch = crypto.timingSafeEqual(
    Buffer.from(entry.otp),
    Buffer.from(otp)
  );

  if (!isMatch) {
    return { valid: false, message: 'Invalid OTP' };
  }

  // Consume OTP (single-use)
  otpStore.delete(sessionId);
  return { valid: true, message: 'OTP verified successfully' };
}
