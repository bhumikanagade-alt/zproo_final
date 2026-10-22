import type { TrainClass, TrainOffer } from '@zproo/types';
import { localHour } from '@/features/flights/format';
import { TIME_BANDS, type TimeBand } from '@/features/flights/filters';
import { IST } from './format';

export { TIME_BANDS, type TimeBand };

export const TRAIN_SORTS = [
  { id: 'DEPARTURE', label: 'Departure' },
  { id: 'ARRIVAL', label: 'Arrival' },
  { id: 'DURATION', label: 'Fastest' },
  { id: 'FARE', label: 'Lowest fare' },
] as const;
export type TrainSortId = (typeof TRAIN_SORTS)[number]['id'];

export interface TrainFilters {
  classes: TrainClass[];
  departure: TimeBand[];
  arrival: TimeBand[];
  trainTypes: string[];
  /** Only trains with at least one bookable class (AVL, RAC or WL). */
  bookableOnly: boolean;
  /** Only trains with confirmed berths available (AVL). */
  availableOnly: boolean;
  pantryOnly: boolean;
}

export const EMPTY_TRAIN_FILTERS: TrainFilters = {
  classes: [],
  departure: [],
  arrival: [],
  trainTypes: [],
  bookableOnly: false,
  availableOnly: false,
  pantryOnly: false,
};

export function activeTrainFilterCount(f: TrainFilters): number {
  return (
    f.classes.length +
    f.departure.length +
    f.arrival.length +
    f.trainTypes.length +
    (f.bookableOnly ? 1 : 0) +
    (f.availableOnly ? 1 : 0) +
    (f.pantryOnly ? 1 : 0)
  );
}

const inBands = (hour: number, bands: TimeBand[]) =>
  bands.length === 0 ||
  TIME_BANDS.some((b) => bands.includes(b.id) && hour >= b.from && hour < b.to);

/** Classes of a train that pass the class filter (all when none chosen). */
export const visibleClasses = (t: TrainOffer, f: Pick<TrainFilters, 'classes'>) =>
  f.classes.length === 0 ? t.classes : t.classes.filter((c) => f.classes.includes(c.travelClass));

export function applyTrainFilters(trains: TrainOffer[], f: TrainFilters): TrainOffer[] {
  return trains.filter((t) => {
    const classes = visibleClasses(t, f);
    return (
      classes.length > 0 &&
      inBands(localHour(t.departureAt, IST), f.departure) &&
      inBands(localHour(t.arrivalAt, IST), f.arrival) &&
      (f.trainTypes.length === 0 || f.trainTypes.includes(t.trainType)) &&
      (!f.pantryOnly || t.pantry) &&
      (!f.bookableOnly || classes.some((c) => c.availability.bookable)) &&
      (!f.availableOnly || classes.some((c) => c.availability.status === 'AVAILABLE'))
    );
  });
}

/** Lowest per-passenger fare among the (filtered) classes; Infinity when none is quoted. */
export function lowestFare(
  t: TrainOffer,
  f: Pick<TrainFilters, 'classes'> = { classes: [] },
): number {
  const fares = visibleClasses(t, f)
    .map((c) => c.fare?.totalPaise)
    .filter((x): x is number => typeof x === 'number');
  return fares.length ? Math.min(...fares) : Number.POSITIVE_INFINITY;
}

export function sortTrains(
  trains: TrainOffer[],
  sort: TrainSortId,
  f: Pick<TrainFilters, 'classes'> = { classes: [] },
): TrainOffer[] {
  const list = [...trains];
  const by = (key: (t: TrainOffer) => number) =>
    list.sort((a, b) => key(a) - key(b) || Date.parse(a.departureAt) - Date.parse(b.departureAt));
  switch (sort) {
    case 'DEPARTURE':
      return by((t) => Date.parse(t.departureAt));
    case 'ARRIVAL':
      return by((t) => Date.parse(t.arrivalAt));
    case 'DURATION':
      return by((t) => t.durationMinutes);
    case 'FARE':
      return by((t) => lowestFare(t, f));
  }
}

export interface TrainFacets {
  classes: TrainClass[];
  trainTypes: string[];
  anyPantry: boolean;
}

export function trainFacets(trains: TrainOffer[]): TrainFacets {
  const order: TrainClass[] = ['1A', '2A', '3A', '3E', 'SL', 'EC', 'CC', '2S'];
  const classes = new Set(trains.flatMap((t) => t.classes.map((c) => c.travelClass)));
  return {
    classes: order.filter((c) => classes.has(c)),
    trainTypes: [...new Set(trains.map((t) => t.trainType))].sort(),
    anyPantry: trains.some((t) => t.pantry),
  };
}
