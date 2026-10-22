import { addDays, flightSearchSchema, todayIso } from '@zproo/validation';
import { describe, expect, it } from 'vitest';
import { flightSearchInputFromParams as parseFlightSearch } from '@zproo/validation';
import { busesUrl, flightsUrl, hotelsUrl, trainsUrl } from './url';

const d = (n: number) => addDays(todayIso(), n);
const query = (url: string) => new URLSearchParams(url.split('?')[1]);

describe('flight search URLs', () => {
  it('round-trips a round trip through the URL', () => {
    const search = flightSearchSchema.parse({
      tripType: 'ROUND_TRIP',
      legs: [{ from: 'PNQ', to: 'DEL', date: d(7) }],
      returnDate: d(10),
      adults: 2,
      children: 1,
      cabin: 'BUSINESS',
    });
    const url = flightsUrl(search);
    expect(url).toBe(
      `/flights/results?trip=ROUND_TRIP&from=PNQ&to=DEL&date=${d(7)}&return=${d(10)}&adults=2&children=1&cabin=BUSINESS`,
    );
    expect(flightSearchSchema.parse(parseFlightSearch(query(url)))).toEqual(search);
  });

  it('encodes multi-city legs compactly', () => {
    const search = flightSearchSchema.parse({
      tripType: 'MULTI_CITY',
      legs: [
        { from: 'PNQ', to: 'DEL', date: d(5) },
        { from: 'DEL', to: 'GOI', date: d(8) },
      ],
      adults: 1,
    });
    const url = flightsUrl(search);
    expect(query(url).get('legs')).toBe(`PNQ.DEL.${d(5)},DEL.GOI.${d(8)}`);
    expect(flightSearchSchema.parse(parseFlightSearch(query(url)))).toEqual(search);
  });

  it('drops the return date for one-way trips', () => {
    const url = flightsUrl(
      flightSearchSchema.parse({
        tripType: 'ONE_WAY',
        legs: [{ from: 'BOM', to: 'GOI', date: d(3) }],
        returnDate: d(9),
        adults: 1,
      }),
    );
    expect(query(url).has('return')).toBe(false);
  });
});

describe('date-free deal links', () => {
  it('defaults the departure date when the link has none', () => {
    const parsed = flightSearchSchema.parse(
      parseFlightSearch(
        query('/flights/results?trip=ONE_WAY&from=PNQ&to=DEL&adults=1&cabin=ECONOMY'),
      ),
    );
    expect(parsed.legs[0]?.date).toBe(d(14));
  });
});

describe('other URLs', () => {
  it('omits defaults', () => {
    expect(busesUrl({ from: 'pune', to: 'mumbai', date: '2026-12-01' })).toBe(
      '/buses/results?from=pune&to=mumbai&date=2026-12-01',
    );
    expect(
      trainsUrl({ from: 'PUNE', to: 'NDLS', date: '2026-12-01', travelClass: 'ALL', quota: 'GN', passengers: 1 }),
    ).toBe('/trains/results?from=PUNE&to=NDLS&date=2026-12-01');
    expect(
      trainsUrl({ from: 'PUNE', to: 'NDLS', date: '2026-12-01', travelClass: '3A', quota: 'TQ', passengers: 2 }),
    ).toBe('/trains/results?from=PUNE&to=NDLS&date=2026-12-01&class=3A&quota=TQ&passengers=2');
    expect(
      hotelsUrl({
        city: 'goa',
        checkIn: '2026-12-01',
        checkOut: '2026-12-03',
        rooms: 1,
        adults: 2,
        children: 0,
      }),
    ).toBe('/hotels/results?city=goa&checkIn=2026-12-01&checkOut=2026-12-03&rooms=1&adults=2');
  });
});
