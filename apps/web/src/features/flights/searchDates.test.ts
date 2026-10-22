import { addDays, todayIso, type FlightSearch } from '@zproo/validation';
import { describe, expect, it } from 'vitest';
import { legDateBounds, legSpecs, stripDates, withLegDate } from './searchDates';

const today = todayIso();
const base = {
  adults: 1,
  children: 0,
  infants: 0,
  cabin: 'ECONOMY',
} as const;
const leg = (from: string, to: string, days: number) => ({ from, to, date: addDays(today, days) });

const roundTrip: FlightSearch = {
  ...base,
  tripType: 'ROUND_TRIP',
  legs: [leg('PNQ', 'DEL', 10)],
  returnDate: addDays(today, 14),
};
const multi: FlightSearch = {
  ...base,
  tripType: 'MULTI_CITY',
  legs: [leg('PNQ', 'DEL', 10), leg('DEL', 'GOI', 15), leg('GOI', 'PNQ', 20)],
};

describe('date strip helpers', () => {
  it('treats a round trip as an outbound and a return flight', () => {
    expect(legSpecs(roundTrip)).toEqual([
      leg('PNQ', 'DEL', 10),
      { from: 'DEL', to: 'PNQ', date: addDays(today, 14) },
    ]);
  });

  it('keeps flights in date order', () => {
    expect(legDateBounds(multi, 1)).toEqual({ min: addDays(today, 10), max: addDays(today, 20) });
    expect(legDateBounds(roundTrip, 1).min).toBe(addDays(today, 10));
    expect(legDateBounds(roundTrip, 0).min).toBe(today);
  });

  it('moves the return along when the outbound passes it', () => {
    const moved = withLegDate(roundTrip, 0, addDays(today, 20));
    expect(moved.legs[0]?.date).toBe(addDays(today, 20));
    expect(moved.returnDate).toBe(addDays(today, 20));
    expect(withLegDate(roundTrip, 1, addDays(today, 18)).returnDate).toBe(addDays(today, 18));
    expect(withLegDate(multi, 1, addDays(today, 17)).legs.map((l) => l.date)[1]).toBe(
      addDays(today, 17),
    );
  });

  it('centres seven dates on the chosen day without leaving the allowed range', () => {
    expect(stripDates('2026-10-25', '2026-10-01', '2027-10-01')).toEqual([
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
    ]);
    expect(stripDates('2026-10-02', '2026-10-02', '2027-10-01')[0]).toBe('2026-10-02');
    expect(stripDates('2026-10-25', '2026-10-24', '2026-10-26')).toHaveLength(3);
  });
});
