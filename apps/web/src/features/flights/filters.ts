import type { FlightOffer } from '@zproo/types';
import { localHour } from './format';

export const TIME_BANDS = [
  { id: 'EARLY', label: 'Before 6 AM', from: 0, to: 6 },
  { id: 'MORNING', label: '6 AM – 12 PM', from: 6, to: 12 },
  { id: 'AFTERNOON', label: '12 PM – 6 PM', from: 12, to: 18 },
  { id: 'NIGHT', label: 'After 6 PM', from: 18, to: 24 },
] as const;
export type TimeBand = (typeof TIME_BANDS)[number]['id'];

export const SORTS = [
  { id: 'BEST', label: 'Recommended' },
  { id: 'PRICE', label: 'Cheapest' },
  { id: 'DURATION', label: 'Fastest' },
  { id: 'DEPARTURE', label: 'Earliest Departure' },
  { id: 'LATE_DEPARTURE', label: 'Latest Departure' },
] as const;
export type SortId = (typeof SORTS)[number]['id'] | 'ARRIVAL';

export interface FlightFilters {
  /** Upper price limit for the searched passengers, or null for no limit. */
  maxPricePaise: number | null;
  /** Allowed stop counts; 2 means "2 or more". Empty = any. */
  stops: number[];
  airlines: string[];
  departure: TimeBand[];
  arrival: TimeBand[];
  refundableOnly: boolean;
  nonRefundableOnly: boolean;
  /** Longest journey allowed, in minutes, or null for no limit. */
  maxDurationMinutes: number | null;
  /** Airport codes; empty = any. */
  departureAirports: string[];
  arrivalAirports: string[];
  /** Allowed cabin / checked baggage (kg) per adult; null = any, [] = nothing matches. */
  cabinBag: number[] | null;
  checkedBag: number[] | null;
}

export const EMPTY_FILTERS: FlightFilters = {
  maxPricePaise: null,
  stops: [],
  airlines: [],
  departure: [],
  arrival: [],
  refundableOnly: false,
  nonRefundableOnly: false,
  maxDurationMinutes: null,
  departureAirports: [],
  arrivalAirports: [],
  cabinBag: null,
  checkedBag: null,
};

export function activeFilterCount(f: FlightFilters): number {
  return (
    (f.maxPricePaise === null ? 0 : 1) +
    f.stops.length +
    f.airlines.length +
    f.departure.length +
    f.arrival.length +
    (f.refundableOnly ? 1 : 0) +
    (f.nonRefundableOnly ? 1 : 0) +
    (f.maxDurationMinutes === null ? 0 : 1) +
    f.departureAirports.length +
    f.arrivalAirports.length +
    (f.cabinBag === null ? 0 : 1) +
    (f.checkedBag === null ? 0 : 1)
  );
}

const inBands = (hour: number, bands: TimeBand[]) =>
  bands.length === 0 ||
  TIME_BANDS.some((b) => bands.includes(b.id) && hour >= b.from && hour < b.to);

export function applyFilters(offers: FlightOffer[], f: FlightFilters): FlightOffer[] {
  return offers.filter(
    (o) =>
      (f.maxPricePaise === null || o.totalPaise <= f.maxPricePaise) &&
      (f.stops.length === 0 || f.stops.includes(Math.min(o.stops, 2))) &&
      (f.airlines.length === 0 || f.airlines.includes(o.airline.code)) &&
      inBands(localHour(o.departureAt, o.from.timezone), f.departure) &&
      inBands(localHour(o.arrivalAt, o.to.timezone), f.arrival) &&
      (!f.refundableOnly || o.refundable) &&
      (!f.nonRefundableOnly || !o.refundable) &&
      (f.maxDurationMinutes === null || o.durationMinutes <= f.maxDurationMinutes) &&
      (f.departureAirports.length === 0 || f.departureAirports.includes(o.from.code)) &&
      (f.arrivalAirports.length === 0 || f.arrivalAirports.includes(o.to.code)) &&
      (f.cabinBag === null || f.cabinBag.includes(o.baggage.cabinKg)) &&
      (f.checkedBag === null || f.checkedBag.includes(o.baggage.checkInKg)),
  );
}

/**
 * "Best" balances price and journey time: each offer is scored relative to the cheapest and the
 * fastest in the list (an hour of extra travel weighs like ~10% on price).
 */
function bestScore(o: FlightOffer, minPrice: number, minDuration: number): number {
  return o.totalPaise / minPrice + ((o.durationMinutes - minDuration) / 60) * 0.1;
}

export function sortOffers(offers: FlightOffer[], sort: SortId): FlightOffer[] {
  const list = [...offers];
  const by = (key: (o: FlightOffer) => number) =>
    list.sort((a, b) => key(a) - key(b) || a.totalPaise - b.totalPaise);
  switch (sort) {
    case 'PRICE':
      return by((o) => o.totalPaise);
    case 'DURATION':
      return by((o) => o.durationMinutes);
    case 'DEPARTURE':
      return by((o) => Date.parse(o.departureAt));
    case 'LATE_DEPARTURE':
      return by((o) => -Date.parse(o.departureAt));
    case 'ARRIVAL':
      return by((o) => Date.parse(o.arrivalAt));
    case 'BEST': {
      const minPrice = Math.min(...list.map((o) => o.totalPaise));
      const minDuration = Math.min(...list.map((o) => o.durationMinutes));
      return by((o) => bestScore(o, minPrice, minDuration));
    }
  }
}

export interface FilterFacets {
  minPricePaise: number;
  maxPricePaise: number;
  airlines: { code: string; name: string; count: number; fromPaise: number }[];
  stops: { stops: number; count: number; fromPaise: number }[];
  minDurationMinutes: number;
  maxDurationMinutes: number;
  departureAirports: { code: string; city: string; count: number }[];
  arrivalAirports: { code: string; city: string; count: number }[];
  /** Distinct baggage allowances (kg) the results actually offer, ascending. */
  cabinBagKgs: number[];
  checkedBagKgs: number[];
}

/** Options and ranges for the filter panel, from the unfiltered results. */
export function facets(offers: FlightOffer[]): FilterFacets {
  const airlines = new Map<string, FilterFacets['airlines'][number]>();
  const stops = new Map<number, FilterFacets['stops'][number]>();
  for (const o of offers) {
    const a = airlines.get(o.airline.code) ?? {
      code: o.airline.code,
      name: o.airline.name,
      count: 0,
      fromPaise: Infinity,
    };
    a.count += 1;
    a.fromPaise = Math.min(a.fromPaise, o.totalPaise);
    airlines.set(a.code, a);
    const key = Math.min(o.stops, 2);
    const s = stops.get(key) ?? { stops: key, count: 0, fromPaise: Infinity };
    s.count += 1;
    s.fromPaise = Math.min(s.fromPaise, o.totalPaise);
    stops.set(key, s);
  }
  const prices = offers.map((o) => o.totalPaise);
  const durations = offers.map((o) => o.durationMinutes);
  const airports = (pick: (o: FlightOffer) => FlightOffer['from']) => {
    const map = new Map<string, { code: string; city: string; count: number }>();
    for (const o of offers) {
      const a = pick(o);
      const entry = map.get(a.code) ?? { code: a.code, city: a.city, count: 0 };
      entry.count += 1;
      map.set(a.code, entry);
    }
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
  };
  const distinct = (pick: (o: FlightOffer) => number) =>
    [...new Set(offers.map(pick))].sort((a, b) => a - b);
  return {
    minPricePaise: prices.length ? Math.min(...prices) : 0,
    maxPricePaise: prices.length ? Math.max(...prices) : 0,
    airlines: [...airlines.values()].sort((a, b) => a.fromPaise - b.fromPaise),
    stops: [...stops.values()].sort((a, b) => a.stops - b.stops),
    minDurationMinutes: durations.length ? Math.min(...durations) : 0,
    maxDurationMinutes: durations.length ? Math.max(...durations) : 0,
    departureAirports: airports((o) => o.from),
    arrivalAirports: airports((o) => o.to),
    cabinBagKgs: distinct((o) => o.baggage.cabinKg),
    checkedBagKgs: distinct((o) => o.baggage.checkInKg),
  };
}

/**
 * Filters a search starts with: the baggage chosen in the search narrows the results to flights
 * offering at least that much (a search for "No Bag" asks for nothing). The traveller can clear it.
 */
export function baselineFilters(
  f: FilterFacets,
  wanted: { cabinBagKg?: number | undefined; checkedBagKg?: number | undefined },
): FlightFilters {
  const atLeast = (available: number[], min: number | undefined) =>
    min === undefined || min === 0 ? null : available.filter((kg) => kg >= min);
  return {
    ...EMPTY_FILTERS,
    cabinBag: atLeast(f.cabinBagKgs, wanted.cabinBagKg),
    checkedBag: atLeast(f.checkedBagKgs, wanted.checkedBagKg),
  };
}
