import type { TrainClassOption, TrainOffer } from '@zproo/types';
import { describe, expect, it } from 'vitest';
import {
  activeTrainFilterCount,
  applyTrainFilters,
  EMPTY_TRAIN_FILTERS,
  lowestFare,
  sortTrains,
  trainFacets,
} from './filters';

const option = (
  travelClass: TrainClassOption['travelClass'],
  status: TrainClassOption['availability']['status'],
  fare: number,
): TrainClassOption => ({
  travelClass,
  quota: 'GN',
  availability: {
    status,
    count: status === 'AVAILABLE' ? 10 : 3,
    label:
      status === 'AVAILABLE'
        ? 'AVL 10'
        : status === 'RAC'
          ? 'RAC 3'
          : status === 'WAITLIST'
            ? 'GNWL 3'
            : 'REGRET',
    bookable: status !== 'REGRET',
    note: null,
    checkedAt: '2026-10-12T00:00:00.000Z',
  },
  fare: {
    basePaise: fare,
    reservationPaise: 0,
    superfastPaise: 0,
    tatkalPaise: 0,
    gstPaise: 0,
    totalPaise: fare,
  },
});

const train = (o: Partial<TrainOffer> & Pick<TrainOffer, 'id'>): TrainOffer => ({
  provider: 'mock',
  trainNumber: o.id,
  trainName: `Train ${o.id}`,
  trainType: 'Express',
  from: { code: 'PUNE', name: 'Pune Junction' },
  to: { code: 'NDLS', name: 'New Delhi' },
  date: '2026-10-25',
  departureAt: '2026-10-25T03:30:00.000Z', // 09:00 IST
  arrivalAt: '2026-10-25T13:30:00.000Z', // 19:00 IST
  durationMinutes: 600,
  distanceKm: 1300,
  runningDays: [1, 2, 3, 4, 5, 6, 7],
  pantry: false,
  stops: [],
  classes: [option('3A', 'AVAILABLE', 190_000), option('SL', 'WAITLIST', 70_000)],
  ...o,
});

const A = train({ id: 'A' });
const B = train({
  id: 'B',
  trainType: 'Superfast',
  pantry: true,
  departureAt: '2026-10-24T17:00:00.000Z', // 22:30 IST
  arrivalAt: '2026-10-25T05:00:00.000Z', // 10:30 IST
  durationMinutes: 720,
  classes: [option('2A', 'REGRET', 260_000), option('SL', 'RAC', 65_000)],
});
const C = train({
  id: 'C',
  departureAt: '2026-10-25T00:00:00.000Z', // 05:30 IST
  arrivalAt: '2026-10-25T06:00:00.000Z',
  durationMinutes: 360,
  classes: [option('CC', 'AVAILABLE', 40_000)],
});

describe('train filters', () => {
  it('filters by class, availability, time of day, type and pantry', () => {
    const all = [A, B, C];
    expect(applyTrainFilters(all, EMPTY_TRAIN_FILTERS)).toHaveLength(3);
    expect(
      applyTrainFilters(all, { ...EMPTY_TRAIN_FILTERS, classes: ['SL'] }).map((t) => t.id),
    ).toEqual(['A', 'B']);
    expect(
      applyTrainFilters(all, { ...EMPTY_TRAIN_FILTERS, availableOnly: true }).map((t) => t.id),
    ).toEqual(['A', 'C']);
    // B's 2A is REGRET but SL (RAC) is bookable.
    expect(
      applyTrainFilters(all, { ...EMPTY_TRAIN_FILTERS, classes: ['2A'], bookableOnly: true }),
    ).toEqual([]);
    expect(
      applyTrainFilters(all, { ...EMPTY_TRAIN_FILTERS, departure: ['NIGHT'] }).map((t) => t.id),
    ).toEqual(['B']);
    expect(
      applyTrainFilters(all, { ...EMPTY_TRAIN_FILTERS, departure: ['EARLY'] }).map((t) => t.id),
    ).toEqual(['C']);
    expect(
      applyTrainFilters(all, { ...EMPTY_TRAIN_FILTERS, arrival: ['NIGHT'] }).map((t) => t.id),
    ).toEqual(['A']);
    expect(
      applyTrainFilters(all, { ...EMPTY_TRAIN_FILTERS, trainTypes: ['Superfast'] }).map(
        (t) => t.id,
      ),
    ).toEqual(['B']);
    expect(
      applyTrainFilters(all, { ...EMPTY_TRAIN_FILTERS, pantryOnly: true }).map((t) => t.id),
    ).toEqual(['B']);
    expect(
      activeTrainFilterCount({ ...EMPTY_TRAIN_FILTERS, classes: ['SL', '3A'], pantryOnly: true }),
    ).toBe(3);
  });

  it('sorts by departure, arrival, duration and lowest fare of the shown classes', () => {
    const all = [A, B, C];
    expect(sortTrains(all, 'DEPARTURE').map((t) => t.id)).toEqual(['B', 'C', 'A']);
    expect(sortTrains(all, 'ARRIVAL').map((t) => t.id)).toEqual(['B', 'C', 'A']);
    expect(sortTrains(all, 'DURATION').map((t) => t.id)).toEqual(['C', 'A', 'B']);
    expect(sortTrains(all, 'FARE').map((t) => t.id)).toEqual(['C', 'B', 'A']);
    expect(sortTrains(all, 'FARE', { classes: ['SL'] }).map((t) => t.id)).toEqual(['B', 'A', 'C']);
    expect(lowestFare(C, { classes: ['SL'] })).toBe(Number.POSITIVE_INFINITY);
  });

  it('builds facets in Indian Railways class order', () => {
    expect(trainFacets([A, B, C])).toEqual({
      classes: ['2A', '3A', 'SL', 'CC'],
      trainTypes: ['Express', 'Superfast'],
      anyPantry: true,
    });
  });
});
