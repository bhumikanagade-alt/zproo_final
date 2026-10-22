import { airportTimezone, findAirport } from '@zproo/config';
import {
  addDaysIso,
  buildTimetable,
  daysBetweenIso,
  isoWeekday,
  localDate,
  MOCK_AIRLINES,
  planSeats,
  quoteFare,
  unitHash,
  zonedTimeToUtc,
  type FlightPlan,
} from '@zproo/catalog';
import type {
  AirportInfo,
  CabinClass,
  FlightOffer,
  FlightSearchResult,
  FlightSegmentInfo,
  PaxCounts,
} from '@zproo/types';
import {
  flightPriceBreakdown,
  generateBookingReference,
  offerTotal,
  seatSummary,
  validateAddOns,
} from '@zproo/utils';
import {
  bookFlightSchema,
  documentVerification,
  flightSearchInputFromParams,
  flightSearchSchema,
  internationalDocumentIssues,
  isInternationalItinerary,
  passengerAgeIssues,
} from '@zproo/validation';
import { activeHolds, newBooking } from './bookings';
import * as publicCoupons from './admin/publicCoupons';
import {
  currentUser,
  db,
  parse,
  save,
  StaticError,
  type StaticRequest,
  type StaticResult,
} from './core';

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
const OFFER_ID = /^mk_(f\d+)_(\d{4})(\d{2})(\d{2})_([EPBF])$/;
const CUTOFF_MS = 2 * 60 * 60 * 1000;

interface Service {
  id: string;
  plan: FlightPlan;
}

let services: Service[] | null = null;
const timetable = () =>
  (services ??= buildTimetable().map((plan, i) => ({ id: `f${i + 1}`, plan })));

function airport(code: string): AirportInfo {
  const a = findAirport(code);
  if (!a) throw new Error(`Unknown airport ${code}`);
  return {
    code: a.code,
    city: a.city,
    name: a.name,
    country: a.country,
    timezone: airportTimezone(a),
  };
}

const airlineName = (code: string) => MOCK_AIRLINES.find((a) => a.code === code)?.name ?? code;

/** Seats this browser's bookings hold on a service. */
function heldSeats(offerKey: string): number {
  return activeHolds()
    .flatMap((h) => (h.kind === 'flight' && h.offerId === offerKey ? [h.seats] : []))
    .reduce((a, b) => a + b, 0);
}

function buildOffer(
  service: Service,
  date: string,
  cabin: CabinClass,
  pax: PaxCounts,
): FlightOffer | null {
  const { plan } = service;
  const total = planSeats(plan)[cabin];
  if (total === 0) return null;
  const first = plan.segments[0];
  const last = plan.segments.at(-1);
  if (!first || !last) return null;
  const origin = airport(first.from);
  const now = new Date();
  const segments: FlightSegmentInfo[] = plan.segments.map((s) => {
    const from = airport(s.from);
    const departure = zonedTimeToUtc(addDaysIso(date, s.dayOffset), s.departureTime, from.timezone);
    return {
      airline: { code: plan.airline, name: airlineName(plan.airline) },
      flightNumber: plan.flightNumber,
      from,
      to: airport(s.to),
      departureAt: departure.toISOString(),
      arrivalAt: new Date(departure.getTime() + s.durationMinutes * 60_000).toISOString(),
      durationMinutes: s.durationMinutes,
      aircraft: plan.aircraft,
    };
  });
  const firstSeg = segments[0] as FlightSegmentInfo;
  const lastSeg = segments.at(-1) as FlightSegmentInfo;
  if (Date.parse(firstSeg.departureAt) - now.getTime() < CUTOFF_MS) return null;

  const daysAhead = Math.max(0, daysBetweenIso(localDate(now, origin.timezone), date));
  const key = `${service.id}:${date}:${cabin}`;
  const load = Math.min(0.97, 0.35 + 0.5 * unitHash(`${key}:load`) + (daysAhead <= 3 ? 0.15 : 0));
  const id = `mk_${service.id}_${date.replaceAll('-', '')}_${CABIN_CODE[cabin]}`;
  const seatsLeft = total - Math.floor(total * load) - heldSeats(id);
  const quote = quoteFare({
    key,
    baseFarePaise: plan.baseFareRupees * 100,
    cabin,
    daysAhead,
    weekday: isoWeekday(date),
    international: origin.country !== airport(last.to).country,
  });
  return {
    id,
    provider: 'mock',
    airline: { code: plan.airline, name: airlineName(plan.airline) },
    flightNumber: plan.flightNumber,
    from: firstSeg.from,
    to: lastSeg.to,
    departureAt: firstSeg.departureAt,
    arrivalAt: lastSeg.arrivalAt,
    durationMinutes: Math.round(
      (Date.parse(lastSeg.arrivalAt) - Date.parse(firstSeg.departureAt)) / 60_000,
    ),
    stops: segments.length - 1,
    segments,
    layovers: segments.slice(1).map((s, i) => ({
      airport: s.from,
      minutes: Math.round(
        (Date.parse(s.departureAt) - Date.parse(segments[i]?.arrivalAt ?? s.departureAt)) / 60_000,
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

function searchLeg(
  from: string,
  to: string,
  date: string,
  cabin: CabinClass,
  pax: PaxCounts,
): FlightOffer[] {
  const needed = pax.adults + pax.children;
  return timetable()
    .filter(
      ({ plan }) =>
        plan.segments[0]?.from === from &&
        plan.segments.at(-1)?.to === to &&
        plan.daysOfWeek.includes(isoWeekday(date)),
    )
    .map((s) => buildOffer(s, date, cabin, pax))
    .filter((o): o is FlightOffer => o !== null && o.seatsLeft >= needed)
    .sort((a, b) => a.totalPaise - b.totalPaise);
}

function getOffer(offerId: string, pax: PaxCounts): FlightOffer | null {
  const m = OFFER_ID.exec(offerId);
  const cabin = m?.[5] ? CODE_CABIN[m[5]] : undefined;
  const service = m && timetable().find((s) => s.id === m[1]);
  if (!m || !cabin || !service) return null;
  const date = `${m[2]}-${m[3]}-${m[4]}`;
  if (!service.plan.daysOfWeek.includes(isoWeekday(date))) return null;
  return buildOffer(service, date, cabin, pax);
}

const count = (v: string | undefined, fallback: number) => {
  const n = Number(v ?? fallback);
  return Number.isInteger(n) && n >= 0 && n <= 9 ? n : fallback;
};

export function flightRoutes(req: StaticRequest): StaticResult | null {
  const { method, path, params } = req;

  if (method === 'GET' && path === '/flights/search') {
    const search = parse(
      flightSearchSchema,
      flightSearchInputFromParams({ get: (name) => params[name] ?? null }),
      'query',
    );
    const pax = { adults: search.adults, children: search.children, infants: search.infants };
    const legs =
      search.tripType === 'ROUND_TRIP' && search.returnDate && search.legs[0]
        ? [
            search.legs[0],
            { from: search.legs[0].to, to: search.legs[0].from, date: search.returnDate },
          ]
        : search.legs;
    const result: FlightSearchResult = {
      legs: legs.map((l) => ({ ...l, offers: searchLeg(l.from, l.to, l.date, search.cabin, pax) })),
      passengers: pax,
      cabin: search.cabin,
      demo: true,
    };
    return { data: result };
  }

  if (method === 'POST' && path === '/flights/book') {
    const user = currentUser();
    const key = idempotencyKey(req);
    const input = parse(bookFlightSchema, req.body, 'body');
    const existing = db().bookings.find((b) => b.userId === user.id && b.idempotencyKey === key);
    if (existing) return { status: 201, data: existing.details };

    const count = (t: string) => input.passengers.filter((p) => p.type === t).length;
    const pax = { adults: count('ADULT'), children: count('CHILD'), infants: count('INFANT') };
    if (pax.adults < 1) {
      throw new StaticError(400, 'VALIDATION_ERROR', 'Validation failed', [
        { path: 'body.passengers', message: 'At least one adult must travel' },
      ]);
    }
    const offers = input.offerIds.map((id) => getOffer(id, pax));
    if (offers.some((o) => !o)) {
      throw new StaticError(
        409,
        'OFFER_EXPIRED',
        'This fare is no longer available. Please search again.',
      );
    }
    const list = offers as FlightOffer[];
    const first = list[0] as FlightOffer;
    const travelDate = localDate(new Date(first.departureAt), first.from.timezone);
    const ages = passengerAgeIssues(input.passengers, travelDate);
    if (ages.length > 0) {
      throw new StaticError(
        400,
        'VALIDATION_ERROR',
        'Validation failed',
        ages.map((i) => ({ path: `body.passengers.${i.index}.dateOfBirth`, message: i.message })),
      );
    }
    const international = isInternationalItinerary(list);
    const lastLeg = list[list.length - 1] as FlightOffer;
    const lastTravelDate = localDate(new Date(lastLeg.departureAt), lastLeg.from.timezone);
    if (international) {
      const docs = internationalDocumentIssues(input.passengers, travelDate, lastTravelDate);
      if (docs.length > 0) {
        throw new StaticError(
          400,
          'VALIDATION_ERROR',
          'Validation failed',
          docs.map((i) => ({ path: `body.passengers.${i.index}.${i.field}`, message: i.message })),
        );
      }
    }
    // Document verification, same as the API: a valid government ID (domestic) or passport and
    // visa (international) for every traveller.
    const documentProblems = documentVerification(input.passengers, {
      international,
      travelDate,
      lastTravelDate,
      today: localDate(new Date(), 'Asia/Kolkata'),
    }).flatMap((check, index) =>
      [...check.issues, ...check.missing].map((issue) => ({
        path: `body.passengers.${index}.${issue.field}`,
        message: issue.message,
      })),
    );
    if (documentProblems.length > 0) {
      throw new StaticError(400, 'VALIDATION_ERROR', 'Validation failed', documentProblems);
    }
    const addOnIssues = validateAddOns(list, input.passengers, input.addOns);
    if (addOnIssues.length > 0) {
      throw new StaticError(400, 'VALIDATION_ERROR', 'Validation failed', addOnIssues);
    }
    const gross = flightPriceBreakdown(list, pax, input.addOns);
    // Same rules as the API: an admin coupon valid on flights comes off the whole fare (extras included).
    const promo = input.promoCode?.trim().toUpperCase();
    const adminCoupon = promo
      ? publicCoupons.quoteCoupon({ code: promo, service: 'FLIGHT', userId: user.id, orderPaise: gross.totalPaise })
      : null;
    if (promo && !adminCoupon) {
      throw new StaticError(400, 'VALIDATION_ERROR', 'Validation failed', [
        { path: 'body.promoCode', message: 'Invalid or expired coupon code' },
      ]);
    }
    const discountPaise = adminCoupon?.discountPaise ?? 0;
    if (discountPaise >= gross.totalPaise) {
      throw new StaticError(400, 'VALIDATION_ERROR', 'Validation failed', [
        {
          path: 'body.promoCode',
          message: 'This coupon would cover the whole fare, so it cannot be used on this booking',
        },
      ]);
    }
    const price = { ...gross, discountPaise, totalPaise: gross.totalPaise - discountPaise };
    if (price.totalPaise !== input.expectedTotalPaise) {
      throw new StaticError(
        409,
        'PRICE_CHANGED',
        'The fare has changed since you selected it. Please review the new price.',
      );
    }
    const seats = pax.adults + pax.children;
    if (list.some((o) => o.seatsLeft < seats)) {
      throw new StaticError(
        409,
        'SOLD_OUT',
        'Sorry, these seats just sold out. Please choose another flight.',
      );
    }
    const now = new Date();
    const details = newBooking({
      reference: generateBookingReference(now),
      serviceType: 'FLIGHT',
      price,
      travelDate,
      contact: input.contact,
      passengers: input.passengers.map((p, i) => ({
        id: `p${i + 1}`,
        type: p.type,
        title: p.title,
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: p.dateOfBirth ?? null,
        age: null,
        gender: p.gender,
        seatNumber: seatSummary(list, input.addOns, i),
      })),
      addOns: input.addOns,
      flights: list.map((offer, i) => ({ sequence: i + 1, offer, pnr: null, tickets: [] })),
      bus: null,
    });
    db().bookings.push({
      userId: user.id,
      idempotencyKey: key,
      details,
      holds: list.map((o) => ({ kind: 'flight' as const, offerId: o.id, seats })),
    });
    if (adminCoupon) publicCoupons.redeemCoupon(adminCoupon, user.id, details.reference);
    save();
    return { status: 201, data: details, message: 'Booking created. Complete payment to confirm.' };
  }

  const offerMatch = /^\/flights\/([^/]+)$/.exec(path);
  if (method === 'GET' && offerMatch) {
    const pax = {
      adults: Math.max(1, count(params.adults, 1)),
      children: count(params.children, 0),
      infants: count(params.infants, 0),
    };
    const offer = getOffer(decodeURIComponent(offerMatch[1] as string), pax);
    if (!offer)
      throw new StaticError(
        404,
        'NOT_FOUND',
        'This fare is no longer available. Please search again.',
      );
    return { data: offer };
  }
  return null;
}

export function idempotencyKey(req: StaticRequest): string {
  const key = req.headers['idempotency-key'] ?? '';
  if (key.length < 8) {
    throw new StaticError(400, 'VALIDATION_ERROR', 'Validation failed', [
      {
        path: 'headers.idempotency-key',
        message: 'Send a unique Idempotency-Key header (e.g. a UUID)',
      },
    ]);
  }
  return key;
}
