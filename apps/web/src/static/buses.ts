import { findCity } from '@zproo/config';
import {
  BUS_CANCELLATION_POLICY,
  BUS_ROUTES,
  buildBusTimetable,
  busSeatFare,
  COACH_TEMPLATES,
  isoWeekday,
  localDate,
  MOCK_BUS_OPERATORS,
  pointsFor,
  unitHash,
  zonedTimeToUtc,
  type BusServicePlan,
  type CoachTemplate,
  type SeatSpec,
} from '@zproo/catalog';
import type {
  BusPoint,
  BusSearchResult,
  BusSeatInfo,
  BusSeatMap,
  BusTripOffer,
} from '@zproo/types';
import { generateBookingReference } from '@zproo/utils';
import {
  bookBusSchema,
  busSearchInputFromParams,
  busSearchSchema,
  MAX_BUS_SEATS,
} from '@zproo/validation';
import { activeHolds, newBooking } from './bookings';
import {
  currentUser,
  db,
  parse,
  save,
  StaticError,
  type StaticRequest,
  type StaticResult,
} from './core';
import { idempotencyKey } from './flights';

const IST = 'Asia/Kolkata';
const TRIP_ID = /^bs_(b\d+)_(\d{4})(\d{2})(\d{2})$/;
const CUTOFF_MS = 30 * 60 * 1000;
const GONE = 'This bus is no longer available. Please search again.';

interface Schedule {
  id: string;
  plan: BusServicePlan;
  coach: CoachTemplate;
  seats: SeatSpec[];
  distanceKm: number;
}

let schedules: Schedule[] | null = null;
function network(): Schedule[] {
  if (schedules) return schedules;
  const distance = new Map(
    BUS_ROUTES.flatMap(
      ([a, b, km]) =>
        [
          [`${a}-${b}`, km],
          [`${b}-${a}`, km],
        ] as const,
    ),
  );
  schedules = buildBusTimetable().map((plan, i) => {
    const coach = COACH_TEMPLATES.find((c) => c.key === plan.template) as CoachTemplate;
    return {
      id: `b${i + 1}`,
      plan,
      coach,
      seats: coach.seats(),
      distanceKm: distance.get(`${plan.from}-${plan.to}`) ?? 0,
    };
  });
  return schedules;
}

const cityName = (code: string) => findCity(code)?.name ?? code;
const tripId = (s: Schedule, date: string) => `bs_${s.id}_${date.replaceAll('-', '')}`;

function taken(id: string): Set<string> {
  return new Set(
    activeHolds().flatMap((h) => (h.kind === 'bus' && h.tripId === id ? h.seats : [])),
  );
}

/** Seats treated as sold before this browser's first booking: 20–70% of the coach. */
function presold(s: Schedule, date: string, seat: string): boolean {
  const load = 0.2 + unitHash(`bus-load:${s.id}:${date}`) * 0.5;
  return unitHash(`bus-seat:${s.id}:${date}:${seat}`) < load;
}

function seatInfo(s: Schedule, date: string): BusSeatInfo[] {
  const today = localDate(new Date(), IST);
  const held = taken(tripId(s, date));
  return s.seats.map((seat) => {
    const fare = busSeatFare({
      baseFarePaise: s.plan.baseFarePaise,
      seatFarePercent: seat.farePercent,
      date,
      today,
      ac: s.coach.ac,
    });
    return {
      number: seat.number,
      deck: seat.deck,
      row: seat.row,
      column: seat.column,
      kind: seat.kind,
      available: !held.has(seat.number) && !presold(s, date, seat.number),
      ladiesOnly: seat.ladiesOnly,
      ...fare,
    };
  });
}

function buildTrip(s: Schedule, date: string): BusTripOffer | null {
  const departure = zonedTimeToUtc(date, s.plan.departureTime, IST);
  if (departure.getTime() - Date.now() < CUTOFF_MS) return null;
  const arrival = new Date(departure.getTime() + s.plan.durationMinutes * 60_000);
  const seats = seatInfo(s, date);
  const open = seats.filter((x) => x.available);
  const boarding = pointsFor(s.plan.from).slice(0, 4);
  const dropping = [...pointsFor(s.plan.to)].reverse().slice(0, 4);
  const operator = MOCK_BUS_OPERATORS.find((o) => o.code === s.plan.operatorCode);
  const point = (
    kind: 'b' | 'd',
    [name, address]: [string, string],
    i: number,
    n: number,
  ): BusPoint => ({
    id: `${kind}${i + 1}`,
    name,
    address,
    time: new Date(
      kind === 'b'
        ? departure.getTime() + i * 15 * 60_000
        : arrival.getTime() - (n - 1 - i) * 15 * 60_000,
    ).toISOString(),
  });
  return {
    id: tripId(s, date),
    provider: 'mock',
    serviceNumber: s.plan.serviceNumber,
    operator: {
      code: s.plan.operatorCode,
      name: operator?.name ?? s.plan.operatorCode,
      rating: operator?.rating ?? 4,
      ratingCount: operator?.ratingCount ?? 0,
    },
    bus: { name: s.coach.name, type: s.coach.type, ac: s.coach.ac, electric: s.coach.electric },
    from: { code: s.plan.from, name: cityName(s.plan.from) },
    to: { code: s.plan.to, name: cityName(s.plan.to) },
    date,
    departureAt: departure.toISOString(),
    arrivalAt: arrival.toISOString(),
    durationMinutes: s.plan.durationMinutes,
    distanceKm: s.distanceKm,
    amenities: s.coach.amenities,
    fromPaise: open.length > 0 ? Math.min(...open.map((x) => x.pricePaise)) : 0,
    seatsAvailable: open.length,
    totalSeats: seats.length,
    boardingPoints: boarding.map((p, i) => point('b', p, i, boarding.length)),
    droppingPoints: dropping.map((p, i) => point('d', p, i, dropping.length)),
    cancellationPolicy: BUS_CANCELLATION_POLICY,
  };
}

function load(id: string): { schedule: Schedule; date: string } | null {
  const m = TRIP_ID.exec(id);
  const schedule = m && network().find((s) => s.id === m[1]);
  if (!m || !schedule) return null;
  const date = `${m[2]}-${m[3]}-${m[4]}`;
  return schedule.plan.daysOfWeek.includes(isoWeekday(date)) ? { schedule, date } : null;
}

function seatMap(id: string): BusSeatMap | null {
  const found = load(id);
  if (!found || !buildTrip(found.schedule, found.date)) return null;
  const seats = seatInfo(found.schedule, found.date);
  const decks = (['LOWER', 'UPPER'] as const)
    .map((deck) => {
      const list = seats.filter((x) => x.deck === deck);
      return {
        deck,
        rows: Math.max(0, ...list.map((x) => x.row)),
        columns: Math.max(0, ...list.map((x) => x.column)) + 1,
        seats: list,
      };
    })
    .filter((d) => d.seats.length > 0);
  return { tripId: id, decks, maxSeats: MAX_BUS_SEATS };
}

export async function busRoutes(req: StaticRequest): Promise<StaticResult | null> {
  const { method, path, params } = req;

  if (method === 'GET' && path === '/buses/search') {
    const search = parse(
      busSearchSchema,
      busSearchInputFromParams({ get: (n) => params[n] ?? null }),
      'query',
    );
    const trips = network()
      .filter(
        (s) =>
          s.plan.from === search.from &&
          s.plan.to === search.to &&
          s.plan.daysOfWeek.includes(isoWeekday(search.date)),
      )
      .map((s) => buildTrip(s, search.date))
      .filter((t): t is BusTripOffer => t !== null && t.seatsAvailable > 0)
      .sort((a, b) => Date.parse(a.departureAt) - Date.parse(b.departureAt));
    const result: BusSearchResult = {
      from: search.from,
      to: search.to,
      date: search.date,
      trips,
      demo: true,
    };
    return { data: result };
  }

  if (method === 'POST' && path === '/buses/book') {
    const user = currentUser();
    const key = idempotencyKey(req);
    const input = parse(bookBusSchema, req.body, 'body');
    const existing = db().bookings.find((b) => b.userId === user.id && b.idempotencyKey === key);
    if (existing) return { status: 201, data: existing.details };

    const found = load(input.tripId);
    const trip = found && buildTrip(found.schedule, found.date);
    const map = trip && seatMap(input.tripId);
    if (!found || !trip || !map) throw new StaticError(409, 'OFFER_EXPIRED', GONE);

    const boarding = trip.boardingPoints.find((p) => p.id === input.boardingPointId);
    const dropping = trip.droppingPoints.find((p) => p.id === input.droppingPointId);
    const issues: { path: string; message: string }[] = [];
    if (!boarding)
      issues.push({ path: 'body.boardingPointId', message: 'Choose a boarding point' });
    if (!dropping)
      issues.push({ path: 'body.droppingPointId', message: 'Choose a dropping point' });
    const byNumber = new Map(map.decks.flatMap((d) => d.seats).map((x) => [x.number, x]));
    const seats = input.passengers.map((p, i) => {
      const seat = byNumber.get(p.seatNumber);
      if (!seat)
        issues.push({
          path: `body.passengers.${i}.seatNumber`,
          message: `Seat ${p.seatNumber} does not exist on this bus`,
        });
      else if (seat.ladiesOnly && p.gender !== 'FEMALE') {
        issues.push({
          path: `body.passengers.${i}.gender`,
          message: `Seat ${p.seatNumber} is reserved for women`,
        });
      }
      return seat;
    });
    if (issues.length > 0)
      throw new StaticError(400, 'VALIDATION_ERROR', 'Validation failed', issues);
    if (seats.some((x) => !x?.available)) {
      throw new StaticError(
        409,
        'SEAT_UNAVAILABLE',
        'Some of the seats you chose were just booked by someone else. Please pick other seats.',
      );
    }
    const basePaise = seats.reduce((sum, x) => sum + (x?.basePaise ?? 0), 0);
    const taxPaise = seats.reduce((sum, x) => sum + (x?.taxPaise ?? 0), 0);
    const grossTotalPaise = basePaise + taxPaise;

    // Keep static/demo booking pricing identical to the real API.
    // Coupons are validated again at booking time so the amount sent by the
    // review page and the authoritative booking amount cannot disagree.
    const promoCode = input.promoCode?.trim().toUpperCase();
    // Coupons created in the admin panel come first; the two built-in codes remain.
    // (Loaded on demand so customers only download the demo admin data when a code is actually entered.)
    const coupons = promoCode ? await import('./admin/publicCoupons') : null;
    const adminCoupon = promoCode && coupons
      ? coupons.quoteCoupon({ code: promoCode, service: 'BUS', userId: user.id, orderPaise: grossTotalPaise })
      : null;
    const discountPaise = adminCoupon
      ? adminCoupon.discountPaise
      : promoCode === 'ZPROO10'
        ? Math.floor(grossTotalPaise * 0.10)
        : promoCode === 'BUS100'
          ? Math.min(10_000, grossTotalPaise)
          : 0;
    const totalPaise = grossTotalPaise - discountPaise;

    if (totalPaise !== input.expectedTotalPaise) {
      throw new StaticError(
        409,
        'PRICE_CHANGED',
        'The fare has changed since you selected it. Please review the new price.',
        [
          {
            path: 'body.expectedTotalPaise',
            message: `The new total is ₹${(totalPaise / 100).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          },
        ],
      );
    }
    const n = seats.length;
    const seatNumbers = input.passengers.map((p) => p.seatNumber);
    const details = newBooking({
      reference: generateBookingReference(new Date()),
      serviceType: 'BUS',
      price: {
        lines: [
          { label: `Base fare — ${n} seat${n === 1 ? '' : 's'}`, amountPaise: basePaise },
          ...(taxPaise > 0 ? [{ label: 'GST', amountPaise: taxPaise }] : []),
        ],
        basePaise,
        taxesPaise: taxPaise,
        feesPaise: 0,
        discountPaise,
        totalPaise,
        currency: 'INR',
      },
      travelDate: trip.date,
      contact: input.contact,
      passengers: input.passengers.map((p, i) => ({
        id: `p${i + 1}`,
        type: p.age < 12 ? 'CHILD' : 'ADULT',
        title:
          p.gender === 'MALE'
            ? p.age < 12
              ? 'MSTR'
              : 'MR'
            : p.gender === 'FEMALE'
              ? p.age < 12
                ? 'MISS'
                : 'MS'
              : 'MX',
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: null,
        age: p.age,
        gender: p.gender,
        seatNumber: p.seatNumber,
      })),
      flights: [],
      bus: {
        offer: trip,
        seatNumbers,
        boardingPoint: boarding as BusPoint,
        droppingPoint: dropping as BusPoint,
        pnr: null,
      },
    });
    db().bookings.push({
      userId: user.id,
      idempotencyKey: key,
      details,
      holds: [{ kind: 'bus', tripId: trip.id, seats: seatNumbers }],
    });
    if (adminCoupon && coupons) coupons.redeemCoupon(adminCoupon, user.id, details.reference);
    save();
    return { status: 201, data: details, message: 'Seats held. Complete payment to confirm.' };
  }

  const seatsMatch = /^\/buses\/([^/]+)\/seats$/.exec(path);
  if (method === 'GET' && seatsMatch) {
    const map = seatMap(decodeURIComponent(seatsMatch[1] as string));
    if (!map) throw new StaticError(404, 'NOT_FOUND', GONE);
    return { data: map };
  }

  const tripMatch = /^\/buses\/([^/]+)$/.exec(path);
  if (method === 'GET' && tripMatch) {
    const found = load(decodeURIComponent(tripMatch[1] as string));
    const trip = found && buildTrip(found.schedule, found.date);
    if (!trip) throw new StaticError(404, 'NOT_FOUND', GONE);
    return { data: trip };
  }
  return null;
}
