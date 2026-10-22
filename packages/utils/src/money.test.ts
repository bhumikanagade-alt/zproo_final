import { describe, expect, it } from 'vitest';
import { formatMoney, fromMinorUnits, percentOf, toMinorUnits } from './money';

describe('money', () => {
  it('converts between major and minor units without float drift', () => {
    expect(toMinorUnits(0.1 + 0.2)).toBe(30);
    expect(toMinorUnits(5320)).toBe(532000);
    expect(fromMinorUnits(532050)).toBe(5320.5);
  });

  it('rejects non-integer minor units', () => {
    expect(() => fromMinorUnits(10.5)).toThrow(RangeError);
    expect(() => toMinorUnits(Number.NaN)).toThrow(RangeError);
  });

  it('formats INR with Indian digit grouping', () => {
    expect(formatMoney(532000)).toBe('₹5,320');
    expect(formatMoney(12345678900)).toBe('₹12,34,56,789');
    expect(formatMoney(532050)).toBe('₹5,320.50');
    expect(formatMoney(532000, 'INR', { showDecimals: 'always' })).toBe('₹5,320.00');
  });

  it('computes percentages in minor units', () => {
    expect(percentOf(485000, 18)).toBe(87300);
    expect(percentOf(999, 10)).toBe(100);
  });
});
