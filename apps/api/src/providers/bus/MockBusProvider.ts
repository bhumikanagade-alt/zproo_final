import { findCity } from '@zproo/config';
import type { BusPoint, BusSeatInfo, BusSeatMap, BusTripOffer } from '@zproo/types';
import { MAX_BUS_SEATS } from '@zproo/validation';
import { randomDigits } from '../../utils/crypto';
import type { Db } from '../../repositories/db';
import { BusRepository, type BusScheduleRecord } from '../../repositories/bus.repository';
import { BUS_CANCELLATION_POLICY, busSeatFare } from '../../services/busPricing';
import { unitHash } from '../../services/flightPricing';
import { SeatUnavailableError } from '../../utils/errors';
import { isoWeekday, localDate, zonedTimeToUtc } from '../../utils/time';
import type { BusProvider, BusSearchQuery } from './BusProvider';

const IST = 'Asia/Kolkata';
const TRIP_ID = /^bs_([a-z0-9]+)_(\d{4})(\d{2})(\d{2})$/;
/** Sales close this long before departure. */
const CUTOFF_MS = 30 * 60 * 1000;

const cityName = (code: string) => findCity(code)?.name ?? code;
const dateOnly = (date: string) => new Date(`${date}T00:00:00Z`);

/**
 * Development bus supplier backed by the seeded network. A share of seats on every trip is
 * treated as already sold (deterministically), so seat maps look like real departures. Never
 * real inventory: `isDemo` is true, and tickets are marked as demo.
 */
export class MockBusProvider implements BusProvider {
  readonly name = 'mock';
  readonly isDemo = true;

  constructor(
    private readonly db: Db,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async search(query: BusSearchQuery): Promise<BusTripOffer[]> {
    const repo = new BusRepository(this.db);
    const schedules = await repo.findRoute(query.from, query.to, isoWeekday(query.date));
    const taken = await repo.takenSeats(
      schedules.map((s) => s.id),
      dateOnly(query.date),
    );
    return schedules
      .map((s) => this.buildOffer(s, query.date, taken.get(s.id)))
      .filter((o): o is BusTripOffer => o !== null && o.seatsAvailable > 0)
      .sort((a, b) => Date.parse(a.departureAt) - Date.parse(b.departureAt));
  }

  async getTrip(tripId: string): Promise<BusTripOffer | null> {
    const found = await this.load(tripId);
    return found && this.buildOffer(found.schedule, found.date, found.taken);
  }

  async seatMap(tripId: string): Promise<BusSeatMap | null> {
    const found = await this.load(tripId);
    if (!found || !this.buildOffer(found.schedule, found.date, found.taken)) return null;
    const seats = this.seats(found.schedule, found.date, found.taken);
    const decks = (['LOWER', 'UPPER'] as const)
      .map((deck) => {
        const list = seats.filter((s) => s.deck === deck);
        return {
          deck,
          rows: Math.max(0, ...list.map((s) => s.row)),
          columns: Math.max(0, ...list.map((s) => s.column)) + 1,
          seats: list,
        };
      })
      .filter((d) => d.seats.length > 0);
    return { tripId, decks, maxSeats: MAX_BUS_SEATS };
  }

  async hold(tripId: string, seatNumbers: string[], bookingId: string, db: Db) {
    const found = await this.load(tripId, db);
    if (!found)
      throw new SeatUnavailableError('This bus is no longer available. Please choose another.');
    const byNumber = new Map(found.schedule.bus.seats.map((s) => [s.number, s]));
    const chosen = seatNumbers.map((n) => byNumber.get(n));
    if (chosen.some((s) => !s || this.presold(found.schedule.id, found.date, s.number))) {
      throw new SeatUnavailableError();
    }
    const repo = new BusRepository(db);
    const localTripId = await repo.ensureTrip(found.schedule.id, dateOnly(found.date));
    const ok = await repo.takeSeats(
      localTripId,
      chosen.map((s) => (s as { id: string }).id),
      bookingId,
    );
    if (!ok) throw new SeatUnavailableError();
    return { localTripId };
  }

  async release(bookingId: string, db: Db): Promise<void> {
    await new BusRepository(db).releaseSeats(bookingId);
  }

  async issue(tripId: string): Promise<{ pnr: string }> {
    const found = await this.load(tripId);
    const code = found?.schedule.bus.operator.code ?? 'BUS';
    return { pnr: `${code}${randomDigits(7)}` };
  }

  // ───────── internals ─────────

  private parse(tripId: string): { scheduleId: string; date: string } | null {
    const m = TRIP_ID.exec(tripId);
    return m ? { scheduleId: m[1] as string, date: `${m[2]}-${m[3]}-${m[4]}` } : null;
  }

  private async load(tripId: string, db: Db = this.db) {
    const parsed = this.parse(tripId);
    if (!parsed) return null;
    const repo = new BusRepository(db);
    const schedule = await repo.findSchedule(parsed.scheduleId);
    if (!schedule || !schedule.daysOfWeek.includes(isoWeekday(parsed.date))) return null;
    const taken = (await repo.takenSeats([schedule.id], dateOnly(parsed.date))).get(schedule.id);
    return { schedule, date: parsed.date, taken };
  }

  /** Seats treated as sold before our first booking: 20–70% of the coach, varying by trip. */
  private presold(scheduleId: string, date: string, seatNumber: string): boolean {
    const load = 0.2 + unitHash(`bus-load:${scheduleId}:${date}`) * 0.5;
    return unitHash(`bus-seat:${scheduleId}:${date}:${seatNumber}`) < load;
  }

  private seats(
    schedule: BusScheduleRecord,
    date: string,
    taken: Set<string> | undefined,
  ): BusSeatInfo[] {
    const today = localDate(this.now(), IST);
    return schedule.bus.seats.map((seat) => {
      const fare = busSeatFare({
        baseFarePaise: schedule.baseFarePaise,
        seatFarePercent: seat.farePercent,
        date,
        today,
        ac: schedule.bus.ac,
      });
      return {
        number: seat.number,
        deck: seat.deck,
        row: seat.row,
        column: seat.column,
        kind: seat.kind,
        available: !taken?.has(seat.id) && !this.presold(schedule.id, date, seat.number),
        ladiesOnly: seat.ladiesOnly,
        basePaise: fare.basePaise,
        taxPaise: fare.taxPaise,
        pricePaise: fare.pricePaise,
      };
    });
  }

  private buildOffer(
    schedule: BusScheduleRecord,
    date: string,
    taken: Set<string> | undefined,
  ): BusTripOffer | null {
    const departure = zonedTimeToUtc(date, schedule.departureTime, IST);
    if (departure.getTime() - this.now().getTime() < CUTOFF_MS) return null;
    const arrival = new Date(departure.getTime() + schedule.durationMinutes * 60_000);
    const seats = this.seats(schedule, date, taken);
    const open = seats.filter((s) => s.available);
    const point = (p: BusScheduleRecord['route']['points'][number]): BusPoint => ({
      id: p.id,
      name: p.name,
      address: p.address,
      time: new Date(
        p.kind === 'BOARDING'
          ? departure.getTime() + p.offsetMinutes * 60_000
          : arrival.getTime() - p.offsetMinutes * 60_000,
      ).toISOString(),
    });
    const { route, bus } = schedule;
    return {
      id: `bs_${schedule.id}_${date.replaceAll('-', '')}`,
      provider: this.name,
      serviceNumber: schedule.serviceNumber,
      operator: {
        code: bus.operator.code,
        name: bus.operator.name,
        rating: bus.operator.rating,
        ratingCount: bus.operator.ratingCount,
      },
      bus: { name: bus.name, type: bus.type, ac: bus.ac, electric: bus.electric },
      from: { code: route.originCity, name: cityName(route.originCity) },
      to: { code: route.destinationCity, name: cityName(route.destinationCity) },
      date,
      departureAt: departure.toISOString(),
      arrivalAt: arrival.toISOString(),
      durationMinutes: schedule.durationMinutes,
      distanceKm: route.distanceKm,
      amenities: bus.amenities,
      fromPaise: open.length > 0 ? Math.min(...open.map((s) => s.pricePaise)) : 0,
      seatsAvailable: open.length,
      totalSeats: seats.length,
      boardingPoints: route.points.filter((p) => p.kind === 'BOARDING').map(point),
      droppingPoints: route.points.filter((p) => p.kind === 'DROPPING').map(point),
      cancellationPolicy: BUS_CANCELLATION_POLICY,
    };
  }
}
