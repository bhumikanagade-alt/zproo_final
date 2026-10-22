import type { FlightOffer } from '@zproo/types';
import { describe, expect, it } from 'vitest';
import {
  addOnsTotals,
  buildSeatMap,
  flightSectors,
  validateAddOns,
} from './flightAddons';
import { flightPriceBreakdown } from './flightPrice';

const airport = (code: string) => ({
  code,
  city: code,
  name: code,
  country: 'IN',
  timezone: 'Asia/Kolkata',
});
const fare = { basePaise: 400_000, taxesPaise: 80_000, totalPaise: 480_000 };

const offer = {
  id: 'mk_f1_20271001_E',
  provider: 'mock',
  airline: { code: '6E', name: 'IndiGo' },
  flightNumber: '6E 101',
  from: airport('DEL'),
  to: airport('BOM'),
  departureAt: '2027-10-01T01:00:00Z',
  arrivalAt: '2027-10-01T03:00:00Z',
  durationMinutes: 120,
  stops: 0,
  segments: [
    {
      airline: { code: '6E', name: 'IndiGo' },
      flightNumber: '6E 101',
      from: airport('DEL'),
      to: airport('BOM'),
      departureAt: '2027-10-01T01:00:00Z',
      arrivalAt: '2027-10-01T03:00:00Z',
      durationMinutes: 120,
      aircraft: 'A320',
    },
  ],
  layovers: [],
  cabin: 'ECONOMY',
  fareFamily: 'Saver',
  refundable: false,
  cancellationFeePaise: null,
  baggage: { cabinKg: 7, checkInKg: 15 },
  seatsLeft: 40,
  fares: { ADULT: fare, CHILD: fare, INFANT: fare },
  totalPaise: 480_000,
} as FlightOffer;

const pax = { adults: 1, children: 0, infants: 0 };
const passengers = [{ type: 'ADULT' as const }, { type: 'CHILD' as const }];

function firstFree(predicate: (s: ReturnType<typeof buildSeatMap>['rows'][0]['seats'][0]) => boolean) {
  const seat = buildSeatMap(offer).rows.flatMap((r) => r.seats).find((s) => s.available && predicate(s));
  if (!seat) throw new Error('no seat');
  return seat;
}

describe('seat map', () => {
  it('is deterministic and 3-3 for a narrow-body economy cabin', () => {
    const a = buildSeatMap(offer);
    expect(a.groups).toEqual([['A', 'B', 'C'], ['D', 'E', 'F']]);
    expect(a.rows).toHaveLength(25);
    expect(JSON.stringify(buildSeatMap({ ...offer }))).toBe(JSON.stringify(a));
  });

  it('prices middle seats free, standard seats by row and XL seats highest', () => {
    const map = buildSeatMap(offer);
    expect(map.byId['10B']?.pricePaise).toBe(0);
    expect(map.byId['3A']?.pricePaise).toBe(62_900);
    expect(map.byId['20A']?.pricePaise).toBe(30_000);
    expect(map.byId['1A']?.kind).toBe('XL');
  });
});

describe('add-on pricing', () => {
  it('adds seats, meals and baggage to the fare breakdown', () => {
    const seat = firstFree((s) => s.pricePaise > 0 && !s.exit);
    const addOns = {
      seats: { '0.0|0': seat.id },
      meals: { '0.0|0': 'samosa-chai' },
      baggage: { '0|0': 'bag-10' },
    };
    const totals = addOnsTotals([offer], addOns);
    expect(totals.totalPaise).toBe(seat.pricePaise + 19_900 + 255_000);
    const price = flightPriceBreakdown([offer], pax, addOns);
    expect(price.totalPaise).toBe(480_000 + totals.totalPaise);
    expect(price.basePaise + price.taxesPaise).toBe(price.totalPaise);
    expect(price.lines.some((l) => l.label.startsWith('Extra baggage'))).toBe(true);
  });

  it('leaves the fare unchanged when nothing is added', () => {
    expect(flightPriceBreakdown([offer], pax).totalPaise).toBe(480_000);
  });
});

describe('validateAddOns', () => {
  it('accepts a valid selection', () => {
    const seat = firstFree((s) => !s.exit);
    expect(
      validateAddOns([offer], passengers, {
        seats: { '0.0|0': seat.id },
        meals: { '0.0|1': 'fresh-fruit-bowl' },
        baggage: { '0|0': 'bag-5' },
      }),
    ).toEqual([]);
  });

  it('rejects taken seats, duplicates, child exit-row seats, infants and unknown ids', () => {
    const map = buildSeatMap(offer);
    const taken = map.rows.flatMap((r) => r.seats).find((s) => !s.available);
    const free = firstFree((s) => !s.exit);
    const exit = firstFree((s) => s.exit);
    const issues = validateAddOns(
      [offer],
      [...passengers, { type: 'INFANT' }],
      {
        seats: {
          '0.0|0': taken?.id ?? '1A',
          '0.0|1': exit.id,
          '0.1|0': free.id,
          '0.0|2': free.id,
        },
        meals: { '0.0|0': 'nope' },
        baggage: { '3|0': 'bag-5' },
      },
    );
    const text = issues.map((i) => i.message).join(' | ');
    expect(text).toContain('no longer available');
    expect(text).toContain('exit row');
    expect(text).toContain('Unknown flight');
    expect(text).toContain('Infants');
    expect(text).toContain('Unknown meal');
    expect(text).toContain('Unknown journey');
  });

  it('flags the same seat chosen twice on one flight', () => {
    const seat = firstFree((s) => !s.exit);
    const issues = validateAddOns([offer], [{ type: 'ADULT' }, { type: 'ADULT' }], {
      seats: { '0.0|0': seat.id, '0.0|1': seat.id },
      meals: {},
      baggage: {},
    });
    expect(issues.some((i) => i.message.includes('twice'))).toBe(true);
  });
});

describe('flightSectors', () => {
  it('lists one sector per segment', () => {
    expect(flightSectors([offer]).map((s) => s.key)).toEqual(['0.0']);
  });
});
