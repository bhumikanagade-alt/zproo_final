import { describe, expect, it } from 'vitest';
import {
  generateBookingReference,
  isBookingReference,
  normalizeBookingReference,
} from './reference';

describe('booking reference', () => {
  it('generates ZP-YYYY-XXXXXX references', () => {
    const ref = generateBookingReference(new Date('2026-10-25T08:25:00Z'));
    expect(ref).toMatch(/^ZP-2026-[0-9A-Z]{6}$/);
    expect(isBookingReference(ref)).toBe(true);
  });

  it('never uses ambiguous characters', () => {
    for (let i = 0; i < 500; i++) {
      expect(generateBookingReference().slice(8)).not.toMatch(/[ILOU]/);
    }
  });

  it('validates format', () => {
    expect(isBookingReference('ZP-2026-7K3QX9')).toBe(true);
    expect(isBookingReference('ZP-2026-7K3QXO')).toBe(false);
    expect(isBookingReference('ZP78456231')).toBe(false);
  });

  it('normalises user input', () => {
    expect(normalizeBookingReference(' zp-2026-7k3qxo ')).toBe('ZP-2026-7K3QX0');
    expect(normalizeBookingReference('ZP-2026-L1ABCD')).toBe('ZP-2026-11ABCD');
  });
});
