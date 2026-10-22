import { describe, expect, it } from 'vitest';
import {
  emailSchema,
  indianMobileSchema,
  otpCodeSchema,
  paginationQuerySchema,
  passwordSchema,
} from './common';

describe('indianMobileSchema', () => {
  it.each(['9876543210', '+91 98765 43210', '09876543210', '91-98765-43210'])(
    'normalises %s',
    (input) => {
      expect(indianMobileSchema.parse(input)).toBe('+919876543210');
    },
  );

  it.each(['12345', '5876543210', '98765432101', 'abcdefghij'])('rejects %s', (input) => {
    expect(indianMobileSchema.safeParse(input).success).toBe(false);
  });
});

describe('emailSchema', () => {
  it('lower-cases and trims', () => {
    expect(emailSchema.parse('  Amit@Gmail.COM ')).toBe('amit@gmail.com');
  });
  it('rejects invalid email', () => {
    expect(emailSchema.safeParse('amit@').success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('requires letters and numbers', () => {
    expect(passwordSchema.safeParse('password').success).toBe(false);
    expect(passwordSchema.safeParse('passw0rd').success).toBe(true);
  });
});

describe('otpCodeSchema', () => {
  it('accepts exactly six digits', () => {
    expect(otpCodeSchema.safeParse('123456').success).toBe(true);
    expect(otpCodeSchema.safeParse('12345').success).toBe(false);
  });
});

describe('paginationQuerySchema', () => {
  it('coerces and applies defaults and bounds', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(paginationQuerySchema.parse({ page: '3', limit: '50' })).toEqual({ page: 3, limit: 50 });
    expect(paginationQuerySchema.safeParse({ limit: '500' }).success).toBe(false);
  });
});
