import { HOTEL_DATA, type Hotel } from './data';

export type SuggestionKind = 'city' | 'area' | 'hotel' | 'landmark';

export interface DestinationSuggestion {
  kind: SuggestionKind;
  label: string;
  detail: string;
  /** Text to put in the search box / URL when picked. */
  value: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/** Does this hotel belong to the searched destination? Empty query matches everything. */
export function matchesDestination(hotel: Hotel, query: string): boolean {
  const q = norm(query);
  if (!q) return true;
  const haystack = [
    hotel.cityCode,
    hotel.city,
    hotel.area,
    hotel.name,
    hotel.address,
    ...hotel.keywords,
    ...hotel.landmarks.map((l) => l.name),
  ].map(norm);
  return haystack.some((field) => field === q || field.includes(q) || (q.length > 3 && q.includes(field) && field.length > 3));
}

/** Distance (km) from the searched place. If the search names a landmark, measure from it. */
export function distanceFromDestination(hotel: Hotel, query: string): number {
  const q = norm(query);
  const namesPlace = [hotel.cityCode, hotel.city, hotel.area, hotel.name, ...hotel.keywords].some((f) => norm(f) === q);
  if (q && !namesPlace) {
    const landmark = hotel.landmarks.find((l) => {
      const name = norm(l.name);
      return name === q || name.includes(q);
    });
    if (landmark) return landmark.distanceKm;
  }
  return hotel.distanceKm;
}

/** Friendly name for the header, e.g. "goa" → "Goa", "alleppey" → "Alleppey", landmarks stay as typed. */
export function destinationLabel(query: string, hotels: readonly Hotel[] = HOTEL_DATA): string {
  const q = norm(query);
  if (!q) return 'all destinations';
  const city = hotels.find((h) => norm(h.cityCode) === q || norm(h.city) === q);
  if (city) return city.city;
  const hotel = hotels.find((h) => norm(h.name) === q);
  if (hotel) return hotel.name;
  return query.trim();
}

const POPULAR_CITIES = ['goa', 'mumbai', 'pune', 'delhi', 'udaipur', 'manali'];

/** Autocomplete across cities, areas, hotels and landmarks. */
export function suggestDestinations(
  query: string,
  limit = 8,
  hotels: readonly Hotel[] = HOTEL_DATA,
): DestinationSuggestion[] {
  const q = norm(query);
  const out: DestinationSuggestion[] = [];
  const seen = new Set<string>();
  const push = (s: DestinationSuggestion) => {
    const key = `${s.kind}:${norm(s.label)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(s);
  };

  if (!q) {
    for (const code of POPULAR_CITIES) {
      const h = hotels.find((x) => x.cityCode === code);
      if (h) push({ kind: 'city', label: h.city, detail: 'Popular destination', value: h.city });
    }
    return out.slice(0, limit);
  }

  const hit = (text: string) => norm(text).includes(q);
  for (const h of hotels) {
    if (hit(h.city) || hit(h.cityCode) || h.keywords.some(hit))
      push({ kind: 'city', label: h.city, detail: 'City', value: h.city });
  }
  for (const h of hotels) {
    if (hit(h.area)) push({ kind: 'area', label: h.area, detail: `Area in ${h.city}`, value: h.area });
  }
  for (const h of hotels) {
    if (hit(h.name)) push({ kind: 'hotel', label: h.name, detail: `${h.propertyType} in ${h.city}`, value: h.name });
  }
  for (const h of hotels) {
    for (const l of h.landmarks) {
      if (hit(l.name)) push({ kind: 'landmark', label: l.name, detail: `Landmark near ${h.city}`, value: l.name });
    }
  }
  return out.slice(0, limit);
}
