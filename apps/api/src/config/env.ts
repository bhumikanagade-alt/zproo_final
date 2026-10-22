import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const postgresUrl = z
  .string()
  .regex(/^postgres(ql)?:\/\//, 'must be a postgres:// or postgresql:// connection string');

const envSchema = z
  .object({
    // No default: a server started without NODE_ENV must not silently run as "development" (demo accounts, shown one-time codes).
    NODE_ENV: z.enum(['development', 'test', 'production'], { error: 'must be set to development, test or production' }),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    APP_VERSION: z.string().default('0.1.0'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),

    DATABASE_URL: postgresUrl,
    DIRECT_DATABASE_URL: postgresUrl.optional(),
    REDIS_URL: z.string().regex(/^rediss?:\/\//, 'must be a redis:// or rediss:// URL'),

    FRONTEND_URL: z.url().default('http://localhost:5173'),
    /** Comma-separated list of allowed browser origins. Defaults to FRONTEND_URL. */
    CORS_ORIGINS: z.string().optional(),
    /** Number of reverse proxies in front of the API (for correct client IPs). */
    TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    ENABLE_API_DOCS: booleanString.optional(),

    // Authentication. Secrets are required in production; development generates throwaway ones.
    JWT_SECRET: z.string().min(32, 'must be at least 32 characters').optional(),
    JWT_REFRESH_SECRET: z.string().min(32, 'must be at least 32 characters').optional(),
    JWT_ACCESS_TTL: z
      .string()
      .regex(/^\d+[smh]$/, 'use a number followed by s, m or h, e.g. 15m')
      .default('15m'),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    COOKIE_DOMAIN: z.string().optional(),
    GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
    APPLE_CLIENT_ID: z.string().optional(),
    SMS_PROVIDER: z.enum(['console']).default('console'),
    FLIGHT_PROVIDER: z.enum(['mock']).default('mock'),
    BUS_PROVIDER: z.enum(['mock']).default('mock'),
    /** Railway reservations. `mock` = development provider (invented trains, demo PNRs). */
    TRAIN_PROVIDER: z.enum(['mock']).default('mock'),
    /** Per-call timeout for the railway provider. */
    TRAIN_PROVIDER_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(15_000),
    /** Extra attempts for read-only railway calls (search, availability, status). */
    TRAIN_PROVIDER_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
    /** Platform fee per train booking in paise (0 = none). Added to the server-calculated total. */
    TRAIN_SERVICE_FEE_PAISE: z.coerce.number().int().min(0).max(100_000).default(0),
    PAYMENT_PROVIDER: z.enum(['mock']).default('mock'),
    /** Minutes seats stay held for an unpaid booking. */
    BOOKING_HOLD_MINUTES: z.coerce.number().int().min(5).max(60).default(15),
    /** Optional path to the logo PNG used in PDFs (defaults to the web app's brand asset). */
    BRAND_LOGO_PATH: z.string().optional(),
    EMAIL_PROVIDER: z.enum(['console']).default('console'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET'] as const) {
      if (!env[key])
        ctx.addIssue({ code: 'custom', path: [key], message: 'is required in production' });
    }
    // Console providers print one-time codes; they must never run in production.
    if (env.SMS_PROVIDER === 'console') {
      ctx.addIssue({
        code: 'custom',
        path: ['SMS_PROVIDER'],
        message: 'console provider is not allowed in production',
      });
    }
    // Mock suppliers would sell invented flights, buses and trains; a mock payment provider would confirm unpaid bookings.
    for (const key of ['FLIGHT_PROVIDER', 'BUS_PROVIDER', 'TRAIN_PROVIDER', 'PAYMENT_PROVIDER'] as const) {
      if (env[key] === 'mock') {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: 'mock provider is not allowed in production',
        });
      }
    }
    if (env.EMAIL_PROVIDER === 'console') {
      ctx.addIssue({
        code: 'custom',
        path: ['EMAIL_PROVIDER'],
        message: 'console provider is not allowed in production',
      });
    }
    if (env.JWT_SECRET && env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_SECRET'],
        message: 'must differ from JWT_SECRET',
      });
    }
  })
  .transform((env) => ({
    ...env,
    // Outside production, missing secrets are replaced with random ones (sessions reset on restart).
    ephemeralSecrets: !env.JWT_SECRET || !env.JWT_REFRESH_SECRET,
    JWT_SECRET: env.JWT_SECRET ?? randomBytes(48).toString('base64url'),
    JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET ?? randomBytes(48).toString('base64url'),
    accessTokenTtlSeconds: durationToSeconds(env.JWT_ACCESS_TTL),
    corsOrigins: (env.CORS_ORIGINS ?? env.FRONTEND_URL)
      .split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean),
    apiDocsEnabled: env.ENABLE_API_DOCS ?? env.NODE_ENV !== 'production',
    isProduction: env.NODE_ENV === 'production',
  }));

export type Env = z.infer<typeof envSchema>;

function durationToSeconds(value: string): number {
  const amount = Number(value.slice(0, -1));
  const unit = value.slice(-1);
  return amount * (unit === 'h' ? 3600 : unit === 'm' ? 60 : 1);
}

/**
 * Validates environment variables. The error lists variable names and problems only —
 * never values, which may be secrets.
 */
export function parseEnv(source: NodeJS.ProcessEnv): Env {
  // `KEY=` in a .env file means "not set", not an empty value.
  const defined = Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ''));
  const result = envSchema.safeParse(defined);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return result.data;
}

/** Loads `.env` from the API directory or the monorepo root (first match wins per key). */
export function loadEnvFiles(cwd: string = process.cwd()): void {
  if (process.env.NODE_ENV === 'test') return;
  loadDotenv({ path: [path.resolve(cwd, '.env'), path.resolve(cwd, '../../.env')], quiet: true });
}
