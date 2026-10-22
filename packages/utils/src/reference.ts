/** Crockford base32 without I, L, O, U — unambiguous when read aloud or typed. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const REFERENCE_PATTERN = /^ZP-(\d{4})-([0-9A-HJKMNP-TV-Z]{6})$/;

function randomCode(length: number): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let out = '';
  // 256 is a multiple of 32, so `byte % 32` is unbiased.
  for (const byte of bytes) out += ALPHABET[byte % 32];
  return out;
}

/**
 * Generates a booking reference such as `ZP-2026-7K3QX9`. Uniqueness is guaranteed by a
 * unique index in the database; callers retry on collision.
 */
export function generateBookingReference(date: Date = new Date()): string {
  return `ZP-${date.getUTCFullYear()}-${randomCode(6)}`;
}

export function isBookingReference(value: string): boolean {
  return REFERENCE_PATTERN.test(value);
}

/** Normalises user input (lower case, spaces, O→0, I/L→1) before lookup. */
export function normalizeBookingReference(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/(?<=^ZP-\d{4}-.*)[O]/g, '0')
    .replace(/(?<=^ZP-\d{4}-.*)[IL]/g, '1');
}
