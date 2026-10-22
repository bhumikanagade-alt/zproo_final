/**
 * Railway network for the development (mock) train provider.
 *
 * Train names and numbers are INVENTED (numbers start with "Z", which Indian Railways never uses)
 * so demo inventory can never be mistaken for a real train, timetable, fare or availability.
 * Stations are real station codes from @zproo/config so search and autocomplete behave like the
 * real thing. Everything here is deterministic: the API's mock provider and the static website
 * produce the same trains, fares and availability for the same date.
 */
import { findStation } from '@zproo/config';
import type {
  TrainAvailability,
  TrainClass,
  TrainClassOption,
  TrainFare,
  TrainOffer,
  TrainQuota,
  TrainStop,
} from '@zproo/types';
import { unitHash } from './hash';
import { addDaysIso, daysBetweenIso, isoWeekday, localDate, zonedTimeToUtc } from './time';

export const RAIL_TZ = 'Asia/Kolkata';
export const MOCK_TRAIN_PROVIDER = 'mock';

/** Quotas the development provider sells. Others (e.g. Premium Tatkal) are not offered. */
export const MOCK_TRAIN_QUOTAS: TrainQuota[] = ['GN', 'TQ', 'LD'];
/** Indian Railways' advance reservation period (60 days from 1 November 2024). */
export const TRAIN_ADVANCE_DAYS = 60;
export const MOCK_TRAIN_MAX_PASSENGERS = 6;
export const MOCK_TRAIN_MAX_TATKAL_PASSENGERS = 4;
/** Current booking closes this long before departure from the boarding station. */
export const TRAIN_BOOKING_CUTOFF_MINUTES = 30;
/** The (first) reservation chart is prepared this long before departure. */
export const TRAIN_CHART_MINUTES = 4 * 60;

// ───────────────────────────── Network ─────────────────────────────

/** A line: stations in running order with distance (km) from the first one. */
interface RailLine {
  key: string;
  stations: readonly (readonly [string, number])[];
}

const LINES: RailLine[] = [
  {
    key: 'mumbai-pune',
    stations: [
      ['CSMT', 0],
      ['DR', 9],
      ['TNA', 34],
      ['KYN', 54],
      ['LNL', 128],
      ['PUNE', 192],
    ],
  },
  {
    key: 'pune-delhi',
    stations: [
      ['PUNE', 0],
      ['DD', 76],
      ['ANG', 160],
      ['MMR', 270],
      ['BSL', 430],
      ['BPL', 735],
      ['AGC', 1100],
      ['NDLS', 1300],
    ],
  },
  {
    key: 'mumbai-delhi',
    stations: [
      ['MMCT', 0],
      ['ST', 263],
      ['BRC', 392],
      ['JP', 1000],
      ['NDLS', 1386],
    ],
  },
  {
    key: 'mumbai-bengaluru',
    stations: [
      ['CSMT', 0],
      ['DR', 9],
      ['KYN', 54],
      ['PUNE', 192],
      ['STR', 315],
      ['KRD', 365],
      ['MRJ', 440],
      ['UBL', 640],
      ['SBC', 1110],
    ],
  },
  {
    key: 'pune-nagpur',
    stations: [
      ['PUNE', 0],
      ['DD', 76],
      ['ANG', 160],
      ['MMR', 270],
      ['BSL', 430],
      ['AK', 570],
      ['BD', 650],
      ['WR', 740],
      ['NGP', 820],
    ],
  },
  {
    key: 'mumbai-goa',
    stations: [
      ['CSMT', 0],
      ['DR', 9],
      ['TNA', 34],
      ['PNVL', 68],
      ['RN', 330],
      ['KUDL', 470],
      ['SWV', 497],
      ['MAO', 585],
    ],
  },
  {
    key: 'pune-hyderabad',
    stations: [
      ['PUNE', 0],
      ['DD', 76],
      ['SUR', 264],
      ['SC', 600],
    ],
  },
  {
    key: 'mumbai-nagpur',
    stations: [
      ['CSMT', 0],
      ['KYN', 54],
      ['IGP', 136],
      ['NK', 187],
      ['MMR', 260],
      ['JL', 420],
      ['BSL', 444],
      ['AK', 585],
      ['BD', 665],
      ['WR', 755],
      ['NGP', 835],
    ],
  },
];

export type TrainKind = 'Superfast' | 'Express' | 'Chair Car Express';

/** One direction of a demo train service. */
export interface TrainPlan {
  number: string;
  name: string;
  kind: TrainKind;
  /** Stations in running order (already reversed for the return direction). */
  stations: readonly (readonly [string, number])[];
  /** Local departure time from the first station, "HH:MM" */
  departure: string;
  speedKmph: number;
  /** ISO weekdays the train leaves its first station. */
  daysOfWeek: number[];
  classes: TrainClass[];
  pantry: boolean;
}

interface TrainSpec {
  number: number;
  name: string;
  kind: TrainKind;
  line: string;
  /** Departure "HH:MM" from each end: [forward, return]. */
  departures: [string, string];
  speedKmph: number;
  daysOfWeek: number[];
  classes: TrainClass[];
  pantry: boolean;
}

const DAILY = [1, 2, 3, 4, 5, 6, 7];

// Names are coined for the demo and deliberately avoid real Indian Railways train names.
const SPECS: TrainSpec[] = [
  {
    number: 1101,
    name: 'Ghat Sprint Chair Car',
    kind: 'Chair Car Express',
    line: 'mumbai-pune',
    departures: ['06:40', '07:15'],
    speedKmph: 62,
    daysOfWeek: DAILY,
    classes: ['EC', 'CC', '2S'],
    pantry: true,
  },
  {
    number: 1103,
    name: 'Lonavala Morning Link',
    kind: 'Express',
    line: 'mumbai-pune',
    departures: ['17:10', '05:50'],
    speedKmph: 55,
    daysOfWeek: DAILY,
    classes: ['CC', '2S'],
    pantry: false,
  },
  {
    number: 2101,
    name: 'Deccan Breeze Superfast',
    kind: 'Superfast',
    line: 'pune-delhi',
    departures: ['16:15', '15:40'],
    speedKmph: 68,
    daysOfWeek: DAILY,
    classes: ['1A', '2A', '3A', '3E', 'SL'],
    pantry: true,
  },
  {
    number: 2103,
    name: 'Narmada Nightline Express',
    kind: 'Express',
    line: 'pune-delhi',
    departures: ['21:05', '22:20'],
    speedKmph: 56,
    daysOfWeek: [1, 3, 5, 7],
    classes: ['2A', '3A', 'SL'],
    pantry: true,
  },
  {
    number: 3101,
    name: 'Coastal Capital Express',
    kind: 'Superfast',
    line: 'mumbai-delhi',
    departures: ['17:00', '16:30'],
    speedKmph: 82,
    daysOfWeek: DAILY,
    classes: ['1A', '2A', '3A'],
    pantry: true,
  },
  {
    number: 4101,
    name: 'Silicon Plateau Express',
    kind: 'Superfast',
    line: 'mumbai-bengaluru',
    departures: ['20:35', '19:10'],
    speedKmph: 60,
    daysOfWeek: DAILY,
    classes: ['2A', '3A', '3E', 'SL', '2S'],
    pantry: true,
  },
  {
    number: 4103,
    name: 'Kaveri Sunrise Link',
    kind: 'Express',
    line: 'mumbai-bengaluru',
    departures: ['11:45', '13:05'],
    speedKmph: 52,
    daysOfWeek: [2, 4, 6],
    classes: ['3A', 'SL', '2S'],
    pantry: false,
  },
  {
    number: 5101,
    name: 'Orange Orchard Superfast',
    kind: 'Superfast',
    line: 'pune-nagpur',
    departures: ['18:25', '17:50'],
    speedKmph: 64,
    daysOfWeek: DAILY,
    classes: ['2A', '3A', '3E', 'SL'],
    pantry: true,
  },
  {
    number: 6101,
    name: 'Western Ghats Seaview Express',
    kind: 'Express',
    line: 'mumbai-goa',
    departures: ['22:50', '18:30'],
    speedKmph: 54,
    daysOfWeek: DAILY,
    classes: ['2A', '3A', 'SL'],
    pantry: true,
  },
  {
    number: 6103,
    name: 'Coconut Coast Chair Car',
    kind: 'Chair Car Express',
    line: 'mumbai-goa',
    departures: ['05:25', '14:40'],
    speedKmph: 66,
    daysOfWeek: [1, 2, 3, 4, 5, 6],
    classes: ['EC', 'CC', '2S'],
    pantry: true,
  },
  {
    number: 7101,
    name: 'Bhima Plateau Express',
    kind: 'Express',
    line: 'pune-hyderabad',
    departures: ['14:20', '20:15'],
    speedKmph: 55,
    daysOfWeek: DAILY,
    classes: ['2A', '3A', 'SL', '2S'],
    pantry: false,
  },
  {
    number: 8101,
    name: 'Nagzira Nightline',
    kind: 'Superfast',
    line: 'mumbai-nagpur',
    departures: ['20:10', '19:30'],
    speedKmph: 66,
    daysOfWeek: DAILY,
    classes: ['1A', '2A', '3A', 'SL'],
    pantry: true,
  },
];

let timetable: TrainPlan[] | null = null;

/** Every demo train, both directions (return numbers are the forward number + 1). */
export function buildTrainTimetable(): TrainPlan[] {
  if (timetable) return timetable;
  const plans: TrainPlan[] = [];
  for (const spec of SPECS) {
    const line = LINES.find((l) => l.key === spec.line);
    if (!line) continue;
    const total = line.stations.at(-1)?.[1] ?? 0;
    const reversed = [...line.stations].reverse().map(([code, km]) => [code, total - km] as const);
    for (const [i, stations] of [line.stations, reversed].entries()) {
      plans.push({
        number: `Z${spec.number + i}`,
        name: spec.name,
        kind: spec.kind,
        stations,
        departure: spec.departures[i] as string,
        speedKmph: spec.speedKmph,
        daysOfWeek: spec.daysOfWeek,
        classes: spec.classes,
        pantry: spec.pantry,
      });
    }
  }
  timetable = plans;
  return plans;
}

export function findTrainPlan(number: string): TrainPlan | undefined {
  return buildTrainTimetable().find((p) => p.number === number);
}

const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (minutes: number) => `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
const HALT_MINUTES = 5;

/** Full route with times. Minutes are counted from midnight of the first day. */
export function trainRoute(
  plan: TrainPlan,
): (TrainStop & { arriveMin: number | null; departMin: number | null })[] {
  const [h = 0, m = 0] = plan.departure.split(':').map(Number);
  const start = h * 60 + m;
  return plan.stations.map(([code, km], i) => {
    const running = Math.round(((km / plan.speedKmph) * 60) / 5) * 5;
    const arrive = i === 0 ? null : start + running + (i - 1) * HALT_MINUTES;
    const depart =
      i === plan.stations.length - 1 ? null : i === 0 ? start : (arrive as number) + HALT_MINUTES;
    const at = (depart ?? arrive) as number;
    return {
      code,
      name: findStation(code)?.name ?? code,
      arrival: arrive === null ? null : hhmm(arrive),
      departure: depart === null ? null : hhmm(depart),
      day: Math.floor(at / 1440) + 1,
      distanceKm: km,
      arriveMin: arrive,
      departMin: depart,
    };
  });
}

// ───────────────────────────── Fares ─────────────────────────────

/** Paise per km of base fare (demo values, roughly the shape of the real fare table). */
const RATE_PAISE_PER_KM: Record<TrainClass, number> = {
  '1A': 320,
  '2A': 190,
  '3A': 135,
  '3E': 125,
  SL: 52,
  CC: 110,
  EC: 230,
  '2S': 32,
};
const MIN_KM: Record<TrainClass, number> = {
  '1A': 300,
  '2A': 300,
  '3A': 300,
  '3E': 300,
  SL: 200,
  CC: 50,
  EC: 50,
  '2S': 50,
};
const RESERVATION_PAISE: Record<TrainClass, number> = {
  '1A': 6000,
  '2A': 5000,
  '3A': 4000,
  '3E': 4000,
  SL: 2000,
  CC: 4000,
  EC: 6000,
  '2S': 1500,
};
const SUPERFAST_PAISE: Record<TrainClass, number> = {
  '1A': 7500,
  '2A': 4500,
  '3A': 4500,
  '3E': 4500,
  SL: 3000,
  CC: 4500,
  EC: 7500,
  '2S': 1500,
};
/** Tatkal charge: percent of base fare, with a minimum and maximum (paise). */
const TATKAL: Record<TrainClass, [number, number, number] | null> = {
  '1A': null,
  '2A': [30, 40_000, 50_000],
  '3A': [30, 30_000, 40_000],
  '3E': [30, 30_000, 40_000],
  SL: [30, 10_000, 20_000],
  CC: [30, 12_500, 22_500],
  EC: [30, 40_000, 50_000],
  '2S': [10, 1_500, 1_500],
};
export const AC_CLASSES: TrainClass[] = ['1A', '2A', '3A', '3E', 'CC', 'EC'];
const GST_PERCENT = 5;

const roundTo = (paise: number, step: number) => Math.round(paise / step) * step;

/** Per-passenger fare for a class over a distance. Whole rupees throughout. */
export function trainFare(input: {
  travelClass: TrainClass;
  distanceKm: number;
  superfast: boolean;
  quota: TrainQuota;
}): TrainFare {
  const { travelClass: c } = input;
  const km = Math.max(MIN_KM[c], input.distanceKm);
  const basePaise = roundTo(km * RATE_PAISE_PER_KM[c], 500);
  const reservationPaise = RESERVATION_PAISE[c];
  const superfastPaise = input.superfast ? SUPERFAST_PAISE[c] : 0;
  const tatkal = TATKAL[c];
  const tatkalPaise =
    input.quota === 'TQ' && tatkal
      ? Math.min(tatkal[2], Math.max(tatkal[1], roundTo((basePaise * tatkal[0]) / 100, 100)))
      : 0;
  const taxable = basePaise + reservationPaise + superfastPaise + tatkalPaise;
  const gstPaise = AC_CLASSES.includes(c) ? roundTo((taxable * GST_PERCENT) / 100, 100) : 0;
  return {
    basePaise,
    reservationPaise,
    superfastPaise,
    tatkalPaise,
    gstPaise,
    totalPaise: taxable + gstPaise,
  };
}

// ───────────────────────────── Availability ─────────────────────────────

interface ClassCapacity {
  /** Berths/seats per quota */
  quota: Record<'GN' | 'TQ' | 'LD', number>;
  /** RAC positions (general quota only); 0 for classes without RAC. */
  rac: number;
  /** Waiting list length before the class shows REGRET. */
  waitlist: number;
}

const CAPACITY: Record<TrainClass, ClassCapacity> = {
  '1A': { quota: { GN: 22, TQ: 0, LD: 0 }, rac: 0, waitlist: 20 },
  '2A': { quota: { GN: 80, TQ: 10, LD: 0 }, rac: 8, waitlist: 60 },
  '3A': { quota: { GN: 220, TQ: 30, LD: 6 }, rac: 20, waitlist: 150 },
  '3E': { quota: { GN: 140, TQ: 16, LD: 4 }, rac: 12, waitlist: 100 },
  SL: { quota: { GN: 480, TQ: 80, LD: 12 }, rac: 40, waitlist: 250 },
  CC: { quota: { GN: 270, TQ: 36, LD: 6 }, rac: 0, waitlist: 120 },
  EC: { quota: { GN: 50, TQ: 6, LD: 0 }, rac: 0, waitlist: 30 },
  '2S': { quota: { GN: 350, TQ: 40, LD: 10 }, rac: 0, waitlist: 200 },
};

function capacityFor(c: TrainClass, quota: TrainQuota) {
  const cap = CAPACITY[c];
  const seats = quota === 'GN' || quota === 'TQ' || quota === 'LD' ? cap.quota[quota] : 0;
  return {
    seats,
    rac: quota === 'GN' ? cap.rac : 0,
    waitlist: seats > 0 ? (quota === 'GN' ? cap.waitlist : Math.ceil(cap.waitlist / 5)) : 0,
  };
}

const WL_PREFIX: Record<TrainQuota, string> = {
  GN: 'GNWL',
  TQ: 'TQWL',
  LD: 'LDWL',
  SS: 'SSWL',
  PT: 'PQWL',
};

/**
 * Seats already sold before this demo's own bookings: demand rises closer to the date and at
 * weekends, so some classes run into RAC and waiting list. Deterministic per train/date/class.
 */
export function presoldCount(input: {
  trainNumber: string;
  runDate: string;
  travelClass: TrainClass;
  quota: TrainQuota;
  today: string;
}): number {
  const { seats, rac, waitlist } = capacityFor(input.travelClass, input.quota);
  if (seats === 0) return 0;
  const daysAhead = Math.max(0, daysBetweenIso(input.today, input.runDate));
  const weekend = isoWeekday(input.runDate) >= 5 ? 0.12 : 0;
  const closeness = daysAhead <= 3 ? 0.35 : daysAhead <= 10 ? 0.2 : daysAhead <= 30 ? 0.05 : -0.15;
  const noise = unitHash(
    `train-load:${input.trainNumber}:${input.runDate}:${input.travelClass}:${input.quota}`,
  );
  const ratio = Math.max(0.15, 0.45 + weekend + closeness + (noise - 0.5) * 0.7);
  return Math.min(seats + rac + waitlist + 5, Math.round(seats * ratio));
}

/** Status of the next seat after `sold` have been taken. */
export function availabilityAt(input: {
  travelClass: TrainClass;
  quota: TrainQuota;
  sold: number;
}): Pick<TrainAvailability, 'status' | 'count' | 'label'> {
  const { seats, rac, waitlist } = capacityFor(input.travelClass, input.quota);
  if (seats === 0) return { status: 'NOT_AVAILABLE', count: null, label: 'NOT AVAILABLE' };
  const sold = Math.max(0, input.sold);
  if (sold < seats) {
    const left = seats - sold;
    return { status: 'AVAILABLE', count: left, label: `AVL ${left}` };
  }
  if (sold < seats + rac) {
    const position = sold - seats + 1;
    return { status: 'RAC', count: position, label: `RAC ${position}` };
  }
  if (sold < seats + rac + waitlist) {
    const position = sold - seats - rac + 1;
    return { status: 'WAITLIST', count: position, label: `${WL_PREFIX[input.quota]} ${position}` };
  }
  return { status: 'REGRET', count: null, label: 'REGRET' };
}

/** Largest `sold` value a booking may reach (seats + RAC + waiting list). */
export function maxSellable(travelClass: TrainClass, quota: TrainQuota): number {
  const { seats, rac, waitlist } = capacityFor(travelClass, quota);
  return seats + rac + waitlist;
}

const COACH_PREFIX: Record<TrainClass, string> = {
  '1A': 'H',
  '2A': 'A',
  '3A': 'B',
  '3E': 'M',
  SL: 'S',
  CC: 'C',
  EC: 'E',
  '2S': 'D',
};
const PER_COACH: Record<TrainClass, number> = {
  '1A': 24,
  '2A': 46,
  '3A': 64,
  '3E': 80,
  SL: 72,
  CC: 78,
  EC: 56,
  '2S': 100,
};
const BERTH_CYCLE: Partial<Record<TrainClass, string[]>> = {
  '1A': ['LOWER', 'UPPER'],
  '2A': ['LOWER', 'UPPER', 'LOWER', 'UPPER', 'SIDE LOWER', 'SIDE UPPER'],
  '3A': ['LOWER', 'MIDDLE', 'UPPER', 'LOWER', 'MIDDLE', 'UPPER', 'SIDE LOWER', 'SIDE UPPER'],
  '3E': ['LOWER', 'MIDDLE', 'UPPER', 'LOWER', 'MIDDLE', 'UPPER', 'SIDE LOWER', 'SIDE UPPER'],
  SL: ['LOWER', 'MIDDLE', 'UPPER', 'LOWER', 'MIDDLE', 'UPPER', 'SIDE LOWER', 'SIDE UPPER'],
};

export interface AllocatedPassenger {
  status: 'CONFIRMED' | 'RAC' | 'WAITLIST';
  /** e.g. "CNF/B2/34/LOWER", "RAC 4", "GNWL 12" */
  label: string;
  coach: string | null;
  berth: string | null;
  berthType: string | null;
}

/**
 * Seats for `count` passengers when `sold` are already taken. Berth preference is not
 * guaranteed (as on Indian Railways, it is "subject to availability").
 */
export function allocateBerths(input: {
  travelClass: TrainClass;
  quota: TrainQuota;
  sold: number;
  count: number;
}): AllocatedPassenger[] {
  const { seats } = capacityFor(input.travelClass, input.quota);
  const result: AllocatedPassenger[] = [];
  for (let i = 0; i < input.count; i++) {
    const position = input.sold + i;
    const at = availabilityAt({
      travelClass: input.travelClass,
      quota: input.quota,
      sold: position,
    });
    if (at.status === 'AVAILABLE') {
      // Quota seats are spread over the class's coaches from the first one.
      const offset = input.quota === 'GN' ? 0 : input.quota === 'TQ' ? 5000 : 9000;
      const index = Math.min(position, seats - 1) + offset;
      const coach = `${COACH_PREFIX[input.travelClass]}${(Math.floor(index / PER_COACH[input.travelClass]) % 8) + 1}`;
      const berthNo = (index % PER_COACH[input.travelClass]) + 1;
      const cycle = BERTH_CYCLE[input.travelClass];
      const berthType = cycle
        ? (cycle[(berthNo - 1) % cycle.length] as string)
        : berthNo % 4 === 1 || berthNo % 4 === 0
          ? 'WINDOW'
          : 'AISLE';
      result.push({
        status: 'CONFIRMED',
        label: `CNF/${coach}/${berthNo}/${berthType}`,
        coach,
        berth: String(berthNo),
        berthType,
      });
    } else if (at.status === 'RAC') {
      result.push({ status: 'RAC', label: at.label, coach: null, berth: null, berthType: null });
    } else if (at.status === 'WAITLIST') {
      result.push({
        status: 'WAITLIST',
        label: at.label,
        coach: null,
        berth: null,
        berthType: null,
      });
    } else {
      break; // REGRET: the caller checks the length
    }
  }
  return result;
}

// ───────────────────────────── Rules ─────────────────────────────

/** Tatkal opens at 10:00 (AC) / 11:00 (non-AC) IST the day before the journey from the train's origin. */
export function tatkalOpensAt(runDate: string, travelClass: TrainClass): Date {
  return zonedTimeToUtc(
    addDaysIso(runDate, -1),
    AC_CLASSES.includes(travelClass) ? '10:00' : '11:00',
    RAIL_TZ,
  );
}

// ───────────────────────────── Offers ─────────────────────────────

export interface TrainOfferKey {
  number: string;
  /** Boarding date at `from` */
  date: string;
  from: string;
  to: string;
}

export const trainOfferId = (k: TrainOfferKey) =>
  `tr_${k.number}_${k.date.replaceAll('-', '')}_${k.from}_${k.to}`;

export function parseTrainOfferId(id: string): TrainOfferKey | null {
  const m = /^tr_(Z\d{4})_(\d{4})(\d{2})(\d{2})_([A-Z]{1,5})_([A-Z]{1,5})$/.exec(id);
  if (!m) return null;
  return {
    number: m[1] as string,
    date: `${m[2]}-${m[3]}-${m[4]}`,
    from: m[5] as string,
    to: m[6] as string,
  };
}

export interface TrainJourney {
  plan: TrainPlan;
  /** Date the train leaves its first station */
  runDate: string;
  /** Boarding date at `from` */
  date: string;
  stops: TrainStop[];
  departureAt: Date;
  arrivalAt: Date;
  distanceKm: number;
}

/** The journey between two stations on a date, or null if the train doesn't run it. */
export function trainJourney(
  plan: TrainPlan,
  from: string,
  to: string,
  date: string,
): TrainJourney | null {
  const route = trainRoute(plan);
  const i = route.findIndex((s) => s.code === from);
  const j = route.findIndex((s) => s.code === to);
  if (i < 0 || j <= i) return null;
  const a = route[i] as (typeof route)[number];
  const b = route[j] as (typeof route)[number];
  const runDate = addDaysIso(date, -(a.day - 1));
  if (!plan.daysOfWeek.includes(isoWeekday(runDate))) return null;
  const at = (minutes: number) => {
    const day = Math.floor(minutes / 1440);
    return zonedTimeToUtc(addDaysIso(runDate, day), hhmm(minutes % 1440), RAIL_TZ);
  };
  const departureAt = at(a.departMin as number);
  const arrivalAt = at(b.arriveMin as number);
  return {
    plan,
    runDate,
    date,
    stops: route.slice(i, j + 1).map(({ arriveMin: _a, departMin: _d, ...stop }) => stop),
    departureAt,
    arrivalAt,
    distanceKm: b.distanceKm - a.distanceKm,
  };
}

/** Weekdays the train leaves `from` (shifted from its origin days). */
function runningDaysAt(plan: TrainPlan, stopDay: number): number[] {
  return plan.daysOfWeek.map((d) => ((d - 1 + (stopDay - 1)) % 7) + 1).sort((x, y) => x - y);
}

/**
 * Availability of one class/quota for a journey, applying the booking window, Tatkal opening
 * time and the departure cut-off. `extraSold` is what this deployment has sold itself.
 */
export function journeyAvailability(input: {
  journey: TrainJourney;
  travelClass: TrainClass;
  quota: TrainQuota;
  extraSold: number;
  now: Date;
}): TrainAvailability {
  const { journey, travelClass, quota, now } = input;
  const checkedAt = now.toISOString();
  const closed = (label: string, note: string): TrainAvailability => ({
    status: 'BOOKING_CLOSED',
    count: null,
    label,
    bookable: false,
    note,
    checkedAt,
  });
  const today = localDate(now, RAIL_TZ);
  if (journey.departureAt.getTime() - now.getTime() < TRAIN_BOOKING_CUTOFF_MINUTES * 60_000) {
    return closed('CLOSED', 'Booking has closed for this departure.');
  }
  if (daysBetweenIso(today, journey.runDate) > TRAIN_ADVANCE_DAYS) {
    return closed('NOT OPEN', `Reservations open ${TRAIN_ADVANCE_DAYS} days before the journey.`);
  }
  if (quota === 'TQ') {
    if (!TATKAL[travelClass]) {
      return {
        status: 'NOT_AVAILABLE',
        count: null,
        label: 'NOT AVAILABLE',
        bookable: false,
        note: `Tatkal is not offered in this class.`,
        checkedAt,
      };
    }
    const opens = tatkalOpensAt(journey.runDate, travelClass);
    if (now < opens) {
      return closed(
        'TQ NOT OPEN',
        `Tatkal opens at ${AC_CLASSES.includes(travelClass) ? '10:00' : '11:00'} the day before the train leaves its first station.`,
      );
    }
  }
  const sold =
    presoldCount({
      trainNumber: journey.plan.number,
      runDate: journey.runDate,
      travelClass,
      quota,
      today,
    }) + input.extraSold;
  const at = availabilityAt({ travelClass, quota, sold });
  const bookable = at.status === 'AVAILABLE' || at.status === 'RAC' || at.status === 'WAITLIST';
  return {
    ...at,
    bookable,
    note:
      at.status === 'REGRET'
        ? 'No seats and the waiting list is full.'
        : at.status === 'NOT_AVAILABLE'
          ? 'This quota is not available in this class.'
          : null,
    checkedAt,
  };
}

/** A complete offer for a journey, with every class for the given quota. */
export function buildTrainOffer(input: {
  journey: TrainJourney;
  quota: TrainQuota;
  provider: string;
  now: Date;
  /** Seats this deployment has already sold for a class (local inventory). */
  extraSold: (travelClass: TrainClass) => number;
  /** Only this class, when set. */
  travelClass?: TrainClass | undefined;
}): TrainOffer {
  const { journey, quota } = input;
  const first = journey.stops[0] as TrainStop;
  const last = journey.stops.at(-1) as TrainStop;
  const classes: TrainClassOption[] = journey.plan.classes
    .filter((c) => !input.travelClass || c === input.travelClass)
    .map((travelClass) => ({
      travelClass,
      quota,
      availability: journeyAvailability({
        journey,
        travelClass,
        quota,
        extraSold: input.extraSold(travelClass),
        now: input.now,
      }),
      fare: trainFare({
        travelClass,
        distanceKm: journey.distanceKm,
        superfast: journey.plan.kind === 'Superfast',
        quota,
      }),
    }));
  return {
    id: trainOfferId({
      number: journey.plan.number,
      date: journey.date,
      from: first.code,
      to: last.code,
    }),
    provider: input.provider,
    trainNumber: journey.plan.number,
    trainName: journey.plan.name,
    trainType: journey.plan.kind,
    from: { code: first.code, name: first.name },
    to: { code: last.code, name: last.name },
    date: journey.date,
    departureAt: journey.departureAt.toISOString(),
    arrivalAt: journey.arrivalAt.toISOString(),
    durationMinutes: Math.round(
      (journey.arrivalAt.getTime() - journey.departureAt.getTime()) / 60_000,
    ),
    distanceKm: journey.distanceKm,
    runningDays: runningDaysAt(journey.plan, first.day),
    pantry: journey.plan.pantry,
    stops: journey.stops,
    classes,
  };
}

/** Every demo journey between two stations on a boarding date, in departure order. */
export function searchTrainJourneys(from: string, to: string, date: string): TrainJourney[] {
  return buildTrainTimetable()
    .map((plan) => trainJourney(plan, from, to, date))
    .filter((j): j is TrainJourney => j !== null)
    .sort((a, b) => a.departureAt.getTime() - b.departureAt.getTime());
}

// ───────────────────────────── Cancellation ─────────────────────────────

/** Flat cancellation charge per confirmed passenger, more than 48 hours before departure. */
const FLAT_CANCEL_PAISE: Record<TrainClass, number> = {
  '1A': 24_000,
  EC: 24_000,
  '2A': 20_000,
  '3A': 18_000,
  '3E': 18_000,
  CC: 18_000,
  SL: 12_000,
  '2S': 6_000,
};
/** Clerkage for RAC / waitlisted passengers. */
const CLERKAGE_PAISE = 6_000;

export const TRAIN_CANCELLATION_RULES = [
  'Confirmed tickets, more than 48 hours before departure: a flat charge per passenger (₹240 1A/EC, ₹200 2A, ₹180 3A/3E/CC, ₹120 SL, ₹60 2S).',
  'Confirmed tickets, 48 to 12 hours before departure: 25% of the fare (at least the flat charge).',
  'Confirmed tickets, 12 to 4 hours before departure: 50% of the fare (at least the flat charge).',
  'Confirmed tickets: no refund once the chart is prepared (4 hours before departure).',
  'RAC and waitlisted passengers: ₹60 per passenger, up to 30 minutes before departure.',
  'Confirmed Tatkal tickets: no refund.',
];

/** Charge for cancelling one passenger. `null` means cancellation is not possible now. */
export function trainCancellationCharge(input: {
  travelClass: TrainClass;
  quota: TrainQuota;
  status: 'CONFIRMED' | 'RAC' | 'WAITLIST';
  farePaise: number;
  departureAt: Date;
  now: Date;
}): { chargePaise: number } | { reason: string } {
  const minutesLeft = (input.departureAt.getTime() - input.now.getTime()) / 60_000;
  if (input.status !== 'CONFIRMED') {
    if (minutesLeft < 30)
      return {
        reason: 'RAC and waitlisted tickets can be cancelled until 30 minutes before departure.',
      };
    return { chargePaise: Math.min(input.farePaise, CLERKAGE_PAISE) };
  }
  if (minutesLeft < TRAIN_CHART_MINUTES)
    return { reason: 'Confirmed tickets cannot be cancelled online once the chart is prepared.' };
  if (input.quota === 'TQ') return { chargePaise: input.farePaise };
  const flat = FLAT_CANCEL_PAISE[input.travelClass];
  const hours = minutesLeft / 60;
  const percent = hours > 48 ? 0 : hours > 12 ? 25 : 50;
  const charge = Math.max(flat, roundTo((input.farePaise * percent) / 100, 100));
  return { chargePaise: Math.min(input.farePaise, charge) };
}
