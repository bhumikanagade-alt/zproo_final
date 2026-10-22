import { addDays, todayIso, type FlightSearch } from '@zproo/validation';

export const MAX_DAYS_AHEAD = 365;

export interface LegSpec {
  from: string;
  to: string;
  date: string;
}

/** The flights a search is for: a round trip is an outbound and a return flight. */
export function legSpecs(search: FlightSearch): LegSpec[] {
  const first = search.legs[0];
  if (search.tripType === 'ROUND_TRIP' && first) {
    return [first, { from: first.to, to: first.from, date: search.returnDate ?? first.date }];
  }
  return search.legs;
}

/** Earliest and latest date flight `index` can move to without breaking the date order. */
export function legDateBounds(search: FlightSearch, index: number): { min: string; max: string } {
  const today = todayIso();
  const last = addDays(today, MAX_DAYS_AHEAD);
  if (search.tripType === 'ROUND_TRIP') {
    return index === 0
      ? { min: today, max: last }
      : { min: search.legs[0]?.date ?? today, max: last };
  }
  return {
    min: search.legs[index - 1]?.date ?? today,
    max: search.legs[index + 1]?.date ?? last,
  };
}

/** The same search with flight `index` moved to `date` (a round trip's return follows the outbound). */
export function withLegDate(search: FlightSearch, index: number, date: string): FlightSearch {
  if (search.tripType === 'ROUND_TRIP') {
    if (index === 0) {
      const returnDate = search.returnDate && search.returnDate >= date ? search.returnDate : date;
      return { ...search, legs: search.legs.map((l) => ({ ...l, date })), returnDate };
    }
    return { ...search, returnDate: date };
  }
  return { ...search, legs: search.legs.map((l, i) => (i === index ? { ...l, date } : l)) };
}

/** Up to `size` consecutive dates around `centre`, kept inside [min, max]. */
export function stripDates(
  centre: string,
  min: string,
  max: string,
  size = 7,
  shift = 0,
): string[] {
  const span = Math.max(1, Math.round((Date.parse(max) - Date.parse(min)) / 86_400_000) + 1);
  const count = Math.min(size, span);
  const earliest = Date.parse(min);
  const latestStart = Date.parse(max) - (count - 1) * 86_400_000;
  const wanted = Date.parse(addDays(centre, -Math.floor(size / 2) + shift));
  const start = Math.min(Math.max(wanted, earliest), Math.max(earliest, latestStart));
  const first = new Date(start).toISOString().slice(0, 10);
  return Array.from({ length: count }, (_, i) => addDays(first, i));
}
