import { describe, expect, it } from 'vitest';
import { flightPriceBreakdown, offerTotal, quoteFare } from '../src/services/flightPricing';
import { isoWeekday, localDate, zonedTimeToUtc } from '../src/utils/time';

const base = {
  key: 'f1:2026-11-10',
  baseFarePaise: 390_000,
  cabin: 'ECONOMY' as const,
  daysAhead: 20,
  weekday: 2,
  international: false,
};

describe('time zones', () => {
  it('converts local schedule times to UTC', () => {
    expect(zonedTimeToUtc('2026-10-25', '08:25', 'Asia/Kolkata').toISOString()).toBe(
      '2026-10-25T02:55:00.000Z',
    );
    expect(zonedTimeToUtc('2026-10-25', '08:25', 'Asia/Dubai').toISOString()).toBe(
      '2026-10-25T04:25:00.000Z',
    );
    // London changes from BST (+1) to GMT on 25 Oct 2026.
    expect(zonedTimeToUtc('2026-10-24', '09:00', 'Europe/London').toISOString()).toBe(
      '2026-10-24T08:00:00.000Z',
    );
    expect(zonedTimeToUtc('2026-10-26', '09:00', 'Europe/London').toISOString()).toBe(
      '2026-10-26T09:00:00.000Z',
    );
  });

  it('reads local dates and weekdays', () => {
    expect(localDate(new Date('2026-10-25T20:00:00Z'), 'Asia/Kolkata')).toBe('2026-10-26');
    expect(isoWeekday('2026-10-25')).toBe(7);
    expect(isoWeekday('2026-10-26')).toBe(1);
  });
});

describe('quoteFare', () => {
  it('is deterministic and ends in 99', () => {
    const a = quoteFare(base);
    expect(quoteFare(base)).toEqual(a);
    expect(a.fares.ADULT.basePaise % 10_000).toBe(9_900);
    expect(a.fares.ADULT.totalPaise).toBe(a.fares.ADULT.basePaise + a.fares.ADULT.taxesPaise);
  });

  it('charges more close to departure and in premium cabins', () => {
    expect(quoteFare({ ...base, daysAhead: 1 }).fares.ADULT.basePaise).toBeGreaterThan(
      quoteFare(base).fares.ADULT.basePaise,
    );
    expect(quoteFare({ ...base, cabin: 'BUSINESS' }).fares.ADULT.basePaise).toBeGreaterThan(
      quoteFare(base).fares.ADULT.basePaise * 2.5,
    );
  });

  it('prices children below adults and infants at a flat fare', () => {
    const q = quoteFare(base);
    expect(q.fares.CHILD.basePaise).toBeLessThan(q.fares.ADULT.basePaise);
    // ₹300 fees + 5% GST on the ₹1,500 infant fare.
    expect(q.fares.INFANT).toEqual({ basePaise: 150_000, taxesPaise: 37_500, totalPaise: 187_500 });
  });

  it('includes GST and airport fees in taxes', () => {
    const q = quoteFare(base);
    expect(q.fares.ADULT.taxesPaise).toBe(
      Math.round((65_000 + q.fares.ADULT.basePaise * 0.05) / 100) * 100,
    );
  });
});

describe('price breakdown', () => {
  it('adds legs and passenger types with no hidden fees', () => {
    const q = quoteFare(base);
    const offer = { fares: q.fares } as never;
    const pax = { adults: 2, children: 1, infants: 1 };
    const breakdown = flightPriceBreakdown([offer, offer], pax);
    expect(breakdown.totalPaise).toBe(offerTotal(q.fares, pax) * 2);
    expect(breakdown.feesPaise).toBe(0);
    expect(breakdown.lines.map((l) => l.label)).toEqual([
      'Base fare — Adult × 2',
      'Base fare — Child × 1',
      'Base fare — Infant × 1',
      'Taxes & airport fees',
    ]);
  });
});
