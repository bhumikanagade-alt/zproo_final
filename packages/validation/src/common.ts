import { z } from 'zod';

/**
 * Shared primitives used by both web forms and API validators, so a value accepted by the
 * browser is always accepted by the server (and vice versa).
 */

/** Indian mobile number. Accepts `9876543210`, `+91 98765 43210`, `09876543210`; outputs `+919876543210`. */
export const indianMobileSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, ''))
  .transform((value) => value.replace(/^(\+91|91|0)(?=\d{10}$)/, ''))
  .refine((value) => /^[6-9]\d{9}$/.test(value), {
    message: 'Enter a valid 10-digit mobile number',
  })
  .transform((value) => `+91${value}`);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: 'Enter a valid email address' }))
  .refine((value) => value.length <= 254, { message: 'Email is too long' });

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
    message: 'Password must contain letters and numbers',
  });

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code');

export const personNameSchema = z
  .string()
  .trim()
  .min(2, 'Name is too short')
  .max(80, 'Name is too long')
  .regex(/^[\p{L}\p{M}' .-]+$/u, 'Name contains invalid characters')
  .refine((value) => (value.match(/\p{L}/gu) ?? []).length >= 2, { message: 'Name must contain at least 2 letters' });

export const idSchema = z.string().trim().min(1).max(64);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** `Idempotency-Key` header: client-generated UUID or similar opaque token. */
export const idempotencyKeySchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{16,128}$/, 'Invalid Idempotency-Key');

/** ISO calendar date `YYYY-MM-DD`. */
export const isoDateSchema = z.iso.date({ message: 'Use YYYY-MM-DD' });
