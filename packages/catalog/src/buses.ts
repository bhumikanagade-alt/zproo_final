/**
 * Bus network for the development (mock) bus provider: fictional operators, coach layouts and a
 * Maharashtra-first route map. Operator names are invented so demo inventory is never mistaken for
 * a real operator's services. Deterministic: used by the database seed and the static website.
 */
import { findCity } from '@zproo/config';

export type BusDeck = 'LOWER' | 'UPPER';
export type BusSeatKind = 'SEATER' | 'SLEEPER';
export type BusType = 'SEATER' | 'SLEEPER' | 'SEATER_SLEEPER';

export const MOCK_BUS_OPERATORS = [
  { code: 'SSK', name: 'Sahyadri Skyline', rating: 4.5, ratingCount: 3120 },
  { code: 'DDH', name: 'Deccan Dhruv Tours', rating: 4.4, ratingCount: 2710 },
  { code: 'KKN', name: 'Konkan Kinara Travels', rating: 4.3, ratingCount: 2240 },
  { code: 'GGT', name: 'Godavari Gati Travels', rating: 4.2, ratingCount: 1870 },
  { code: 'ECO', name: 'Ecoline Electric', rating: 4.6, ratingCount: 1330 },
  { code: 'MMM', name: 'Mula Mutha Motors', rating: 4.1, ratingCount: 1105 },
  { code: 'VVG', name: 'Vidarbha Vega Roadways', rating: 4.0, ratingCount: 960 },
  { code: 'PPR', name: 'Pune Pravas', rating: 3.9, ratingCount: 740 },
] as const;

export interface SeatSpec {
  number: string;
  deck: BusDeck;
  row: number;
  column: number;
  kind: BusSeatKind;
  farePercent: number;
  ladiesOnly: boolean;
}

export interface CoachTemplate {
  key: string;
  name: string;
  type: BusType;
  ac: boolean;
  electric: boolean;
  /** Fare relative to the route's A/C sleeper fare, in percent */
  farePercent: number;
  amenities: string[];
  seats: () => SeatSpec[];
}

/** 2+1 sleeper deck: columns 0–1 (double berths), aisle, column 3 (single berth). */
function sleeperDeck(
  deck: BusDeck,
  rows: number,
  farePercent: number,
  ladies: number[],
): SeatSpec[] {
  const prefix = deck === 'LOWER' ? 'L' : 'U';
  const seats: SeatSpec[] = [];
  let n = 1;
  for (let row = 1; row <= rows; row++) {
    for (const column of [0, 1, 3]) {
      seats.push({
        number: `${prefix}${n}`,
        deck,
        row,
        column,
        kind: 'SLEEPER',
        farePercent,
        ladiesOnly: ladies.includes(n),
      });
      n += 1;
    }
  }
  return seats;
}

/** Seater deck in 2+2 (columns 0,1 | 3,4) or 2+1 (columns 0,1 | 3). Window seats cost a little more. */
function seaterDeck(rows: number, columns: number[], ladies: number[], start = 1): SeatSpec[] {
  const seats: SeatSpec[] = [];
  let n = start;
  const window = (c: number) => c === 0 || c === Math.max(...columns);
  for (let row = 1; row <= rows; row++) {
    for (const column of columns) {
      seats.push({
        number: String(n),
        deck: 'LOWER',
        row,
        column,
        kind: 'SEATER',
        farePercent: window(column) ? 105 : 100,
        ladiesOnly: ladies.includes(n),
      });
      n += 1;
    }
  }
  return seats;
}

const PREMIUM = [
  'Wi-Fi',
  'Charging point',
  'Blanket',
  'Water bottle',
  'Reading light',
  'CCTV',
  'Live tracking',
];
const STANDARD = ['Charging point', 'Water bottle', 'Reading light', 'Live tracking'];

export const COACH_TEMPLATES: CoachTemplate[] = [
  {
    key: 'VOLVO_SLEEPER',
    name: 'Volvo 9600 Multi-Axle A/C Sleeper (2+1)',
    type: 'SLEEPER',
    ac: true,
    electric: false,
    farePercent: 100,
    amenities: PREMIUM,
    seats: () => [...sleeperDeck('LOWER', 6, 110, [3, 6]), ...sleeperDeck('UPPER', 6, 100, [3])],
  },
  {
    key: 'AC_SEATER_SLEEPER',
    name: 'Bharat Benz A/C Seater / Sleeper (2+1)',
    type: 'SEATER_SLEEPER',
    ac: true,
    electric: false,
    farePercent: 88,
    amenities: ['Charging point', 'Blanket', 'Water bottle', 'Reading light', 'Live tracking'],
    seats: () => [...seaterDeck(10, [0, 1, 3], [1, 2]), ...sleeperDeck('UPPER', 6, 112, [3])],
  },
  {
    key: 'VOLVO_SEATER',
    name: 'Volvo 9400 Multi-Axle A/C Semi-Sleeper (2+2)',
    type: 'SEATER',
    ac: true,
    electric: false,
    farePercent: 78,
    amenities: [
      'Wi-Fi',
      'Charging point',
      'Water bottle',
      'Reading light',
      'CCTV',
      'Live tracking',
    ],
    seats: () => seaterDeck(11, [0, 1, 3, 4], [1, 2, 5]),
  },
  {
    key: 'ELECTRIC_SEATER',
    name: 'Electric A/C Seater (2+2)',
    type: 'SEATER',
    ac: true,
    electric: true,
    farePercent: 82,
    amenities: ['Wi-Fi', 'Charging point', 'Water bottle', 'CCTV', 'Live tracking'],
    seats: () => seaterDeck(10, [0, 1, 3, 4], [1, 2]),
  },
  {
    key: 'NON_AC_SLEEPER',
    name: 'Non A/C Sleeper (2+1)',
    type: 'SLEEPER',
    ac: false,
    electric: false,
    farePercent: 72,
    amenities: STANDARD,
    seats: () => [...sleeperDeck('LOWER', 6, 108, [3]), ...sleeperDeck('UPPER', 6, 100, [])],
  },
  {
    key: 'NON_AC_SEATER',
    name: 'Non A/C Push-Back Seater (2+2)',
    type: 'SEATER',
    ac: false,
    electric: false,
    farePercent: 58,
    amenities: ['Charging point', 'Live tracking'],
    seats: () => seaterDeck(10, [0, 1, 3, 4], [1, 2]),
  },
];

/** Operator → the coach types it runs. */
export const FLEET: Record<string, string[]> = {
  SSK: ['VOLVO_SLEEPER', 'VOLVO_SEATER'],
  DDH: ['VOLVO_SLEEPER', 'AC_SEATER_SLEEPER'],
  KKN: ['AC_SEATER_SLEEPER', 'NON_AC_SLEEPER', 'VOLVO_SEATER'],
  GGT: ['AC_SEATER_SLEEPER', 'NON_AC_SLEEPER'],
  ECO: ['ELECTRIC_SEATER'],
  MMM: ['VOLVO_SEATER', 'NON_AC_SEATER'],
  VVG: ['VOLVO_SLEEPER', 'NON_AC_SLEEPER'],
  PPR: ['NON_AC_SEATER', 'NON_AC_SLEEPER'],
};

/** Boarding/dropping points for the main cities, in the order a departing bus passes them. */
const CITY_POINTS: Record<string, [string, string][]> = {
  pune: [
    ['Swargate', 'Near Swargate Bus Stand, Pune'],
    ['Shivajinagar', 'Opp. Shivajinagar Bus Stand, Pune'],
    ['Wakad', 'Wakad Bridge, Mumbai–Bengaluru Highway, Pune'],
    ['Hinjewadi', 'Hinjewadi Phase 1 Chowk, Pune'],
    ['Nigdi', 'Bhakti Shakti Chowk, Nigdi, Pune'],
    ['Katraj', 'Katraj Chowk, Pune'],
  ],
  mumbai: [
    ['Borivali', 'Near National Park Gate, Borivali East, Mumbai'],
    ['Andheri', 'Western Express Highway, Andheri East, Mumbai'],
    ['Dadar', 'Dadar TT Circle, Mumbai'],
    ['Sion', 'Sion Circle, Mumbai'],
    ['Vashi', 'Vashi Plaza, Navi Mumbai'],
    ['Panvel', 'Near Panvel Bus Depot, Panvel'],
  ],
  nashik: [
    ['Nashik CBS', 'Central Bus Stand, Nashik'],
    ['Dwarka Circle', 'Dwarka Circle, Nashik'],
    ['Nashik Road', 'Near Nashik Road Station'],
    ['Pathardi Phata', 'Pathardi Phata, Mumbai–Agra Highway, Nashik'],
  ],
  nagpur: [
    ['Ganeshpeth', 'Ganeshpeth Bus Stand, Nagpur'],
    ['Sitabuldi', 'Variety Square, Sitabuldi, Nagpur'],
    ['Chhatrapati Square', 'Chhatrapati Square, Wardha Road, Nagpur'],
    ['Medical Square', 'Medical Square, Nagpur'],
  ],
  kolhapur: [
    ['Kolhapur CBS', 'Central Bus Stand, Kolhapur'],
    ['Tararani Chowk', 'Tararani Chowk, Kolhapur'],
    ['Shiroli Phata', 'Shiroli Phata, Pune–Bengaluru Highway'],
  ],
  sambhajinagar: [
    ['Sambhajinagar CBS', 'Central Bus Stand, Chhatrapati Sambhajinagar'],
    ['Kranti Chowk', 'Kranti Chowk, Chhatrapati Sambhajinagar'],
    ['Baba Petrol Pump', 'Baba Petrol Pump Chowk, Chhatrapati Sambhajinagar'],
    ['CIDCO', 'CIDCO Bus Stand, Chhatrapati Sambhajinagar'],
  ],
  goa: [
    ['Panaji', 'Kadamba Bus Stand, Panaji'],
    ['Porvorim', 'Porvorim Circle, Goa'],
    ['Mapusa', 'Mapusa Bus Stand, Goa'],
    ['Margao', 'Kadamba Bus Stand, Margao'],
  ],
  bengaluru: [
    ['Majestic', 'Kempegowda Bus Station, Majestic, Bengaluru'],
    ['Anand Rao Circle', 'Anand Rao Circle, Bengaluru'],
    ['Yeshwanthpur', 'Yeshwanthpur Circle, Bengaluru'],
    ['Nelamangala', 'Nelamangala Toll, Tumakuru Road'],
  ],
  hyderabad: [
    ['MGBS', 'Mahatma Gandhi Bus Station, Hyderabad'],
    ['Ameerpet', 'Ameerpet Metro, Hyderabad'],
    ['Kukatpally', 'KPHB Colony, Kukatpally, Hyderabad'],
    ['Miyapur', 'Miyapur X Roads, Hyderabad'],
  ],
  ahmedabad: [
    ['Paldi', 'Paldi Cross Roads, Ahmedabad'],
    ['Geeta Mandir', 'Geeta Mandir Bus Stand, Ahmedabad'],
    ['Naroda', 'Naroda Patiya, Ahmedabad'],
  ],
  shirdi: [
    ['Shirdi Bus Stand', 'Near Sai Baba Temple Gate 1, Shirdi'],
    ['Nimgaon', 'Nimgaon Phata, Shirdi'],
  ],
  satara: [
    ['Satara Bus Stand', 'Central Bus Stand, Satara'],
    ['Wadhe Phata', 'Wadhe Phata, Satara'],
  ],
  ratnagiri: [
    ['Ratnagiri Bus Stand', 'Central Bus Stand, Ratnagiri'],
    ['Maruti Mandir', 'Maruti Mandir Circle, Ratnagiri'],
  ],
  mahabaleshwar: [
    ['Mahabaleshwar Bus Stand', 'Main Market Bus Stand, Mahabaleshwar'],
    ['Panchgani', 'Panchgani Bus Stand'],
  ],
};

export function pointsFor(city: string): [string, string][] {
  const known = CITY_POINTS[city];
  if (known) return known;
  const name = findCity(city)?.name ?? city;
  return [
    [`${name} Bus Stand`, `Central Bus Stand, ${name}`],
    [`${name} Bypass`, `Highway Bypass Pickup, ${name}`],
  ];
}

/** [from, to, distance km, duration minutes, A/C sleeper fare in rupees] — run in both directions. */
export const BUS_ROUTES: [string, string, number, number, number][] = [
  // From Pune
  ['pune', 'mumbai', 150, 210, 450],
  ['pune', 'nashik', 210, 300, 500],
  ['pune', 'kolhapur', 230, 330, 550],
  ['pune', 'satara', 115, 150, 300],
  ['pune', 'sambhajinagar', 235, 330, 550],
  ['pune', 'shirdi', 185, 270, 450],
  ['pune', 'solapur', 250, 330, 550],
  ['pune', 'ahilyanagar', 120, 180, 300],
  ['pune', 'mahabaleshwar', 120, 180, 350],
  ['pune', 'ratnagiri', 300, 420, 600],
  ['pune', 'pandharpur', 205, 270, 400],
  ['pune', 'latur', 360, 480, 700],
  ['pune', 'nanded', 460, 600, 800],
  ['pune', 'jalgaon', 410, 540, 750],
  ['pune', 'amravati', 600, 780, 1100],
  ['pune', 'nagpur', 715, 870, 1300],
  ['pune', 'goa', 450, 600, 900],
  ['pune', 'hyderabad', 560, 720, 1000],
  ['pune', 'bengaluru', 840, 960, 1400],
  // From Mumbai
  ['mumbai', 'nashik', 170, 240, 400],
  ['mumbai', 'shirdi', 240, 330, 550],
  ['mumbai', 'kolhapur', 380, 480, 700],
  ['mumbai', 'sambhajinagar', 335, 450, 650],
  ['mumbai', 'ratnagiri', 330, 450, 600],
  ['mumbai', 'malvan', 480, 600, 850],
  ['mumbai', 'mahabaleshwar', 250, 360, 550],
  ['mumbai', 'alibaug', 95, 150, 300],
  ['mumbai', 'nagpur', 830, 960, 1400],
  ['mumbai', 'goa', 590, 720, 1000],
  ['mumbai', 'ahmedabad', 525, 540, 900],
  ['mumbai', 'indore', 590, 720, 1100],
  ['mumbai', 'hyderabad', 710, 840, 1200],
  ['mumbai', 'bengaluru', 985, 1080, 1600],
  // Across Maharashtra
  ['nagpur', 'amravati', 155, 180, 350],
  ['nagpur', 'chandrapur', 155, 180, 300],
  ['nagpur', 'sambhajinagar', 480, 600, 900],
  ['nagpur', 'hyderabad', 500, 600, 900],
  ['nashik', 'shirdi', 90, 120, 250],
  ['kolhapur', 'goa', 215, 300, 450],
  ['kolhapur', 'bengaluru', 600, 720, 1100],
];

/** Stable pseudo-random integer for a key. */
function hash(key: string): number {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

const pad = (n: number) => String(n).padStart(2, '0');
const time = (minutes: number) => `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;

export interface BusServicePlan {
  serviceNumber: string;
  operatorCode: string;
  template: string;
  from: string;
  to: string;
  departureTime: string;
  durationMinutes: number;
  daysOfWeek: number[];
  baseFarePaise: number;
}

/**
 * Services per direction: more on short hops (day and night), long routes mostly overnight.
 * Electric coaches only run routes under 300 km.
 */
export function buildBusTimetable(): BusServicePlan[] {
  const plans: BusServicePlan[] = [];
  const used = new Set<string>();
  for (const [a, b, km, minutes, fare] of BUS_ROUTES) {
    for (const [from, to] of [
      [a, b],
      [b, a],
    ] as const) {
      const count = km < 300 ? 7 : km < 600 ? 5 : 4;
      for (let i = 0; i < count; i++) {
        const h = hash(`${from}-${to}-${i}`);
        // Short routes: spread 05:30–23:00. Long routes: 17:00–23:30 (overnight).
        const start =
          km < 300
            ? 330 + Math.floor((i * (1050 - 60)) / count)
            : 1020 + Math.floor((i * 390) / count);
        const departure = start + (h % 4) * 10;
        const candidates = Object.entries(FLEET).filter(([, types]) =>
          types.some((t) => t !== 'ELECTRIC_SEATER' || km < 300),
        );
        const [operatorCode, types] = candidates[(h >>> 3) % candidates.length] as [
          string,
          string[],
        ];
        const allowed = types.filter((t) => t !== 'ELECTRIC_SEATER' || km < 300);
        // Overnight long-distance services use sleepers where the operator has them.
        const sleeperFirst = km >= 300 ? allowed.filter((t) => t.includes('SLEEPER')) : [];
        const pool = sleeperFirst.length > 0 ? sleeperFirst : allowed;
        const template = pool[(h >>> 7) % pool.length] as string;
        const coach = COACH_TEMPLATES.find((c) => c.key === template) as CoachTemplate;
        let number = `${operatorCode} ${pad(Math.floor(departure / 60) % 24)}${pad(departure % 60)}`;
        for (let n = 2; used.has(number); n++)
          number = `${operatorCode} ${pad(Math.floor(departure / 60) % 24)}${pad(departure % 60)}-${n}`;
        used.add(number);
        const skipDay = h % 5 === 0 ? 1 + (h % 7) : 0; // a few services skip one weekday
        plans.push({
          serviceNumber: number,
          operatorCode,
          template,
          from,
          to,
          departureTime: time(departure),
          durationMinutes: minutes + ((h >>> 11) % 4) * 10,
          daysOfWeek: [1, 2, 3, 4, 5, 6, 7].filter((d) => d !== skipDay),
          baseFarePaise: Math.round((fare * coach.farePercent) / 100 / 10) * 10 * 100,
        });
      }
    }
  }
  return plans;
}
