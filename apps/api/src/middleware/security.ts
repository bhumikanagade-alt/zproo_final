import cors from 'cors';
import helmet from 'helmet';
import type { RequestHandler } from 'express';
import type { Env } from '../config/env';

export function securityHeaders(): RequestHandler {
  return helmet({
    // The API serves JSON only; the docs route relaxes CSP for Swagger UI separately.
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    crossOriginResourcePolicy: { policy: 'same-site' },
  });
}

export function corsPolicy(env: Pick<Env, 'corsOrigins'>): RequestHandler {
  const allowed = new Set(env.corsOrigins);
  return cors({
    origin(origin, callback) {
      // Non-browser clients (no Origin header) are allowed; browsers only from the allowlist.
      callback(null, !origin || allowed.has(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
    maxAge: 600,
  });
}
