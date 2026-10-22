import { describe, expect, it } from 'vitest';
import {
  activeFilterCount,
  applyFilters,
  baselineFilters,
  EMPTY_FILTERS,
  facets,
  SORTS,
  sortOffers,
} from './filters';
import { dayShift, duration, localTime, travellersLabel } from './format';
import { OFFERS, makeOffer } from './test/fixtures';

const ids = (list: { id: string }[]) => list.map((o) => o.id.split('_')[1]);

describe('flight filters', () => {
  it('passes everything with no filters', () => {
    expect(applyFilters(OFFERS, EMPTY_FILTERS)).toHaveLength(3);
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
  });

  it('filters by stops, airline, price and refundability', () => {
    expect(ids(applyFilters(OFFERS, { ...EMPTY_FILTERS, stops: [0] }))).toEqual(['f1', 'f2']);
    expect(ids(applyFilters(OFFERS, { ...EMPTY_FILTERS, airlines: ['DB'] }))).toEqual(['f3']);
    expect(ids(applyFilters(OFFERS, { ...EMPTY_FILTERS, maxPricePaise: 480_000 }))).toEqual([
      'f1',
      'f3',
    ]);
    expect(ids(applyFilters(OFFERS, { ...EMPTY_FILTERS, refundableOnly: true }))).toEqual(['f2']);
    expect(ids(applyFilters(OFFERS, { ...EMPTY_FILTERS, nonRefundableOnly: true }))).toEqual(['f1', 'f3']);
  });

  it('filters by local departure and arrival time bands', () => {
    // f1 departs 06:30 IST, f2 18:00, f3 09:30
    expect(ids(applyFilters(OFFERS, { ...EMPTY_FILTERS, departure: ['MORNING'] }))).toEqual([
      'f1',
      'f3',
    ]);
    expect(ids(applyFilters(OFFERS, { ...EMPTY_FILTERS, departure: ['NIGHT'] }))).toEqual(['f2']);
    // f3 lands 14:30 IST
    expect(ids(applyFilters(OFFERS, { ...EMPTY_FILTERS, arrival: ['AFTERNOON'] }))).toEqual(['f3']);
  });

  it('treats 2+ stops as one bucket', () => {
    const twoStop = makeOffer({ id: 'mk_f9_20261025_E', stops: 3 });
    expect(applyFilters([twoStop], { ...EMPTY_FILTERS, stops: [2] })).toHaveLength(1);
  });
});

describe('flight sorting', () => {
  it('sorts by price, duration, departure and arrival', () => {
    expect(ids(sortOffers(OFFERS, 'PRICE'))).toEqual(['f3', 'f1', 'f2']);
    expect(ids(sortOffers(OFFERS, 'DURATION'))).toEqual(['f2', 'f1', 'f3']);
    expect(ids(sortOffers(OFFERS, 'DEPARTURE'))).toEqual(['f1', 'f3', 'f2']);
    expect(ids(sortOffers(OFFERS, 'ARRIVAL'))).toEqual(['f1', 'f3', 'f2']);
  });

  it('"best" prefers a fast non-stop over a slightly cheaper long connection', () => {
    expect(ids(sortOffers(OFFERS, 'BEST'))[0]).toBe('f1');
  });

  it('does not mutate the input', () => {
    const copy = [...OFFERS];
    sortOffers(OFFERS, 'PRICE');
    expect(OFFERS).toEqual(copy);
  });
});

describe('filter facets', () => {
  it('lists airlines and stop buckets with their lowest price', () => {
    const f = facets(OFFERS);
    expect(f).toMatchObject({ minPricePaise: 430_000, maxPricePaise: 620_000 });
    expect(f.airlines.map((a) => [a.code, a.fromPaise])).toEqual([
      ['DB', 430_000],
      ['SF', 480_000],
      ['MN', 620_000],
    ]);
    expect(f.stops).toEqual([
      { stops: 0, count: 2, fromPaise: 480_000 },
      { stops: 1, count: 1, fromPaise: 430_000 },
    ]);
  });

  it('handles no offers', () => {
    expect(facets([])).toMatchObject({ minPricePaise: 0, maxPricePaise: 0, airlines: [] });
  });
});

describe('flight formatting', () => {
  it('shows times in the airport time zone', () => {
    expect(localTime('2026-10-25T01:00:00.000Z', 'Asia/Kolkata')).toBe('06:30');
    expect(localTime('2026-10-25T01:00:00.000Z', 'Asia/Dubai')).toBe('05:00');
  });

  it('counts arrival days in local time', () => {
    expect(
      dayShift('2026-10-25T17:00:00Z', 'Asia/Kolkata', '2026-10-25T19:00:00Z', 'Asia/Kolkata'),
    ).toBe(1);
    expect(
      dayShift('2026-10-25T01:00:00Z', 'Asia/Kolkata', '2026-10-25T03:00:00Z', 'Asia/Kolkata'),
    ).toBe(0);
  });

  it('formats durations and traveller counts', () => {
    expect(duration(135)).toBe('2h 15m');
    expect(duration(120)).toBe('2h');
    expect(duration(45)).toBe('45m');
    expect(travellersLabel({ adults: 2, children: 1, infants: 0 })).toBe('2 adults, 1 child');
  });
});

describe('duration, airport and baggage filters', () => {
  const light = makeOffer({
    id: 'mk_f7_20261025_E',
    baggage: { cabinKg: 7, checkInKg: 0 },
    from: { ...makeOffer().from, code: 'NMI', city: 'Navi Mumbai' },
  });
  const heavy = makeOffer({
    id: 'mk_f8_20261025_E',
    durationMinutes: 400,
    baggage: { cabinKg: 12, checkInKg: 30 },
  });
  const list = [light, heavy];

  it('limits journey duration', () => {
    expect(applyFilters(list, { ...EMPTY_FILTERS, maxDurationMinutes: 200 })).toEqual([light]);
    expect(activeFilterCount({ ...EMPTY_FILTERS, maxDurationMinutes: 200 })).toBe(1);
  });

  it('filters by departure and arrival airport', () => {
    expect(applyFilters(list, { ...EMPTY_FILTERS, departureAirports: ['NMI'] })).toEqual([light]);
    expect(applyFilters(list, { ...EMPTY_FILTERS, arrivalAirports: ['BLR'] })).toEqual([]);
  });

  it('filters by the cabin and checked baggage the fares really include', () => {
    expect(applyFilters(list, { ...EMPTY_FILTERS, cabinBag: [12] })).toEqual([heavy]);
    expect(applyFilters(list, { ...EMPTY_FILTERS, checkedBag: [0] })).toEqual([light]);
    expect(applyFilters(list, { ...EMPTY_FILTERS, checkedBag: [] })).toEqual([]);
  });

  it('reports the airports, durations and baggage of the results', () => {
    expect(facets(list)).toMatchObject({
      departureAirports: [
        { code: 'NMI', count: 1 },
        { code: 'PNQ', count: 1 },
      ],
      cabinBagKgs: [7, 12],
      checkedBagKgs: [0, 30],
      minDurationMinutes: 140,
      maxDurationMinutes: 400,
    });
  });

  it('starts from the baggage asked for in the search', () => {
    const f = facets(list);
    expect(baselineFilters(f, {})).toEqual(EMPTY_FILTERS);
    expect(baselineFilters(f, { cabinBagKg: 0, checkedBagKg: 0 })).toEqual(EMPTY_FILTERS);
    const wanted = baselineFilters(f, { cabinBagKg: 10, checkedBagKg: 15 });
    expect(wanted).toMatchObject({ cabinBag: [12], checkedBag: [30] });
    expect(applyFilters(list, wanted)).toEqual([heavy]);
    // Only the 30 Kg checked fare qualifies.
    expect(applyFilters(list, baselineFilters(f, { checkedBagKg: 30 }))).toEqual([heavy]);
  });
});

describe('sort options', () => {
  it('offers the five sorts and orders by latest departure', () => {
    expect(SORTS.map((s) => s.label)).toEqual([
      'Recommended',
      'Cheapest',
      'Fastest',
      'Earliest Departure',
      'Latest Departure',
    ]);
    expect(ids(sortOffers(OFFERS, 'LATE_DEPARTURE'))).toEqual(['f2', 'f3', 'f1']);
  });
});
