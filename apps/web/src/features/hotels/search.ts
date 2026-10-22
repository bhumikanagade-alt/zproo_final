import { addDays, diffNights, isIsoDate, todayIso } from './dates';
import {
  MAX_ROOMS,
  decodeLayout,
  distributeGuests,
  encodeLayout,
  normaliseChildAges,
  parseChildAges,
  totalAdults,
  totalChildren,
  validateOccupancy,
  type RoomOccupancy,
} from './occupancy';

export const MAX_STAY_NIGHTS = 30;
export const DEFAULT_LEAD_DAYS = 7;
export const DEFAULT_STAY_NIGHTS = 2;

export interface HotelSearchInput {
  /** What the guest typed or picked: a city code, city, area, hotel or landmark. */
  query: string;
  checkIn: string;
  checkOut: string;
  occupancy: RoomOccupancy[];
}

export interface HotelSearchState extends HotelSearchInput {
  nights: number;
  rooms: number;
  adults: number;
  children: number;
  childAges: number[];
}

export interface SearchIssue {
  field: 'query' | 'checkIn' | 'checkOut' | 'occupancy';
  message: string;
}

const toState = (input: HotelSearchInput): HotelSearchState => {
  const nights = isIsoDate(input.checkIn) && isIsoDate(input.checkOut)
    ? Math.max(1, diffNights(input.checkIn, input.checkOut))
    : 1;
  return {
    ...input,
    nights,
    rooms: input.occupancy.length,
    adults: totalAdults(input.occupancy),
    children: totalChildren(input.occupancy),
    childAges: input.occupancy.flatMap((room) => room.childAges),
  };
};

const intParam = (value: string | null, fallback: number, min: number, max: number) => {
  if (value === null || !/^\d+$/.test(value)) return fallback;
  return Math.min(max, Math.max(min, Number(value)));
};

/**
 * Reads a results-page URL. It is forgiving (missing or broken values fall back to sensible
 * defaults) so a hand-edited link never crashes the page; `validateHotelSearch` reports problems.
 * Supports the original params (city, checkIn, checkOut, rooms, adults, children) plus
 * `childAges` ("7,5") and `layout` (explicit per-room occupancy).
 */
export function parseHotelSearch(params: URLSearchParams, today: string = todayIso()): HotelSearchState {
  const query = (params.get('city') ?? params.get('q') ?? '').trim();
  const rawIn = params.get('checkIn');
  const rawOut = params.get('checkOut');
  const checkIn = isIsoDate(rawIn) ? rawIn : addDays(today, DEFAULT_LEAD_DAYS);
  const checkOut = isIsoDate(rawOut) ? rawOut : addDays(checkIn, DEFAULT_STAY_NIGHTS);

  const layout = decodeLayout(params.get('layout'));
  if (layout && validateOccupancy(layout).length === 0) {
    return toState({ query, checkIn, checkOut, occupancy: layout });
  }

  const rooms = intParam(params.get('rooms'), 1, 1, MAX_ROOMS);
  const adults = intParam(params.get('adults'), 2, 1, 32);
  const children = intParam(params.get('children'), 0, 0, 16);
  const childAges = normaliseChildAges(parseChildAges(params.get('childAges')), children);
  return toState({
    query,
    checkIn,
    checkOut,
    occupancy: distributeGuests(rooms, adults, childAges),
  });
}

/** Everything wrong with a search, in field order. An empty array means the search can run. */
export function validateHotelSearch(
  input: HotelSearchInput,
  today: string = todayIso(),
): SearchIssue[] {
  const issues: SearchIssue[] = [];
  if (!input.query.trim()) {
    issues.push({ field: 'query', message: 'Enter a city, area, hotel or landmark.' });
  }
  if (!isIsoDate(input.checkIn)) {
    issues.push({ field: 'checkIn', message: 'Choose a check-in date.' });
  } else if (input.checkIn < today) {
    issues.push({ field: 'checkIn', message: "Check-in can't be in the past." });
  }
  if (!isIsoDate(input.checkOut)) {
    issues.push({ field: 'checkOut', message: 'Choose a check-out date.' });
  } else if (isIsoDate(input.checkIn)) {
    const nights = diffNights(input.checkIn, input.checkOut);
    if (nights < 1) issues.push({ field: 'checkOut', message: 'Check-out must be after check-in.' });
    else if (nights > MAX_STAY_NIGHTS)
      issues.push({
        field: 'checkOut',
        message: `Stays can be up to ${MAX_STAY_NIGHTS} nights.`,
      });
  }
  for (const issue of validateOccupancy(input.occupancy)) {
    issues.push({ field: 'occupancy', message: issue.message });
  }
  return issues;
}

/** Builds a results URL that round-trips through `parseHotelSearch`. */
export function buildResultsUrl(input: HotelSearchInput): string {
  const occupancy = input.occupancy;
  const adults = totalAdults(occupancy);
  const children = totalChildren(occupancy);
  const sp = new URLSearchParams();
  sp.set('city', input.query.trim());
  sp.set('checkIn', input.checkIn);
  sp.set('checkOut', input.checkOut);
  sp.set('rooms', String(occupancy.length));
  sp.set('adults', String(adults));
  if (children > 0) sp.set('children', String(children));
  const even = encodeLayout(distributeGuests(occupancy.length, adults, occupancy.flatMap((r) => r.childAges)));
  const exact = encodeLayout(occupancy);
  // Only store the explicit layout when it differs from the automatic split.
  if (exact !== even) sp.set('layout', exact);
  else if (children > 0) sp.set('childAges', occupancy.flatMap((r) => r.childAges).join(','));
  return `/hotels/results?${sp.toString()}`;
}

/** Query string (no leading "?") that carries the stay to details / rooms pages. */
export function stayQuery(input: HotelSearchInput): string {
  const url = buildResultsUrl(input);
  return url.slice(url.indexOf('?') + 1);
}
