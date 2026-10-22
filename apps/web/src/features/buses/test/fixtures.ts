import type { BusSeatInfo, BusSeatMap, BusTripOffer } from '@zproo/types';

/** Times are UTC instants; IST = UTC+5:30. */
export function makeTrip(overrides: Partial<BusTripOffer> = {}): BusTripOffer {
  return {
    id: 'bs_s1_20261025',
    provider: 'mock',
    serviceNumber: 'SSK 2130',
    operator: { code: 'SSK', name: 'Sahyadri Skyline', rating: 4.5, ratingCount: 3120 },
    bus: {
      name: 'Volvo 9600 Multi-Axle A/C Sleeper (2+1)',
      type: 'SLEEPER',
      ac: true,
      electric: false,
    },
    from: { code: 'pune', name: 'Pune' },
    to: { code: 'mumbai', name: 'Mumbai' },
    date: '2026-10-25',
    departureAt: '2026-10-25T16:00:00.000Z', // 21:30 IST
    arrivalAt: '2026-10-25T19:30:00.000Z', // 01:00 IST next day
    durationMinutes: 210,
    distanceKm: 150,
    amenities: ['Wi-Fi', 'Charging point', 'Blanket'],
    fromPaise: 47_300,
    seatsAvailable: 20,
    totalSeats: 36,
    boardingPoints: [
      {
        id: 'b1',
        name: 'Swargate',
        address: 'Near Swargate Bus Stand, Pune',
        time: '2026-10-25T16:00:00.000Z',
      },
      { id: 'b2', name: 'Wakad', address: 'Wakad Bridge, Pune', time: '2026-10-25T16:30:00.000Z' },
    ],
    droppingPoints: [
      {
        id: 'd1',
        name: 'Vashi',
        address: 'Vashi Plaza, Navi Mumbai',
        time: '2026-10-25T19:00:00.000Z',
      },
      {
        id: 'd2',
        name: 'Dadar',
        address: 'Dadar TT Circle, Mumbai',
        time: '2026-10-25T19:30:00.000Z',
      },
    ],
    cancellationPolicy: [
      { hoursBefore: 24, refundPercent: 90 },
      { hoursBefore: 0, refundPercent: 0 },
    ],
    ...overrides,
  };
}

export const TRIPS: BusTripOffer[] = [
  makeTrip(),
  makeTrip({
    id: 'bs_s2_20261025',
    serviceNumber: 'PPR 0715',
    operator: { code: 'PPR', name: 'Pune Pravas', rating: 3.9, ratingCount: 740 },
    bus: { name: 'Non A/C Push-Back Seater (2+2)', type: 'SEATER', ac: false, electric: false },
    departureAt: '2026-10-25T01:45:00.000Z', // 07:15 IST
    arrivalAt: '2026-10-25T05:15:00.000Z',
    fromPaise: 26_000,
    seatsAvailable: 4,
  }),
  makeTrip({
    id: 'bs_s3_20261025',
    serviceNumber: 'ECO 1000',
    operator: { code: 'ECO', name: 'Ecoline Electric', rating: 4.6, ratingCount: 1330 },
    bus: { name: 'Electric A/C Seater (2+2)', type: 'SEATER', ac: true, electric: true },
    departureAt: '2026-10-25T04:30:00.000Z', // 10:00 IST
    arrivalAt: '2026-10-25T07:50:00.000Z',
    durationMinutes: 200,
    fromPaise: 38_900,
    seatsAvailable: 30,
  }),
];

const seat = (
  number: string,
  row: number,
  column: number,
  extra: Partial<BusSeatInfo> = {},
): BusSeatInfo => ({
  number,
  deck: 'LOWER',
  row,
  column,
  kind: 'SLEEPER',
  available: true,
  ladiesOnly: false,
  basePaise: 45_000,
  taxPaise: 2_300,
  pricePaise: 47_300,
  ...extra,
});

export function makeSeatMap(tripId = 'bs_s1_20261025'): BusSeatMap {
  return {
    tripId,
    maxSeats: 6,
    decks: [
      {
        deck: 'LOWER',
        rows: 2,
        columns: 4,
        seats: [
          seat('L1', 1, 0),
          seat('L2', 1, 1, { available: false }),
          seat('L3', 1, 3, { ladiesOnly: true }),
          seat('L4', 2, 0),
          seat('L5', 2, 1),
          seat('L6', 2, 3),
        ],
      },
      {
        deck: 'UPPER',
        rows: 1,
        columns: 4,
        seats: [
          seat('U1', 1, 0, {
            deck: 'UPPER',
            basePaise: 41_000,
            taxPaise: 2_100,
            pricePaise: 43_100,
          }),
          seat('U2', 1, 1, {
            deck: 'UPPER',
            basePaise: 41_000,
            taxPaise: 2_100,
            pricePaise: 43_100,
          }),
          seat('U3', 1, 3, {
            deck: 'UPPER',
            basePaise: 41_000,
            taxPaise: 2_100,
            pricePaise: 43_100,
          }),
        ],
      },
    ],
  };
}
