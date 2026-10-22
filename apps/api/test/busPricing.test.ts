import { describe, expect, it } from 'vitest';
import { busSeatFare } from '../src/services/busPricing';

// 2026-10-07 is a Wednesday, 2026-10-09 a Friday.
const base = { baseFarePaise: 45_000, seatFarePercent: 100, today: '2026-09-26', ac: true };

describe('busSeatFare', () => {
  it('adds 5% GST on A/C seats and none on non-A/C', () => {
    expect(busSeatFare({ ...base, date: '2026-10-07' })).toEqual({
      basePaise: 45_000,
      taxPaise: 2_300,
      pricePaise: 47_300,
    });
    expect(busSeatFare({ ...base, date: '2026-10-07', ac: false })).toEqual({
      basePaise: 45_000,
      taxPaise: 0,
      pricePaise: 45_000,
    });
  });

  it('charges more at weekends and at the last minute, less when booked early', () => {
    const midweek = busSeatFare({ ...base, date: '2026-10-07' }).basePaise;
    expect(busSeatFare({ ...base, date: '2026-10-09' }).basePaise).toBeGreaterThan(midweek);
    expect(
      busSeatFare({ ...base, date: '2026-09-27', today: '2026-09-26' }).basePaise,
    ).toBeGreaterThan(busSeatFare({ ...base, date: '2026-09-30', today: '2026-09-26' }).basePaise);
    expect(busSeatFare({ ...base, date: '2026-10-21' }).basePaise).toBeLessThan(midweek);
  });

  it('applies the seat premium and always prices in whole rupees (base in ₹10 steps)', () => {
    const lower = busSeatFare({ ...base, date: '2026-10-07', seatFarePercent: 110 });
    expect(lower.basePaise).toBe(50_000); // ₹495 rounds to ₹500
    for (const pct of [100, 105, 108, 110, 112]) {
      const fare = busSeatFare({ ...base, date: '2026-10-09', seatFarePercent: pct });
      expect(fare.basePaise % 1000).toBe(0);
      expect(fare.taxPaise % 100).toBe(0);
    }
  });
});
