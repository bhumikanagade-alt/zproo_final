import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { toFailure } from '../src/middleware/errorHandler';
import { ConflictError, PaymentError, ProviderError } from '../src/utils/errors';

describe('toFailure', () => {
  it('passes AppError details through', () => {
    expect(toFailure(new ConflictError('Mobile number already registered'))).toEqual({
      status: 409,
      errorCode: 'CONFLICT',
      message: 'Mobile number already registered',
      details: undefined,
    });
    expect(toFailure(new PaymentError()).status).toBe(402);
    expect(toFailure(new ProviderError('Flight supplier timed out', 'amadeus')).status).toBe(502);
  });

  it('maps ZodError to VALIDATION_ERROR with field paths', () => {
    const result = z.object({ phone: z.string() }).safeParse({});
    expect(result.success).toBe(false);
    const failure = toFailure(result.error);
    expect(failure).toMatchObject({ status: 400, errorCode: 'VALIDATION_ERROR' });
    expect(failure.details?.[0]?.path).toBe('phone');
  });

  it('maps Prisma unique violations to 409 and missing records to 404', () => {
    const unique = new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002',
      clientVersion: 'x',
    });
    const missing = new Prisma.PrismaClientKnownRequestError('missing', {
      code: 'P2025',
      clientVersion: 'x',
    });
    expect(toFailure(unique)).toMatchObject({ status: 409, errorCode: 'CONFLICT' });
    expect(toFailure(missing)).toMatchObject({ status: 404, errorCode: 'NOT_FOUND' });
  });

  it('never leaks unknown error messages', () => {
    const failure = toFailure(new Error('connect ECONNREFUSED 10.0.0.5:5432 password=secret'));
    expect(failure).toEqual({
      status: 500,
      errorCode: 'INTERNAL_ERROR',
      message: 'Something went wrong',
    });
  });
});
