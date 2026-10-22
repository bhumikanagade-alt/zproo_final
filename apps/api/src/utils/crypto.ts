import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/** URL-safe random token with `bytes` bytes of entropy. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Uniformly random numeric code, zero-padded (e.g. OTPs). */
export function randomDigits(length: number): string {
  return String(randomInt(0, 10 ** length)).padStart(length, '0');
}

/** Keyed hash for secrets we must look up or compare but never store in plain text. */
export function hmacSha256(key: string, value: string): string {
  return createHmac('sha256', key).update(value).digest('hex');
}

/** Constant-time comparison of two hex digests. */
export function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}
