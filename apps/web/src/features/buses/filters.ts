import type { BusTripOffer } from '@zproo/types';
import { localHour } from '@/features/flights/format';
import { TIME_BANDS, type TimeBand } from '@/features/flights/filters';
import { IST } from './format';

export { TIME_BANDS, type TimeBand };

export const BUS_SORTS = [
  { id: 'DEPARTURE', label: 'Departure' },
  { id: 'PRICE', label: 'Cheapest' },
  { id: 'RATING', label: 'Top rated' },
  { id: 'DURATION', label: 'Fastest' },
  { id: 'SEATS', label: 'Most seats' },
] as const;
export type BusSortId = (typeof BUS_SORTS)[number]['id'];

export const BUS_KINDS = [
  { id: 'AC', label: 'A/C' },
  { id: 'NON_AC', label: 'Non A/C' },
  { id: 'SLEEPER', label: 'Sleeper' },
  { id: 'SEATER', label: 'Seater' },
  { id: 'ELECTRIC', label: 'Electric' },
] as const;
export type BusKind = (typeof BUS_KINDS)[number]['id'];

export interface BusFilters {
  kinds: BusKind[];
  departure: TimeBand[];
  arrival: TimeBand[];
  operators: string[];
  boardingPoints: string[];
  droppingPoints: string[];
  minPricePaise: number | null;
  maxPricePaise: number | null;
  minSeatsAvailable: number | null;
  minRating: number | null;
}

export const EMPTY_BUS_FILTERS: BusFilters = {
  kinds: [],
  departure: [],
  arrival: [],
  operators: [],
  boardingPoints: [],
  droppingPoints: [],
  minPricePaise: null,
  maxPricePaise: null,
  minSeatsAvailable: null,
  minRating: null,
};

export function activeBusFilterCount(f: BusFilters): number {
  return (
    f.kinds.length +
    f.departure.length +
    f.arrival.length +
    f.operators.length +
    f.boardingPoints.length +
    f.droppingPoints.length +
    (f.minPricePaise === null ? 0 : 1) +
    (f.maxPricePaise === null ? 0 : 1) +
    (f.minSeatsAvailable === null ? 0 : 1) +
    (f.minRating === null ? 0 : 1)
  );
}

function matchesKind(trip: BusTripOffer, kind: BusKind): boolean {
  switch (kind) {
    case 'AC':
      return trip.bus.ac;
    case 'NON_AC':
      return !trip.bus.ac;
    case 'SLEEPER':
      return trip.bus.type !== 'SEATER';
    case 'SEATER':
      return trip.bus.type !== 'SLEEPER';
    case 'ELECTRIC':
      return trip.bus.electric;
  }
}

const inBands = (hour: number, bands: TimeBand[]) =>
  bands.length === 0 ||
  TIME_BANDS.some((b) => bands.includes(b.id) && hour >= b.from && hour < b.to);

/**
 * A/C and Non A/C are alternatives (either matches); the other kinds narrow the list
 * (e.g. A/C + Sleeper = A/C sleepers).
 */
export function applyBusFilters(trips: BusTripOffer[], f: BusFilters): BusTripOffer[] {
  const climate = f.kinds.filter((k) => k === 'AC' || k === 'NON_AC');
  const others = f.kinds.filter((k) => k !== 'AC' && k !== 'NON_AC');
  return trips.filter(
    (t) =>
      (climate.length === 0 || climate.some((k) => matchesKind(t, k))) &&
      others.every((k) => matchesKind(t, k)) &&
      inBands(localHour(t.departureAt, IST), f.departure) &&
      inBands(localHour(t.arrivalAt, IST), f.arrival) &&
      (f.operators.length === 0 || f.operators.includes(t.operator.code)) &&
      (f.boardingPoints.length === 0 ||
        t.boardingPoints.some((p) => f.boardingPoints.includes(p.name))) &&
      (f.droppingPoints.length === 0 ||
        t.droppingPoints.some((p) => f.droppingPoints.includes(p.name))) &&
      (f.minPricePaise === null || t.fromPaise >= f.minPricePaise) &&
      (f.maxPricePaise === null || t.fromPaise <= f.maxPricePaise) &&
      (f.minSeatsAvailable === null || t.seatsAvailable >= f.minSeatsAvailable) &&
      (f.minRating === null || t.operator.rating >= f.minRating),
  );
}

export function sortBuses(trips: BusTripOffer[], sort: BusSortId): BusTripOffer[] {
  const list = [...trips];
  const by = (key: (t: BusTripOffer) => number) =>
    list.sort((a, b) => key(a) - key(b) || Date.parse(a.departureAt) - Date.parse(b.departureAt));
  switch (sort) {
    case 'DEPARTURE':
      return by((t) => Date.parse(t.departureAt));
    case 'PRICE':
      return by((t) => t.fromPaise);
    case 'RATING':
      return by((t) => -t.operator.rating);
    case 'DURATION':
      return by((t) => t.durationMinutes);
    case 'SEATS':
      return by((t) => -t.seatsAvailable);
  }
}

export interface BusFacets {
  minPricePaise: number;
  maxPricePaise: number;
  operators: { code: string; name: string; rating: number; count: number }[];
  boardingPoints: string[];
  droppingPoints: string[];
  kinds: BusKind[];
}

/** Options for the filter panel, from the unfiltered results. */
export function busFacets(trips: BusTripOffer[]): BusFacets {
  const operators = new Map<string, BusFacets['operators'][number]>();
  const boarding = new Set<string>();
  const dropping = new Set<string>();
  for (const t of trips) {
    const op = operators.get(t.operator.code) ?? { ...t.operator, count: 0 };
    op.count += 1;
    operators.set(op.code, op);
    t.boardingPoints.forEach((p) => boarding.add(p.name));
    t.droppingPoints.forEach((p) => dropping.add(p.name));
  }
  const prices = trips.map((t) => t.fromPaise);
  return {
    minPricePaise: prices.length ? Math.min(...prices) : 0,
    maxPricePaise: prices.length ? Math.max(...prices) : 0,
    operators: [...operators.values()].sort((a, b) => b.rating - a.rating),
    boardingPoints: [...boarding],
    droppingPoints: [...dropping],
    kinds: BUS_KINDS.map((k) => k.id).filter((k) => trips.some((t) => matchesKind(t, k))),
  };
}
