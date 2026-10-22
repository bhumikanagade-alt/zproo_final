import type { AirportInfo, FlightOffer, FlightSearchResult } from '@zproo/types';

const airport = (code: string, city: string): AirportInfo => ({
  code,
  city,
  name: `${city} Airport`,
  country: 'India',
  timezone: 'Asia/Kolkata',
});
export const PNQ = airport('PNQ', 'Pune');
export const DEL = airport('DEL', 'New Delhi');
export const SXR = airport('SXR', 'Srinagar');

/** A flight offer for tests; times are UTC instants (IST = UTC+5:30). */
export function makeOffer(overrides: Partial<FlightOffer> = {}): FlightOffer {
  const base: FlightOffer = {
    id: 'mk_f1_20261025_E',
    provider: 'mock',
    airline: { code: 'SF', name: 'Saffron Air' },
    flightNumber: 'SF 201',
    from: PNQ,
    to: DEL,
    departureAt: '2026-10-25T01:00:00.000Z', // 06:30 IST
    arrivalAt: '2026-10-25T03:20:00.000Z', // 08:50 IST
    durationMinutes: 140,
    stops: 0,
    segments: [],
    layovers: [],
    cabin: 'ECONOMY',
    fareFamily: 'Saver',
    refundable: false,
    cancellationFeePaise: null,
    baggage: { cabinKg: 7, checkInKg: 15 },
    seatsLeft: 20,
    fares: {
      ADULT: { basePaise: 400_000, taxesPaise: 80_000, totalPaise: 480_000 },
      CHILD: { basePaise: 300_000, taxesPaise: 70_000, totalPaise: 370_000 },
      INFANT: { basePaise: 0, taxesPaise: 37_500, totalPaise: 37_500 },
    },
    totalPaise: 480_000,
    ...overrides,
  };
  if (!overrides.segments) {
    base.segments = [
      {
        airline: base.airline,
        flightNumber: base.flightNumber,
        from: base.from,
        to: base.to,
        departureAt: base.departureAt,
        arrivalAt: base.arrivalAt,
        durationMinutes: base.durationMinutes,
        aircraft: 'A320neo',
      },
    ];
  }
  return base;
}

export const OFFERS: FlightOffer[] = [
  makeOffer(),
  makeOffer({
    id: 'mk_f2_20261025_E',
    airline: { code: 'MN', name: 'Monsoon Airways' },
    flightNumber: 'MN 455',
    departureAt: '2026-10-25T12:30:00.000Z', // 18:00 IST
    arrivalAt: '2026-10-25T14:40:00.000Z',
    durationMinutes: 130,
    fareFamily: 'Comfort',
    refundable: true,
    cancellationFeePaise: 300_000,
    totalPaise: 620_000,
    seatsLeft: 3,
  }),
  makeOffer({
    id: 'mk_f3_20261025_E',
    airline: { code: 'DB', name: 'Deccan Blue' },
    flightNumber: 'DB 118',
    departureAt: '2026-10-25T04:00:00.000Z', // 09:30 IST
    arrivalAt: '2026-10-25T09:00:00.000Z',
    durationMinutes: 300,
    stops: 1,
    layovers: [{ airport: airport('BOM', 'Mumbai'), minutes: 75 }],
    totalPaise: 430_000,
  }),
];

export function searchResult(offers: FlightOffer[] = OFFERS): FlightSearchResult {
  return {
    legs: [{ from: 'PNQ', to: 'DEL', date: '2026-10-25', offers }],
    passengers: { adults: 1, children: 0, infants: 0 },
    cabin: 'ECONOMY',
    demo: true,
  };
}
