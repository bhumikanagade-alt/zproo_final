import type { CabinClass } from '@prisma/client';
import type { AirportInfo, FlightOffer, FlightSegmentInfo } from '@zproo/types';
import type { Db } from '../../repositories/db';
import { FlightRepository, type FlightSchedule } from '../../repositories/flight.repository';
import { offerTotal, quoteFare, unitHash, type PaxCounts } from '../../services/flightPricing';
import { randomInt } from 'node:crypto';
import { randomDigits } from '../../utils/crypto';
import { SoldOutError } from '../../utils/errors';
import {
  addDaysIso,
  daysBetweenIso,
  isoWeekday,
  localDate,
  zonedTimeToUtc,
} from '../../utils/time';
import type { FlightLegQuery, FlightProvider, IssuedTickets } from './FlightProvider';

const CABIN_CODE: Record<CabinClass, string> = {
  ECONOMY: 'E',
  PREMIUM_ECONOMY: 'P',
  BUSINESS: 'B',
  FIRST: 'F',
};
const CODE_CABIN = Object.fromEntries(Object.entries(CABIN_CODE).map(([k, v]) => [v, k])) as Record<
  string,
  CabinClass
>;
const OFFER_ID = /^mk_([a-z0-9]+)_(\d{4})(\d{2})(\d{2})_([EPBF])$/;
/** Sales close this long before departure. */
const CUTOFF_MS = 2 * 60 * 60 * 1000;

const airportInfo = (a: FlightSchedule['origin']): AirportInfo => ({
  code: a.code,
  city: a.city,
  name: a.name,
  country: a.country,
  timezone: a.timezone,
});

function capacity(flight: FlightSchedule, cabin: CabinClass): number {
  return {
    ECONOMY: flight.seatsEconomy,
    PREMIUM_ECONOMY: flight.seatsPremium,
    BUSINESS: flight.seatsBusiness,
    FIRST: flight.seatsFirst,
  }[cabin];
}

/**
 * Development flight supplier backed by the seeded timetable. Prices follow demand
 * (deterministically), and a realistic share of seats is treated as already sold so availability
 * varies. Never real inventory: `isDemo` is true, and tickets are marked as demo.
 */
export class MockFlightProvider implements FlightProvider {
  readonly name = 'mock';
  readonly isDemo = true;

  constructor(
    private readonly db: Db,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async search(query: FlightLegQuery): Promise<FlightOffer[]> {
    const repo = new FlightRepository(this.db);
    const flights = await repo.findRoute(query.from, query.to, isoWeekday(query.date));
    const withSeats = flights.filter((f) => capacity(f, query.cabin) > 0);
    const sold = await repo.soldSeats(
      withSeats.map((f) => f.id),
      new Date(`${query.date}T00:00:00Z`),
      query.cabin,
    );
    const soldBy = new Map(sold.map((s) => [s.flightId, s]));
    const seatsNeeded = query.pax.adults + query.pax.children;
    return withSeats
      .map((f) => this.buildOffer(f, query.date, query.cabin, query.pax, soldBy.get(f.id)))
      .filter((o): o is FlightOffer => o !== null && o.seatsLeft >= seatsNeeded)
      .sort((a, b) => a.totalPaise - b.totalPaise);
  }

  async getOffer(offerId: string, pax: PaxCounts): Promise<FlightOffer | null> {
    const parsed = this.parse(offerId);
    if (!parsed) return null;
    const repo = new FlightRepository(this.db);
    const flight = await repo.findById(parsed.flightId);
    if (!flight || !flight.daysOfWeek.includes(isoWeekday(parsed.date))) return null;
    const [inventory] = await repo.soldSeats(
      [flight.id],
      new Date(`${parsed.date}T00:00:00Z`),
      parsed.cabin,
    );
    return this.buildOffer(flight, parsed.date, parsed.cabin, pax, inventory);
  }

  async hold(offerId: string, seats: number, db: Db): Promise<void> {
    const parsed = this.parse(offerId);
    const flight = parsed && (await new FlightRepository(db).findById(parsed.flightId));
    if (!parsed || !flight) throw new SoldOutError();
    const available =
      capacity(flight, parsed.cabin) - this.presold(flight, parsed.date, parsed.cabin);
    const ok = await new FlightRepository(db).takeSeats(
      flight.id,
      new Date(`${parsed.date}T00:00:00Z`),
      parsed.cabin,
      available,
      seats,
    );
    if (!ok) throw new SoldOutError();
  }

  async release(offerId: string, seats: number, db: Db): Promise<void> {
    const parsed = this.parse(offerId);
    if (!parsed) return;
    await new FlightRepository(db).returnSeats(
      parsed.flightId,
      new Date(`${parsed.date}T00:00:00Z`),
      parsed.cabin,
      seats,
    );
  }

  async issue(
    _offerId: string,
    passengers: { firstName: string; lastName: string }[],
  ): Promise<IssuedTickets> {
    // Six-character airline-style PNR without ambiguous letters, and 13-digit ticket numbers.
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const pnr = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');
    return { pnr, ticketNumbers: passengers.map(() => `999${randomDigits(10)}`) };
  }

  // ───────── internals ─────────

  private parse(offerId: string): { flightId: string; date: string; cabin: CabinClass } | null {
    const m = OFFER_ID.exec(offerId);
    const cabin = m?.[5] ? CODE_CABIN[m[5]] : undefined;
    if (!m || !cabin) return null;
    return { flightId: m[1] as string, date: `${m[2]}-${m[3]}-${m[4]}`, cabin };
  }

  /** Seats treated as sold before our first booking, so availability looks like a real flight. */
  private presold(flight: FlightSchedule, date: string, cabin: CabinClass): number {
    const daysAhead = Math.max(
      0,
      daysBetweenIso(localDate(this.now(), flight.origin.timezone), date),
    );
    const load = Math.min(
      0.97,
      0.35 + 0.5 * unitHash(`${flight.id}:${date}:${cabin}:load`) + (daysAhead <= 3 ? 0.15 : 0),
    );
    return Math.floor(capacity(flight, cabin) * load);
  }

  private buildOffer(
    flight: FlightSchedule,
    date: string,
    cabin: CabinClass,
    pax: PaxCounts,
    inventory?: { capacity: number; sold: number },
  ): FlightOffer | null {
    const segments: FlightSegmentInfo[] = flight.segments.map((s) => {
      const departure = zonedTimeToUtc(
        addDaysIso(date, s.dayOffset),
        s.departureTime,
        s.origin.timezone,
      );
      return {
        airline: { code: s.airline.code, name: s.airline.name },
        flightNumber: s.flightNumber,
        from: airportInfo(s.origin),
        to: airportInfo(s.destination),
        departureAt: departure.toISOString(),
        arrivalAt: new Date(departure.getTime() + s.durationMinutes * 60_000).toISOString(),
        durationMinutes: s.durationMinutes,
        aircraft: flight.aircraft,
      };
    });
    const first = segments[0];
    const last = segments.at(-1);
    if (!first || !last) return null;
    const departureAt = new Date(first.departureAt);
    if (departureAt.getTime() - this.now().getTime() < CUTOFF_MS) return null;

    const total = capacity(flight, cabin);
    const seatsLeft = inventory
      ? inventory.capacity - inventory.sold
      : total - this.presold(flight, date, cabin);
    const key = `${flight.id}:${date}:${cabin}`;
    const quote = quoteFare({
      key,
      baseFarePaise: flight.baseFarePaise,
      cabin,
      daysAhead: Math.max(0, daysBetweenIso(localDate(this.now(), flight.origin.timezone), date)),
      weekday: isoWeekday(date),
      international: flight.origin.country !== flight.destination.country,
    });
    return {
      id: `mk_${flight.id}_${date.replaceAll('-', '')}_${CABIN_CODE[cabin]}`,
      provider: this.name,
      airline: { code: flight.airline.code, name: flight.airline.name },
      flightNumber: flight.flightNumber,
      from: first.from,
      to: last.to,
      departureAt: first.departureAt,
      arrivalAt: last.arrivalAt,
      durationMinutes: Math.round(
        (Date.parse(last.arrivalAt) - Date.parse(first.departureAt)) / 60_000,
      ),
      stops: segments.length - 1,
      segments,
      layovers: segments.slice(1).map((s, i) => ({
        airport: s.from,
        minutes: Math.round(
          (Date.parse(s.departureAt) - Date.parse(segments[i]?.arrivalAt ?? s.departureAt)) /
            60_000,
        ),
      })),
      cabin,
      fareFamily: quote.fareFamily,
      refundable: quote.refundable,
      cancellationFeePaise: quote.cancellationFeePaise,
      baggage: quote.baggage,
      seatsLeft: Math.max(0, seatsLeft),
      fares: quote.fares,
      totalPaise: offerTotal(quote.fares, pax),
    };
  }
}
