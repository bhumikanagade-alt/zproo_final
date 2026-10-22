import { idempotencyKeySchema } from '@zproo/validation';
import type { Request, RequestHandler } from 'express';
import { ValidationError } from '../utils/errors';

/**
 * Requires an `Idempotency-Key` header (a client-generated UUID) on requests that create
 * bookings or payments, so a retried request (double click, flaky network) can't do it twice.
 */
export const requireIdempotencyKey: RequestHandler = (req, _res, next) => {
  const result = idempotencyKeySchema.safeParse(req.get('Idempotency-Key') ?? '');
  if (!result.success) {
    throw new ValidationError([
      {
        path: 'headers.idempotency-key',
        message: 'Send a unique Idempotency-Key header (e.g. a UUID)',
      },
    ]);
  }
  res(req).idempotencyKey = result.data;
  next();
};

const res = (req: Request) => req as Request & { idempotencyKey?: string };

export function idempotencyKey(req: Request): string {
  const key = res(req).idempotencyKey;
  if (!key) throw new Error('requireIdempotencyKey middleware missing');
  return key;
}
