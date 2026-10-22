import { describe, expect, it } from 'vitest';
import { applyBusFilters, busFacets, EMPTY_BUS_FILTERS, sortBuses } from './filters';
import { TRIPS } from './test/fixtures';

const codes = (list: { operator: { code: string } }[]) => list.map((t) => t.operator.code);

describe('bus filters', () => {
  it('treats A/C and Non A/C as alternatives and other kinds as narrowing', () => {
    expect(codes(applyBusFilters(TRIPS, { ...EMPTY_BUS_FILTERS, kinds: ['AC'] }))).toEqual([
      'SSK',
      'ECO',
    ]);
    expect(
      codes(applyBusFilters(TRIPS, { ...EMPTY_BUS_FILTERS, kinds: ['AC', 'NON_AC'] })),
    ).toHaveLength(3);
    expect(
      codes(applyBusFilters(TRIPS, { ...EMPTY_BUS_FILTERS, kinds: ['AC', 'SEATER'] })),
    ).toEqual(['ECO']);
    expect(codes(applyBusFilters(TRIPS, { ...EMPTY_BUS_FILTERS, kinds: ['SLEEPER'] }))).toEqual([
      'SSK',
    ]);
    expect(codes(applyBusFilters(TRIPS, { ...EMPTY_BUS_FILTERS, kinds: ['ELECTRIC'] }))).toEqual([
      'ECO',
    ]);
  });

  it('filters by departure time (IST), operator, price and rating', () => {
    expect(codes(applyBusFilters(TRIPS, { ...EMPTY_BUS_FILTERS, departure: ['NIGHT'] }))).toEqual([
      'SSK',
    ]);
    expect(codes(applyBusFilters(TRIPS, { ...EMPTY_BUS_FILTERS, departure: ['MORNING'] }))).toEqual(
      ['PPR', 'ECO'],
    );
    expect(codes(applyBusFilters(TRIPS, { ...EMPTY_BUS_FILTERS, operators: ['PPR'] }))).toEqual([
      'PPR',
    ]);
    expect(codes(applyBusFilters(TRIPS, { ...EMPTY_BUS_FILTERS, maxPricePaise: 40_000 }))).toEqual([
      'PPR',
      'ECO',
    ]);
    expect(codes(applyBusFilters(TRIPS, { ...EMPTY_BUS_FILTERS, minRating: 4.5 }))).toEqual([
      'SSK',
      'ECO',
    ]);
  });

  it('filters by boarding and dropping point names', () => {
    expect(
      applyBusFilters(TRIPS, { ...EMPTY_BUS_FILTERS, boardingPoints: ['Wakad'] }),
    ).toHaveLength(3);
    expect(
      applyBusFilters(TRIPS, { ...EMPTY_BUS_FILTERS, boardingPoints: ['Katraj'] }),
    ).toHaveLength(0);
  });
});

describe('bus sorting and facets', () => {
  it('sorts by departure, price, rating, duration and seats', () => {
    expect(codes(sortBuses(TRIPS, 'DEPARTURE'))).toEqual(['PPR', 'ECO', 'SSK']);
    expect(codes(sortBuses(TRIPS, 'PRICE'))).toEqual(['PPR', 'ECO', 'SSK']);
    expect(codes(sortBuses(TRIPS, 'RATING'))).toEqual(['ECO', 'SSK', 'PPR']);
    expect(codes(sortBuses(TRIPS, 'DURATION'))[0]).toBe('ECO');
    expect(codes(sortBuses(TRIPS, 'SEATS'))).toEqual(['ECO', 'SSK', 'PPR']);
  });

  it('builds filter options from results', () => {
    const f = busFacets(TRIPS);
    expect(f).toMatchObject({ minPricePaise: 26_000, maxPricePaise: 47_300 });
    expect(f.kinds).toEqual(['AC', 'NON_AC', 'SLEEPER', 'SEATER', 'ELECTRIC']);
    expect(f.operators.map((o) => o.code)).toEqual(['ECO', 'SSK', 'PPR']);
    expect(f.boardingPoints).toEqual(['Swargate', 'Wakad']);
  });
});
