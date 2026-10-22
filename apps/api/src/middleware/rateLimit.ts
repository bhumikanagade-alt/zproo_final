import { ipKeyGenerator, rateLimit, type Store } from 'express-rate-limit';
import type { Request } from 'express';
import type { Env } from '../config/env';
import { RateLimitError } from '../utils/errors';

/** Creates a store for one limiter (Redis in running servers, in-memory when undefined). */
export type RateLimitStoreFactory = (prefix: string) => Store | undefined;

interface LimiterOptions {
  name: string;
  windowMs: number;
  limit: number;
  message: string;
  key?: (req: Request) => string | undefined;
  skip?: (req: Request) => boolean;
}

function limiter(storeFactory: RateLimitStoreFactory, options: LimiterOptions) {
  const store = storeFactory(`rl:${options.name}:`);
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    ...(store && { store }),
    // If Redis is unreachable, let requests through rather than taking the API down.
    // OTP guessing stays capped by the per-code attempt limit stored in PostgreSQL.
    passOnStoreError: true,
    ...(options.skip && { skip: options.skip }),
    ...(options.key && {
      // Fall back to the client IP when the request carries no key (validation will reject it anyway).
      keyGenerator: (req: Request) => options.key?.(req) ?? ipKeyGenerator(req.ip ?? ''),
    }),
    handler: (_req, _res, next) => next(new RateLimitError(options.message)),
  });
}

/** Global per-IP limiter for the whole API. */
export function apiRateLimiter(
  env: Pick<Env, 'RATE_LIMIT_WINDOW_MS' | 'RATE_LIMIT_MAX'>,
  storeFactory: RateLimitStoreFactory,
) {
  return limiter(storeFactory, {
    name: 'api',
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX,
    message: 'Too many requests, please try again later',
    skip: (req) => req.path.startsWith('/health'),
  });
}

/**
 * Staff actions that change things (refunds, roles, wallet, settings, catalogue) or export data are
 * throttled per signed-in user, far below the general API limit, so one stolen staff login cannot
 * do damage at machine speed.
 */
export function adminWriteRateLimiter(storeFactory: RateLimitStoreFactory) {
  return limiter(storeFactory, {
    name: 'admin-write',
    windowMs: 60_000,
    limit: 30,
    message: 'Too many admin changes in a short time. Please slow down and try again in a minute.',
    skip: (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS',
    key: (req) => (req.auth?.userId ? `u:${req.auth.userId}` : undefined),
  });
}

function bodyKey(req: Request, field: 'phone' | 'identifier'): string | undefined {
  const body = req.validated?.body as Record<string, unknown> | undefined;
  const value = body?.[field];
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'value' in value) return String(value.value);
  return undefined;
}

/**
 * Authentication limits. Per-target limits protect each phone/email/account whatever IP the
 * attacker uses; the per-IP limit is generous because many Indian mobile users share IPs (CGNAT).
 */
export function authRateLimiters(storeFactory: RateLimitStoreFactory) {
  const otpKey = (req: Request) => bodyKey(req, 'phone') ?? bodyKey(req, 'identifier');
  return {
    perIp: limiter(storeFactory, {
      name: 'auth-ip',
      windowMs: 10 * 60_000,
      limit: 60,
      message: 'Too many attempts from your network. Please try again in a few minutes.',
      skip: (req) => req.path === '/refresh' || req.path === '/logout',
    }),
    // Per flow (sign-in vs password reset), so one does not block the other.
    otpCooldown: limiter(storeFactory, {
      name: 'otp-cooldown',
      windowMs: 60_000,
      limit: 1,
      message: 'Please wait a minute before requesting another code.',
      key: (req) => {
        const target = otpKey(req);
        return target && `${req.path}:${target}`;
      },
    }),
    // Shared across flows: caps SMS/email volume to any one number or address.
    otpHourly: limiter(storeFactory, {
      name: 'otp-hourly',
      windowMs: 60 * 60_000,
      limit: 5,
      message: 'Too many codes requested. Please try again in an hour.',
      key: otpKey,
    }),
    otpVerify: limiter(storeFactory, {
      name: 'otp-verify',
      windowMs: 15 * 60_000,
      limit: 20,
      message: 'Too many attempts. Please try again later.',
      key: otpKey,
    }),
    login: limiter(storeFactory, {
      name: 'login',
      windowMs: 15 * 60_000,
      limit: 10,
      message: 'Too many sign-in attempts. Please try again in 15 minutes or reset your password.',
      key: (req) => bodyKey(req, 'identifier'),
    }),
  };
}
