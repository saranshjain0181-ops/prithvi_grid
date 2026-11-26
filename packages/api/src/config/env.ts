import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),
  MONGODB_URI: z.string().url('MONGODB_URI must be a valid URI'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid URI').default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  OTP_PROVIDER: z.enum(['MSG91', 'TWILIO']).default('MSG91'),
  OTP_PROVIDER_API_KEY: z.string().optional(),
  OTP_TEMPLATE_ID: z.string().optional(),
  WHATSAPP_API_KEY: z.string().optional(),
  WHATSAPP_SENDER: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  CLOUDFLARE_R2_BUCKET: z.string().optional(),
  CLOUDFLARE_R2_ACCESS_KEY: z.string().optional(),
  CLOUDFLARE_R2_SECRET_KEY: z.string().optional(),
  CLOUDFLARE_R2_ENDPOINT: z.string().optional(),
  ALLOWED_HARDWARE_IPS: z.string().default('127.0.0.1,::1'),
  RATE_LIMIT_MAX: z.string().default('100').transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
