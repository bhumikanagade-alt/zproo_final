import { findStation } from '@zproo/config';
import { describe, expect, it } from 'vitest';
import {
  allocateBerths,
  availabilityAt,
  buildTrainOffer,
  buildTrainTimetable,
  journeyAvailability,
  maxSellable,
  parseTrainOfferId,
  searchTrainJourneys,
  trainCancellationCharge,
  trainFare,
  trainJourney,
  trainOfferId,
  zonedTimeToUtc,
} from './index';

const plan = (n: string) => {
  const found = buildTrainTimetable().find((p) => p.number === n);
  if (!found) throw new Error(`no train ${n}`);
  return found;
};
const journey = (...args: Parameters<typeof trainJourney>) => {
  const j = trainJourney(...args);
  if (!j) throw new Error('no journey');
  return j;
};

describe('demo railway network', () => {
  it('is deterministic, uses real station codes and invented "Z" train numbers', () => {
    const plans = buildTrainTimetable();
    expect(plans.length).toBeGreaterThanOrEqual(20);
    expect(new Set(plans.map((p) => p.number)).size).toBe(plans.length);
    for (const p of plans) {
      expect(p.number).toMatch(/^Z\d{4}$/);
      for (const [code] of p.stations) expect(findStation(code), code).toBeDefined();
    }
  });

  it('builds journeys with stops, day offsets and running days at the boarding station', () => {
    const date = '2026-11-02'; // Monday
    const journeys = searchTrainJourneys('PUNE', 'NDLS', date);
    expect(journeys.map((j) => j.plan.number)).toContain('Z2101');
    const j = journey(plan('Z2101'), 'PUNE', 'NDLS', date);
    expect(j.stops[0]?.code).toBe('PUNE');
    expect(j.stops.at(-1)?.code).toBe('NDLS');
    expect(j.distanceKm).toBe(1300);
    expect(j.departureAt.toISOString()).toBe(
      zonedTimeToUtc(date, '16:15', 'Asia/Kolkata').toISOString(),
    );
    expect(j.arrivalAt.getTime()).toBeGreaterThan(j.departureAt.getTime());
    // Wrong direction or a day the train doesn't run: no journey.
    expect(trainJourney(plan('Z2101'), 'NDLS', 'PUNE', date)).toBeNull();
    expect(trainJourney(plan('Z2103'), 'PUNE', 'NDLS', '2026-11-03')).toBeNull(); // Tuesday
  });

  it('round-trips offer ids', () => {
    const key = { number: 'Z2101', date: '2026-11-02', from: 'PUNE', to: 'NDLS' };
    expect(parseTrainOfferId(trainOfferId(key))).toEqual(key);
    expect(parseTrainOfferId('tr_12123_20261102_PUNE_NDLS')).toBeNull();
  });
});

describe('fares', () => {
  it('adds reservation, superfast, Tatkal and GST (AC only), in whole rupees', () => {
    const sl = trainFare({ travelClass: 'SL', distanceKm: 1300, superfast: true, quota: 'GN' });
    expect(sl.gstPaise).toBe(0);
    expect(sl.totalPaise).toBe(sl.basePaise + sl.reservationPaise + sl.superfastPaise);
    const ac = trainFare({ travelClass: '3A', distanceKm: 1300, superfast: false, quota: 'TQ' });
    expect(ac.superfastPaise).toBe(0);
    expect(ac.tatkalPaise).toBeGreaterThanOrEqual(30_000);
    expect(ac.tatkalPaise).toBeLessThanOrEqual(40_000);
    expect(ac.gstPaise).toBeGreaterThan(0);
    for (const f of [sl, ac]) expect(f.totalPaise % 100).toBe(0);
    // Short trips pay the minimum distance.
    expect(
      trainFare({ travelClass: 'SL', distanceKm: 20, superfast: false, quota: 'GN' }).basePaise,
    ).toBe(
      trainFare({ travelClass: 'SL', distanceKm: 200, superfast: false, quota: 'GN' }).basePaise,
    );
  });
});

describe('availability', () => {
  it('moves from AVL to RAC to waiting list to REGRET', () => {
    const at = (sold: number) => availabilityAt({ travelClass: 'SL', quota: 'GN', sold });
    expect(at(0)).toEqual({ status: 'AVAILABLE', count: 480, label: 'AVL 480' });
    expect(at(479)).toEqual({ status: 'AVAILABLE', count: 1, label: 'AVL 1' });
    expect(at(480)).toEqual({ status: 'RAC', count: 1, label: 'RAC 1' });
    expect(at(520)).toEqual({ status: 'WAITLIST', count: 1, label: 'GNWL 1' });
    expect(at(maxSellable('SL', 'GN'))).toMatchObject({ status: 'REGRET' });
    expect(availabilityAt({ travelClass: 'SL', quota: 'TQ', sold: 80 })).toMatchObject({
      label: 'TQWL 1',
    });
    expect(availabilityAt({ travelClass: '1A', quota: 'LD', sold: 0 })).toMatchObject({
      status: 'NOT_AVAILABLE',
    });
  });

  it('allocates berths, then RAC and waiting list positions, without claiming preferences', () => {
    const seats = allocateBerths({ travelClass: 'SL', quota: 'GN', sold: 478, count: 4 });
    expect(seats.map((s) => s.status)).toEqual(['CONFIRMED', 'CONFIRMED', 'RAC', 'RAC']);
    expect(seats[0]?.label).toMatch(/^CNF\/S\d\/\d+\/(LOWER|MIDDLE|UPPER|SIDE LOWER|SIDE UPPER)$/);
    expect(seats[2]).toMatchObject({ label: 'RAC 1', coach: null, berth: null });
  });

  it('applies the booking window, Tatkal opening and departure cut-off', () => {
    const p = plan('Z2101');
    const j = journey(p, 'PUNE', 'NDLS', '2026-11-02');
    const day = (iso: string) => new Date(iso);
    // 70 days ahead: not open yet.
    expect(
      journeyAvailability({
        journey: j,
        travelClass: '3A',
        quota: 'GN',
        extraSold: 0,
        now: day('2026-08-20T06:00:00Z'),
      }),
    ).toMatchObject({
      status: 'BOOKING_CLOSED',
      bookable: false,
    });
    // Tatkal for 3A opens 10:00 IST the day before.
    expect(
      journeyAvailability({
        journey: j,
        travelClass: '3A',
        quota: 'TQ',
        extraSold: 0,
        now: day('2026-11-01T04:00:00Z'),
      }).bookable,
    ).toBe(false);
    expect(
      journeyAvailability({
        journey: j,
        travelClass: '3A',
        quota: 'TQ',
        extraSold: 0,
        now: day('2026-11-01T04:31:00Z'),
      }).bookable,
    ).toBe(true);
    expect(
      journeyAvailability({
        journey: j,
        travelClass: '1A',
        quota: 'TQ',
        extraSold: 0,
        now: day('2026-11-01T05:00:00Z'),
      }),
    ).toMatchObject({
      status: 'NOT_AVAILABLE',
    });
    // 20 minutes before departure: closed.
    expect(
      journeyAvailability({
        journey: j,
        travelClass: '3A',
        quota: 'GN',
        extraSold: 0,
        now: new Date(j.departureAt.getTime() - 20 * 60_000),
      }),
    ).toMatchObject({ status: 'BOOKING_CLOSED' });
    const offer = buildTrainOffer({
      journey: j,
      quota: 'GN',
      provider: 'mock',
      now: day('2026-10-20T00:00:00Z'),
      extraSold: () => 0,
    });
    expect(offer.classes.map((c) => c.travelClass)).toEqual(['1A', '2A', '3A', '3E', 'SL']);
    expect(offer.runningDays).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});

describe('cancellation charges', () => {
  const departureAt = new Date('2026-11-02T10:45:00Z');
  const charge = (
    hoursBefore: number,
    extra: Partial<Parameters<typeof trainCancellationCharge>[0]> = {},
  ) =>
    trainCancellationCharge({
      travelClass: '3A',
      quota: 'GN',
      status: 'CONFIRMED',
      farePaise: 200_000,
      departureAt,
      now: new Date(departureAt.getTime() - hoursBefore * 3_600_000),
      ...extra,
    });
  it('follows the flat / 25% / 50% / chart rules', () => {
    expect(charge(72)).toEqual({ chargePaise: 18_000 });
    expect(charge(24)).toEqual({ chargePaise: 50_000 });
    expect(charge(6)).toEqual({ chargePaise: 100_000 });
    expect(charge(2)).toHaveProperty('reason');
    expect(charge(72, { quota: 'TQ' })).toEqual({ chargePaise: 200_000 });
    expect(charge(2, { status: 'WAITLIST' })).toEqual({ chargePaise: 6_000 });
    expect(charge(0.2, { status: 'RAC' })).toHaveProperty('reason');
  });
});
