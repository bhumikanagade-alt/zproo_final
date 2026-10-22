import type { Bike, BikeFilters, PickupLocation } from './types';

export const PRICE_MIN = 300;
export const PRICE_MAX = 2000;
export const PRICE_STEP = 100;

export const DEFAULT_FILTERS: BikeFilters = {
  query: '',
  categories: [],
  transmission: 'any',
  maxDailyPrice: PRICE_MAX,
  onlyAvailable: false,
  sort: 'recommended',
};

/**
 * Pure filter + sort, shared by the mock API and any client-side use.
 * `locations` is only needed for the city filter (a bike matches when any of its hubs is in the city).
 */
export function applyFilters(bikes: readonly Bike[], f: BikeFilters, locations: readonly PickupLocation[] = []): Bike[] {
  const q = f.query.trim().toLowerCase();
  const cityHubIds = f.pickupCity ? new Set(locations.filter((l) => l.city === f.pickupCity).map((l) => l.id)) : null;
  const out = bikes.filter((b) => {
    if (q && !`${b.name} ${b.brand} ${b.model}`.toLowerCase().includes(q)) return false;
    if (f.categories.length && !f.categories.includes(b.category)) return false;
    if (f.transmission !== 'any' && b.transmission !== f.transmission) return false;
    if (b.pricing.daily > f.maxDailyPrice) return false;
    if (f.onlyAvailable && b.availability.status === 'unavailable') return false;
    if (f.pickupLocationId && !b.availability.locationIds.includes(f.pickupLocationId)) return false;
    if (cityHubIds && !b.availability.locationIds.some((id) => cityHubIds.has(id))) return false;
    return true;
  });
  const rank = { available: 0, limited: 1, unavailable: 2 } as const;
  const by: Record<BikeFilters['sort'], (a: Bike, b: Bike) => number> = {
    recommended: (a, b) => rank[a.availability.status] - rank[b.availability.status] || b.rating - a.rating,
    'price-asc': (a, b) => a.pricing.daily - b.pricing.daily,
    'price-desc': (a, b) => b.pricing.daily - a.pricing.daily,
    rating: (a, b) => b.rating - a.rating,
  };
  return [...out].sort(by[f.sort]);
}

export function activeFilterCount(f: BikeFilters): number {
  return (
    f.categories.length +
    (f.transmission !== 'any' ? 1 : 0) +
    (f.maxDailyPrice < PRICE_MAX ? 1 : 0) +
    (f.onlyAvailable ? 1 : 0)
  );
}
