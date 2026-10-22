import { findAirport, findCity, findStation } from '@zproo/config';
import { CabinClass, TrainClass, TrainQuota, TripType } from '@zproo/types';
import { z } from 'zod';
import { isoDateSchema } from './common';

/** Today's date as YYYY-MM-DD in the user's local time zone (dates are travel dates, not instants). */
export function todayIso(now: Date = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Bookings open up to a year ahead (typical for airlines and hotels). */
const MAX_DAYS_AHEAD = 365;

const travelDate = (label: string) =>
  isoDateSchema
    .refine((d) => d >= todayIso(), `${label} can't be in the past`)
    .refine((d) => daysBetween(todayIso(), d) <= MAX_DAYS_AHEAD, `${label} must be within a year`);

const count = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

const airportCode = z
  .string()
  .trim()
  .toUpperCase()
  .refine((code) => Boolean(findAirport(code)), 'Choose an airport from the list');
const cityCode = z
  .string()
  .trim()
  .toLowerCase()
  .refine((code) => Boolean(findCity(code)), 'Choose a city from the list');
const stationCode = z
  .string()
  .trim()
  .toUpperCase()
  .refine((code) => Boolean(findStation(code)), 'Choose a station from the list');

// ───────────────────────────── Flights ─────────────────────────────

/** Baggage allowances (kg) a traveller can ask for in the flight search; 0 means no bag. */
export const CABIN_BAG_OPTIONS_KG = [0, 7, 10, 12] as const;
export const CHECKED_BAG_OPTIONS_KG = [0, 15, 20, 25, 30] as const;

const baggageKg = (allowed: readonly number[]) =>
  z.coerce
    .number()
    .int()
    .refine((kg) => allowed.includes(kg), 'Choose one of the listed baggage options')
    .optional();

export const flightLegSchema = z.object({
  from: airportCode,
  to: airportCode,
  date: travelDate('Departure date'),
});

export const flightSearchSchema = z
  .object({
    tripType: z.enum(Object.values(TripType) as [TripType, ...TripType[]]),
    legs: z.array(flightLegSchema).min(1).max(5),
    returnDate: travelDate('Return date').optional(),
    adults: count(1, 9),
    children: count(0, 8).default(0),
    infants: count(0, 9).default(0),
    cabin: z.enum(Object.values(CabinClass) as [CabinClass, ...CabinClass[]]).default('ECONOMY'),
    /** Baggage the traveller wants; undefined = no preference, 0 = no bag. */
    cabinBagKg: baggageKg(CABIN_BAG_OPTIONS_KG),
    checkedBagKg: baggageKg(CHECKED_BAG_OPTIONS_KG),
  })
  .superRefine((search, ctx) => {
    search.legs.forEach((leg, i) => {
      if (leg.from === leg.to) {
        ctx.addIssue({
          code: 'custom',
          path: ['legs', i, 'to'],
          message: 'From and To must be different',
        });
      }
      const previous = search.legs[i - 1];
      if (previous && leg.date < previous.date) {
        ctx.addIssue({
          code: 'custom',
          path: ['legs', i, 'date'],
          message: 'Flights must be in date order',
        });
      }
    });
    if (search.tripType !== 'MULTI_CITY' && search.legs.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['legs'],
        message: 'Add one flight for one-way or round trips',
      });
    }
    if (search.tripType === 'MULTI_CITY' && search.legs.length < 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['legs'],
        message: 'Add at least two flights for a multi-city trip',
      });
    }
    if (search.tripType === 'ROUND_TRIP') {
      const first = search.legs[0];
      if (!search.returnDate) {
        ctx.addIssue({ code: 'custom', path: ['returnDate'], message: 'Choose a return date' });
      } else if (first && search.returnDate < first.date) {
        ctx.addIssue({
          code: 'custom',
          path: ['returnDate'],
          message: 'Return must be on or after departure',
        });
      }
    }
    if (search.adults + search.children > 9) {
      ctx.addIssue({
        code: 'custom',
        path: ['children'],
        message: 'Up to 9 travellers per booking (excluding infants)',
      });
    }
    if (search.infants > search.adults) {
      ctx.addIssue({
        code: 'custom',
        path: ['infants'],
        message: 'Each infant must travel with an adult',
      });
    }
  });
export type FlightSearch = z.output<typeof flightSearchSchema>;

// ───────────────────────────── Ground transport ─────────────────────────────

export const busSearchSchema = z
  .object({ from: cityCode, to: cityCode, date: travelDate('Travel date') })
  .refine((s) => s.from !== s.to, { path: ['to'], message: 'From and To must be different' });
export type BusSearch = z.output<typeof busSearchSchema>;

/** Most passengers on one train ticket (PNR); Tatkal allows fewer (see TRAIN_MAX_TATKAL_PASSENGERS). */
export const TRAIN_MAX_PASSENGERS = 6;
export const TRAIN_MAX_TATKAL_PASSENGERS = 4;
/** How far ahead the search form lets people look (the provider says when booking opens). */
export const TRAIN_SEARCH_MAX_DAYS = 120;

export const trainClassSchema = z.enum(Object.values(TrainClass) as [TrainClass, ...TrainClass[]], {
  message: 'Choose a travel class',
});
export const trainQuotaSchema = z.enum(Object.values(TrainQuota) as [TrainQuota, ...TrainQuota[]], {
  message: 'Choose a quota',
});

export const trainSearchSchema = z
  .object({
    from: stationCode,
    to: stationCode,
    date: travelDate('Journey date').refine(
      (d) => daysBetween(todayIso(), d) <= TRAIN_SEARCH_MAX_DAYS,
      `Journey date must be within ${TRAIN_SEARCH_MAX_DAYS} days`,
    ),
    travelClass: z.enum([...(Object.values(TrainClass) as [TrainClass, ...TrainClass[]]), 'ALL']).default('ALL'),
    quota: trainQuotaSchema.default('GN'),
    passengers: count(1, TRAIN_MAX_PASSENGERS).default(1),
  })
  .superRefine((s, ctx) => {
    if (s.from === s.to) {
      ctx.addIssue({ code: 'custom', path: ['to'], message: 'From and To must be different' });
    }
    if (s.quota === 'TQ' && s.passengers > TRAIN_MAX_TATKAL_PASSENGERS) {
      ctx.addIssue({
        code: 'custom',
        path: ['passengers'],
        message: `Tatkal tickets allow up to ${TRAIN_MAX_TATKAL_PASSENGERS} passengers`,
      });
    }
  });
export type TrainSearch = z.output<typeof trainSearchSchema>;

/** Live running status: train numbers are 3–6 letters or digits (usually 5 digits). */
export const TRAIN_NUMBER_PATTERN = /^[A-Z0-9]{3,6}$/;
/** Running status exists for trains that ran up to 2 days ago or run up to 1 day from now. */
export const LIVE_STATUS_PAST_DAYS = 2;
export const LIVE_STATUS_FUTURE_DAYS = 1;

export const trainNumberSchema = z
  .string({ message: 'Enter a train number, e.g. 12123' })
  .trim()
  .toUpperCase()
  .min(1, 'Enter a train number, e.g. 12123')
  .regex(TRAIN_NUMBER_PATTERN, 'Train number is 3 to 6 letters or digits, e.g. 12123')
  .refine((v) => !/^(.)\1+$/.test(v), 'Enter a valid train number');

export const liveStatusSchema = z.object({
  train: trainNumberSchema,
  date: isoDateSchema
    .refine(
      (d) => daysBetween(todayIso(), d) >= -LIVE_STATUS_PAST_DAYS,
      `Live status is only available for the last ${LIVE_STATUS_PAST_DAYS} days`,
    )
    .refine(
      (d) => daysBetween(todayIso(), d) <= LIVE_STATUS_FUTURE_DAYS,
      'Live status is only available up to tomorrow',
    ),
});
export type LiveStatusInput = z.output<typeof liveStatusSchema>;

const place = (label: string) =>
  z
    .string()
    .trim()
    .min(3, `Enter a ${label}`)
    .max(200, `${label[0]?.toUpperCase()}${label.slice(1)} is too long`);

export const cabSearchSchema = z
  .object({
    pickup: place('pickup location'),
    drop: place('drop location'),
    when: z.enum(['NOW', 'LATER']).default('NOW'),
    date: travelDate('Pickup date').optional(),
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM')
      .optional(),
  })
  .superRefine((s, ctx) => {
    if (s.when === 'LATER' && (!s.date || !s.time)) {
      ctx.addIssue({
        code: 'custom',
        path: [s.date ? 'time' : 'date'],
        message: 'Choose when to be picked up',
      });
    }
  });
export type CabSearch = z.output<typeof cabSearchSchema>;

export const bikeSearchSchema = z.object({
  pickup: place('pickup location'),
  drop: place('drop location'),
});
export type BikeSearch = z.output<typeof bikeSearchSchema>;

// ───────────────────────────── Stays & packages ─────────────────────────────

export const hotelSearchSchema = z
  .object({
    city: cityCode,
    checkIn: travelDate('Check-in'),
    checkOut: isoDateSchema,
    rooms: count(1, 8),
    adults: count(1, 24),
    children: count(0, 12).default(0),
  })
  .superRefine((s, ctx) => {
    const nights = daysBetween(s.checkIn, s.checkOut);
    if (nights < 1)
      ctx.addIssue({
        code: 'custom',
        path: ['checkOut'],
        message: 'Check-out must be after check-in',
      });
    if (nights > 30)
      ctx.addIssue({ code: 'custom', path: ['checkOut'], message: 'Stays can be up to 30 nights' });
    if (s.adults < s.rooms)
      ctx.addIssue({
        code: 'custom',
        path: ['adults'],
        message: 'Each room needs at least one adult',
      });
    if (s.adults + s.children > s.rooms * 4) {
      ctx.addIssue({
        code: 'custom',
        path: ['rooms'],
        message: 'Up to 4 guests per room — add a room',
      });
    }
  });
export type HotelSearch = z.output<typeof hotelSearchSchema>;

export const HOLIDAY_CATEGORIES = [
  'DOMESTIC',
  'INTERNATIONAL',
  'HONEYMOON',
  'FAMILY',
  'ADVENTURE',
  'LUXURY',
  'WEEKEND',
] as const;
export type HolidayCategory = (typeof HOLIDAY_CATEGORIES)[number];

export const holidaySearchSchema = z.object({
  destination: z.string().trim().max(80).optional(),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Choose a month')
    .refine((m) => m >= todayIso().slice(0, 7), "Month can't be in the past")
    .optional(),
  travellers: count(1, 20).default(2),
  category: z.enum(HOLIDAY_CATEGORIES).optional(),
});
export type HolidaySearch = z.output<typeof holidaySearchSchema>;

// ───────────────────────────── Parcel ─────────────────────────────

const pincode = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^[1-9]\d{5}$/, `Enter a valid 6-digit ${label} PIN code`);

export const parcelQuoteSchema = z.object({
  fromPincode: pincode('pickup'),
  toPincode: pincode('delivery'),
  weightKg: z.coerce.number().positive('Enter the weight').max(50, 'Up to 50 kg per parcel'),
});
export type ParcelQuote = z.output<typeof parcelQuoteSchema>;

// ───────────────────────────── URL / query parsing ─────────────────────────────

/**
 * Links in prerendered pages (deals, popular routes) can't contain a date — it would be frozen at
 * build time — so they omit it and these defaults apply.
 */
export const DEFAULT_LEAD_DAYS = { flight: 14, bus: 1, train: 3, hotel: 7 } as const;

/**
 * Raw flight search input from URL query parameters (web result pages and GET /api/flights/search):
 * one way / round trip use from, to, date, return; multi-city uses legs=PNQ.DEL.2026-10-25,….
 * The result still has to go through `flightSearchSchema`.
 */
export function flightSearchInputFromParams(params: { get(name: string): string | null }) {
  const tripType = params.get('trip') ?? 'ONE_WAY';
  const legs =
    tripType === 'MULTI_CITY'
      ? (params.get('legs') ?? '')
          .split(',')
          .filter(Boolean)
          .map((leg) => {
            const [from = '', to = '', date = ''] = leg.split('.');
            return { from, to, date };
          })
      : [
          {
            from: params.get('from') ?? '',
            to: params.get('to') ?? '',
            date: params.get('date') ?? addDays(todayIso(), DEFAULT_LEAD_DAYS.flight),
          },
        ];
  return {
    tripType,
    legs,
    returnDate: params.get('return') ?? undefined,
    adults: params.get('adults') ?? '1',
    children: params.get('children') ?? '0',
    infants: params.get('infants') ?? '0',
    cabin: params.get('cabin') ?? 'ECONOMY',
    cabinBagKg: params.get('cabinBag') || undefined,
    checkedBagKg: params.get('checkedBag') || undefined,
  };
}

/** Raw bus search input from URL query parameters (web results page and GET /api/buses/search). */
export function busSearchInputFromParams(params: { get(name: string): string | null }) {
  return {
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    date: params.get('date') ?? addDays(todayIso(), DEFAULT_LEAD_DAYS.bus),
  };
}

/** Raw train search input from URL query parameters (web results page and GET /api/trains/search). */
export function trainSearchInputFromParams(params: { get(name: string): string | null }) {
  return {
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    date: params.get('date') ?? addDays(todayIso(), DEFAULT_LEAD_DAYS.train),
    travelClass: params.get('class') || 'ALL',
    quota: params.get('quota') || 'GN',
    passengers: params.get('passengers') || '1',
  };
}
