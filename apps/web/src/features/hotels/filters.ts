import {
  HOTEL_DATA,
  LOCATION_TAG_LABEL,
  MEAL_PLAN_SHORT,
  type Hotel,
  type HotelAmenity,
  type HotelRoom,
  type LocationTag,
  type MealPlan,
  type PropertyType,
} from './data';
import { distanceFromDestination, matchesDestination } from './suggest';
import {
  beachDistanceKm,
  hasFrontDesk24,
  hotelHasBedType,
  isCoupleFriendly,
  type BedType,
} from './extras';
import { largestRoom, type RoomOccupancy } from './occupancy';
import { priceStay, type PriceBreakdown } from './pricing';

export type GuestRatingMin = 6 | 7 | 8;

export interface HotelFilters {
  /** Per-night room price range in paise (before taxes). null = open ended. */
  minPricePaise: number | null;
  maxPricePaise: number | null;
  stars: number[];
  guestRatingMin: GuestRatingMin | null;
  propertyTypes: PropertyType[];
  amenities: HotelAmenity[];
  freeCancellation: boolean;
  payAtProperty: boolean;
  /** Reserve without paying now: pay-at-property rooms that are also free to cancel. */
  noPrepayment: boolean;
  mealPlan: MealPlan | null;
  locations: LocationTag[];
  /** Max distance (km) from the main point of interest shown on the card. null = any. */
  maxDistanceKm: number | null;
  /** Max distance (km) to the beach / water. Hotels with no beach are excluded when set. */
  maxBeachKm: number | null;
  bedTypes: BedType[];
  coupleFriendly: boolean;
  frontDesk24: boolean;
}

export const DEFAULT_FILTERS: HotelFilters = {
  minPricePaise: null,
  maxPricePaise: null,
  stars: [],
  guestRatingMin: null,
  propertyTypes: [],
  amenities: [],
  freeCancellation: false,
  payAtProperty: false,
  noPrepayment: false,
  mealPlan: null,
  locations: [],
  maxDistanceKm: null,
  maxBeachKm: null,
  bedTypes: [],
  coupleFriendly: false,
  frontDesk24: false,
};

export type HotelSort =
  | 'recommended'
  | 'price-asc'
  | 'price-desc'
  | 'rating'
  | 'stars'
  | 'distance'
  | 'popularity';

export const SORT_OPTIONS: readonly { value: HotelSort; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Guest Rating' },
  { value: 'stars', label: 'Star Rating' },
  { value: 'distance', label: 'Distance' },
  { value: 'popularity', label: 'Popularity' },
];

export const isHotelSort = (value: string): value is HotelSort =>
  SORT_OPTIONS.some((option) => option.value === value);

/** Guest score on a 10-point scale (catalog ratings are out of 5). */
export const guestScore = (hotel: Pick<Hotel, 'rating'>): number => Math.round(hotel.rating * 20) / 10;

export function scoreLabel(score: number): string {
  if (score >= 9) return 'Exceptional';
  if (score >= 8) return 'Excellent';
  if (score >= 7) return 'Very good';
  if (score >= 6) return 'Good';
  return 'Fair';
}

/** Can this room type host every room of the searched layout? */
export function roomFitsOccupancy(
  room: HotelRoom,
  occupancy: readonly RoomOccupancy[],
): boolean {
  if (occupancy.length === 0) return true;
  const biggest = largestRoom(occupancy);
  return (
    room.roomsLeft >= occupancy.length &&
    biggest.adults <= room.maxAdults &&
    biggest.children <= room.maxChildren &&
    biggest.guests <= room.guests
  );
}

/** Why a room can't be booked for this search (null when it can). */
export function roomBlockReason(
  room: HotelRoom,
  occupancy: readonly RoomOccupancy[],
): string | null {
  if (occupancy.length === 0) return null;
  if (room.roomsLeft < occupancy.length)
    return `Only ${room.roomsLeft} room${room.roomsLeft === 1 ? '' : 's'} left, you searched for ${occupancy.length}.`;
  const biggest = largestRoom(occupancy);
  if (biggest.adults > room.maxAdults)
    return `Fits up to ${room.maxAdults} adult${room.maxAdults === 1 ? '' : 's'} per room.`;
  if (biggest.children > room.maxChildren)
    return room.maxChildren === 0
      ? 'Not available for children in this room type.'
      : `Fits up to ${room.maxChildren} child${room.maxChildren === 1 ? '' : 'ren'} per room.`;
  if (biggest.guests > room.guests) return `Fits up to ${room.guests} guests per room.`;
  return null;
}

/** Does a single room satisfy the room-level filters (price, meal, policies)? */
export function roomMatches(room: HotelRoom, filters: HotelFilters): boolean {
  if (filters.minPricePaise !== null && room.pricePerNightPaise < filters.minPricePaise) return false;
  if (filters.maxPricePaise !== null && room.pricePerNightPaise > filters.maxPricePaise) return false;
  if (filters.mealPlan && room.mealPlan !== filters.mealPlan) return false;
  if (filters.freeCancellation && !room.refundable) return false;
  if (filters.payAtProperty && !room.payAtProperty) return false;
  if (filters.noPrepayment && !(room.payAtProperty && room.refundable)) return false;
  return true;
}

/** Does the hotel itself satisfy the hotel-level filters? */
export function hotelMatches(hotel: Hotel, filters: HotelFilters): boolean {
  if (filters.stars.length && !filters.stars.includes(hotel.stars)) return false;
  if (filters.guestRatingMin !== null && guestScore(hotel) < filters.guestRatingMin) return false;
  if (filters.propertyTypes.length && !filters.propertyTypes.includes(hotel.propertyType)) return false;
  if (filters.amenities.some((a) => !hotel.amenities.includes(a))) return false;
  if (filters.locations.length && !filters.locations.some((l) => hotel.locationTags.includes(l))) return false;
  if (filters.maxDistanceKm !== null && hotel.distanceKm > filters.maxDistanceKm) return false;
  if (filters.maxBeachKm !== null) {
    const beach = beachDistanceKm(hotel);
    if (beach === null || beach > filters.maxBeachKm) return false;
  }
  if (filters.bedTypes.length && !filters.bedTypes.some((b) => hotelHasBedType(hotel, b))) return false;
  if (filters.coupleFriendly && !isCoupleFriendly(hotel)) return false;
  if (filters.frontDesk24 && !hasFrontDesk24(hotel)) return false;
  return true;
}

export interface HotelResult {
  hotel: Hotel;
  /** Rooms that fit the search and pass the room-level filters, cheapest first. */
  rooms: HotelRoom[];
  /** The cheapest matching room, the one the card quotes. */
  bestRoom: HotelRoom;
  price: PriceBreakdown;
  distanceKm: number;
}

export interface SearchContext {
  query: string;
  nights: number;
  occupancy: readonly RoomOccupancy[];
}

export interface SearchOutcome {
  results: HotelResult[];
  /** Hotels in the destination before any filter. */
  inDestination: number;
  /** Hotels in the destination that cannot host the searched group at all. */
  cannotHost: number;
}

/** Sorts by a comparator and falls back to name so the order is always stable. */
const byName = (a: HotelResult, b: HotelResult) => a.hotel.name.localeCompare(b.hotel.name);

function recommendedScore(r: HotelResult): number {
  return guestScore(r.hotel) * 10 + r.hotel.stars * 2 + Math.log10(r.hotel.popularity + 1) * 4;
}

export function sortResults(results: readonly HotelResult[], sort: HotelSort): HotelResult[] {
  const list = [...results];
  const cmp: Record<HotelSort, (a: HotelResult, b: HotelResult) => number> = {
    recommended: (a, b) => recommendedScore(b) - recommendedScore(a),
    'price-asc': (a, b) => a.price.allInPerNightPaise - b.price.allInPerNightPaise,
    'price-desc': (a, b) => b.price.allInPerNightPaise - a.price.allInPerNightPaise,
    rating: (a, b) => b.hotel.rating - a.hotel.rating || b.hotel.reviewCount - a.hotel.reviewCount,
    stars: (a, b) => b.hotel.stars - a.hotel.stars || b.hotel.rating - a.hotel.rating,
    distance: (a, b) => a.distanceKm - b.distanceKm,
    popularity: (a, b) => b.hotel.popularity - a.hotel.popularity,
  };
  return list.sort((a, b) => cmp[sort](a, b) || byName(a, b));
}

/** Search → filter → sort in one pure call. */
export function searchHotels(
  ctx: SearchContext,
  filters: HotelFilters,
  sort: HotelSort,
  catalog: readonly Hotel[] = HOTEL_DATA,
): SearchOutcome {
  const inCity = catalog.filter((h) => matchesDestination(h, ctx.query));
  let cannotHost = 0;
  const results: HotelResult[] = [];

  for (const hotel of inCity) {
    const fitting = hotel.rooms.filter((room) => roomFitsOccupancy(room, ctx.occupancy));
    if (fitting.length === 0) {
      cannotHost += 1;
      continue;
    }
    if (!hotelMatches(hotel, filters)) continue;
    const rooms = fitting
      .filter((room) => roomMatches(room, filters))
      .sort((a, b) => a.pricePerNightPaise - b.pricePerNightPaise);
    const bestRoom = rooms[0];
    if (!bestRoom) continue;
    results.push({
      hotel,
      rooms,
      bestRoom,
      price: priceStay(bestRoom, ctx.nights, ctx.occupancy.length || 1),
      distanceKm: distanceFromDestination(hotel, ctx.query),
    });
  }

  return { results: sortResults(results, sort), inDestination: inCity.length, cannotHost };
}

/** Price range (rupees per night) across a set of hotels, for the slider bounds. */
export function priceBounds(catalog: readonly Hotel[] = HOTEL_DATA): { min: number; max: number } {
  const prices = catalog.flatMap((h) => h.rooms.map((r) => r.pricePerNightPaise / 100));
  if (prices.length === 0) return { min: 0, max: 0 };
  return {
    min: Math.floor(Math.min(...prices) / 500) * 500,
    max: Math.ceil(Math.max(...prices) / 500) * 500,
  };
}

export interface ActiveFilter {
  key: string;
  label: string;
}

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

/** One chip per active filter, so each can be removed on its own. */
export function activeFilters(filters: HotelFilters): ActiveFilter[] {
  const chips: ActiveFilter[] = [];
  if (filters.minPricePaise !== null || filters.maxPricePaise !== null) {
    const min = filters.minPricePaise !== null ? rupees(filters.minPricePaise) : 'Any';
    const max = filters.maxPricePaise !== null ? rupees(filters.maxPricePaise) : 'Any';
    chips.push({ key: 'price', label: `Price ${min} – ${max}` });
  }
  for (const s of filters.stars) chips.push({ key: `star:${s}`, label: `${s} star` });
  if (filters.guestRatingMin !== null)
    chips.push({ key: 'rating', label: `Guest rating ${filters.guestRatingMin}+` });
  for (const t of filters.propertyTypes) chips.push({ key: `type:${t}`, label: t });
  for (const a of filters.amenities) chips.push({ key: `amenity:${a}`, label: a });
  if (filters.freeCancellation) chips.push({ key: 'free-cancellation', label: 'Free cancellation' });
  if (filters.payAtProperty) chips.push({ key: 'pay-at-property', label: 'Pay at property' });
  if (filters.noPrepayment) chips.push({ key: 'no-prepayment', label: 'No prepayment' });
  if (filters.mealPlan) chips.push({ key: 'meal', label: MEAL_PLAN_SHORT[filters.mealPlan] });
  for (const l of filters.locations) chips.push({ key: `loc:${l}`, label: LOCATION_TAG_LABEL[l] });
  if (filters.maxDistanceKm !== null) chips.push({ key: 'distance', label: `Within ${filters.maxDistanceKm} km` });
  if (filters.maxBeachKm !== null) chips.push({ key: 'beach', label: `Beach within ${filters.maxBeachKm} km` });
  for (const b of filters.bedTypes) chips.push({ key: `bed:${b}`, label: `${b} bed` });
  if (filters.coupleFriendly) chips.push({ key: 'couple', label: 'Couple friendly' });
  if (filters.frontDesk24) chips.push({ key: 'desk24', label: '24-hour front desk' });
  return chips;
}

/** Removes the single filter identified by an `ActiveFilter.key`. */
export function removeFilter(filters: HotelFilters, key: string): HotelFilters {
  const [kind, value] = key.split(':') as [string, string | undefined];
  switch (kind) {
    case 'price':
      return { ...filters, minPricePaise: null, maxPricePaise: null };
    case 'star':
      return { ...filters, stars: filters.stars.filter((s) => String(s) !== value) };
    case 'rating':
      return { ...filters, guestRatingMin: null };
    case 'type':
      return { ...filters, propertyTypes: filters.propertyTypes.filter((t) => t !== value) };
    case 'amenity':
      return { ...filters, amenities: filters.amenities.filter((a) => a !== value) };
    case 'free-cancellation':
      return { ...filters, freeCancellation: false };
    case 'pay-at-property':
      return { ...filters, payAtProperty: false };
    case 'no-prepayment':
      return { ...filters, noPrepayment: false };
    case 'meal':
      return { ...filters, mealPlan: null };
    case 'loc':
      return { ...filters, locations: filters.locations.filter((l) => l !== value) };
    case 'distance':
      return { ...filters, maxDistanceKm: null };
    case 'beach':
      return { ...filters, maxBeachKm: null };
    case 'bed':
      return { ...filters, bedTypes: filters.bedTypes.filter((b) => b !== value) };
    case 'couple':
      return { ...filters, coupleFriendly: false };
    case 'desk24':
      return { ...filters, frontDesk24: false };
    default:
      return filters;
  }
}

/** Adds or removes a value in a list (checkbox helper). */
export function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/**
 * Price histogram for the filter slider: how many rooms fall in each price band
 * (rupees per night). `bins` equal-width bands between `bounds.min` and `bounds.max`.
 */
export function priceHistogram(
  bounds: { min: number; max: number },
  bins = 12,
  catalog: readonly Hotel[] = HOTEL_DATA,
): number[] {
  const counts = new Array<number>(bins).fill(0);
  const span = Math.max(1, bounds.max - bounds.min);
  for (const hotel of catalog) {
    for (const room of hotel.rooms) {
      const rupees = room.pricePerNightPaise / 100;
      const index = Math.min(bins - 1, Math.max(0, Math.floor(((rupees - bounds.min) / span) * bins)));
      counts[index] = (counts[index] ?? 0) + 1;
    }
  }
  return counts;
}
