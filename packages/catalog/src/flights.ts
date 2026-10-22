/**
 * Timetable for the development (mock) flight provider: airlines and scheduled services.
 * Airlines are fictional on purpose — invented schedules and fares must not be shown under real
 * airline names. Deterministic: used by the database seed and by the static website.
 */

export const MOCK_AIRLINES = [
  { code: 'SF', name: 'Saffron Air' },
  { code: 'MN', name: 'Monsoon Airways' },
  { code: 'DB', name: 'Deccan Blue' },
  { code: 'CW', name: 'Coral Wings' },
  { code: 'HM', name: 'Himalaya Air' },
  { code: 'GS', name: 'Gulf Star' },
] as const;

/** [from, to, economy base fare in rupees, block time in minutes] — flown in both directions. */
const ROUTES: [string, string, number, number][] = [
  ['PNQ', 'DEL', 3900, 140],
  ['BOM', 'GOI', 2300, 75],
  ['BLR', 'DEL', 4500, 170],
  ['DEL', 'SXR', 3200, 90],
  ['HYD', 'COK', 2900, 100],
  ['BOM', 'DXB', 9800, 190],
  ['PNQ', 'BLR', 3000, 100],
  ['BOM', 'DEL', 4200, 135],
  ['PNQ', 'GOI', 2600, 60],
  ['DEL', 'GOI', 5200, 155],
  ['BLR', 'HYD', 2500, 75],
  ['MAA', 'DEL', 5100, 170],
  ['CCU', 'DEL', 4600, 135],
  ['DEL', 'DXB', 11500, 225],
  ['PNQ', 'HYD', 2800, 85],
  ['BOM', 'BLR', 3400, 105],
  ['DEL', 'JAI', 2100, 60],
  ['BOM', 'COK', 3800, 120],
  ['BLR', 'COK', 2400, 70],
  ['PNQ', 'BOM', 1900, 45],
  // Maharashtra network
  ['PNQ', 'NAG', 2900, 90],
  ['BOM', 'NAG', 3100, 85],
  ['DEL', 'NAG', 4100, 110],
  ['BLR', 'NAG', 3500, 110],
  ['BOM', 'IXU', 2400, 55],
  ['DEL', 'IXU', 4300, 125],
  ['BOM', 'KLH', 2200, 55],
  ['BLR', 'KLH', 2600, 75],
  ['HYD', 'SAG', 2600, 75],
  ['DEL', 'SAG', 4600, 130],
  ['DEL', 'ISK', 4200, 120],
  ['HYD', 'NDC', 2400, 65],
  ['BOM', 'SDW', 2300, 60],
  ['NMI', 'DEL', 4300, 135],
  ['NMI', 'BLR', 3400, 105],
  ['NMI', 'GOI', 2300, 70],
  ['PNQ', 'AMD', 3200, 85],
  ['PNQ', 'MAA', 3400, 105],
  ['PNQ', 'CCU', 5200, 150],
  ['PNQ', 'JAI', 3900, 115],
];

/** One-stop journeys: [from, via, to]. */
const CONNECTIONS: [string, string, string][] = [
  ['PNQ', 'DEL', 'SXR'],
  ['SXR', 'DEL', 'PNQ'],
  ['PNQ', 'BLR', 'COK'],
  ['PNQ', 'BOM', 'DXB'],
  ['GOI', 'BOM', 'DEL'],
  ['HYD', 'BLR', 'DEL'],
  ['NAG', 'BOM', 'GOI'],
  ['KLH', 'BOM', 'DEL'],
  ['IXU', 'BOM', 'BLR'],
];

const SLOTS = [
  '05:40',
  '06:55',
  '08:25',
  '09:50',
  '11:15',
  '13:05',
  '14:40',
  '16:30',
  '18:15',
  '19:45',
  '21:20',
  '22:50',
];
const DOMESTIC = ['SF', 'MN', 'DB', 'CW', 'HM'];

function prng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
const toHhmm = (minutes: number) => {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export interface SegmentPlan {
  from: string;
  to: string;
  departureTime: string;
  dayOffset: number;
  durationMinutes: number;
}

export interface FlightPlan {
  airline: string;
  flightNumber: string;
  segments: SegmentPlan[];
  baseFareRupees: number;
  aircraft: string;
  daysOfWeek: number[];
  premium: boolean;
}

export function buildTimetable(): FlightPlan[] {
  const random = prng(4242);
  const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)] as T;
  const counters = new Map<string, number>();
  const nextNumber = (airline: string) => {
    const n =
      (counters.get(airline) ?? 100 + Math.floor(random() * 50)) + 7 + Math.floor(random() * 40);
    counters.set(airline, n);
    return `${airline} ${n}`;
  };
  const route = new Map(
    ROUTES.flatMap(([a, b, fare, mins]) => [
      [`${a}-${b}`, { fare, mins }],
      [`${b}-${a}`, { fare, mins }],
    ]),
  );
  const plans: FlightPlan[] = [];

  for (const [a, b, fare, mins] of ROUTES) {
    for (const [from, to] of [
      [a, b],
      [b, a],
    ] as const) {
      const international = from === 'DXB' || to === 'DXB';
      const services = international ? 2 : fare > 4000 ? 3 : 2 + Math.floor(random() * 2);
      const slots = [...SLOTS]
        .sort(() => random() - 0.5)
        .slice(0, services)
        .sort();
      slots.forEach((slot, i) => {
        const airline = international ? (i === 0 ? 'GS' : pick(['SF', 'MN'])) : pick(DOMESTIC);
        const daily = random() < 0.75;
        plans.push({
          airline,
          flightNumber: nextNumber(airline),
          segments: [
            {
              from,
              to,
              departureTime: slot,
              dayOffset: 0,
              durationMinutes: mins + Math.floor(random() * 3) * 5,
            },
          ],
          baseFareRupees: Math.round((fare * (0.9 + random() * 0.25)) / 10) * 10,
          aircraft: international
            ? pick(['A321neo', 'B737-8'])
            : mins <= 75
              ? pick(['ATR 72-600', 'A320neo'])
              : pick(['A320neo', 'A321neo', 'B737-8']),
          daysOfWeek: daily ? [1, 2, 3, 4, 5, 6, 7] : [1, 3, 5, 6, 7],
          premium: !international && mins >= 120 && random() < 0.5,
        });
      });
    }
  }

  for (const [from, via, to] of CONNECTIONS) {
    const first = route.get(`${from}-${via}`);
    const second = route.get(`${via}-${to}`);
    if (!first || !second) throw new Error(`Missing route for connection ${from}-${via}-${to}`);
    const airline = to === 'DXB' || from === 'DXB' ? 'SF' : pick(DOMESTIC);
    const departure = toMinutes(pick(SLOTS.slice(0, 8)));
    const layover = 70 + Math.floor(random() * 6) * 15;
    const secondDeparture = departure + first.mins + layover;
    plans.push({
      airline,
      flightNumber: nextNumber(airline),
      segments: [
        {
          from,
          to: via,
          departureTime: toHhmm(departure),
          dayOffset: 0,
          durationMinutes: first.mins,
        },
        {
          from: via,
          to,
          departureTime: toHhmm(secondDeparture),
          dayOffset: Math.floor(secondDeparture / 1440),
          durationMinutes: second.mins,
        },
      ],
      baseFareRupees: Math.round(((first.fare + second.fare) * 0.72) / 10) * 10,
      aircraft: 'A320neo',
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
      premium: false,
    });
  }
  return plans;
}

/** Seats per cabin for a planned service. */
export function planSeats(plan: FlightPlan) {
  return {
    ECONOMY: plan.aircraft.startsWith('ATR') ? 70 : 150,
    PREMIUM_ECONOMY: plan.premium ? 12 : 0,
    BUSINESS: plan.premium ? 8 : 0,
    FIRST: 0,
  } as const;
}
