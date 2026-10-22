import {
  allocateBerths,
  buildTrainOffer,
  findTrainPlan,
  journeyAvailability,
  localDate,
  maxSellable,
  MOCK_TRAIN_MAX_PASSENGERS,
  MOCK_TRAIN_MAX_TATKAL_PASSENGERS,
  MOCK_TRAIN_QUOTAS,
  parseTrainOfferId,
  presoldCount,
  RAIL_TZ,
  searchTrainJourneys,
  TRAIN_ADVANCE_DAYS,
  TRAIN_CANCELLATION_RULES,
  TRAIN_CHART_MINUTES,
  trainCancellationCharge,
  trainJourney,
  type TrainJourney,
} from '@zproo/catalog';
import { TRAIN_STATIONS } from '@zproo/config';
import {
  TrainClass,
  type BookingDetails,
  type TrainBookingInfo,
  type TrainCapabilities,
  type TrainCancellationQuote,
  type TrainClass as TrainClassType,
  type TrainLiveStatus,
  type TrainOffer,
  type TrainQuota,
  type TrainQuote,
  type TrainSearchResult,
} from '@zproo/types';
import { generateBookingReference, trainAvailabilityWarnings, trainQuotePrice } from '@zproo/utils';
import {
  bookTrainSchema,
  cancelTrainSchema,
  trainQuoteSchema,
  trainSearchInputFromParams,
  trainSearchSchema,
} from '@zproo/validation';
import { newBooking } from './bookings';
import * as publicCoupons from './admin/publicCoupons';
import {
  currentUser,
  db,
  notFound,
  parse,
  randomDigits,
  randomId,
  save,
  StaticError,
  type StaticRequest,
  type StaticResult,
  type StoredBooking,
} from './core';
import { idempotencyKey } from './flights';

/*
 * Static mode: the same railway API as the server (apps/api, MockTrainProvider), answered in the
 * browser from the shared demo network in @zproo/catalog. Places sold in this browser are kept in
 * localStorage. Everything is a demo: invented trains, demo PNRs ("ZD…"), simulated payments.
 */

const PROVIDER = 'mock';
const GONE = 'This train is no longer available on this date. Please search again.';

export const STATIC_TRAIN_CAPABILITIES: TrainCapabilities = {
  provider: PROVIDER,
  demo: true,
  quotas: MOCK_TRAIN_QUOTAS,
  classes: Object.values(TrainClass),
  maxPassengers: MOCK_TRAIN_MAX_PASSENGERS,
  maxTatkalPassengers: MOCK_TRAIN_MAX_TATKAL_PASSENGERS,
  advanceReservationDays: TRAIN_ADVANCE_DAYS,
  berthPreference: true,
  foodChoice: true,
  confirmOnlyOption: true,
  idRequired: false,
  cancellation: true,
  partialCancellation: true,
  liveStatus: false,
};

const invKey = (train: string, runDate: string, c: string, quota: string) =>
  `${train}|${runDate}|${c}|${quota}`;
const soldHere = (j: TrainJourney, c: string, quota: string) =>
  db().trainInventory[invKey(j.plan.number, j.runDate, c, quota)] ?? 0;

function journeyOf(offerId: string): TrainJourney | null {
  const key = parseTrainOfferId(offerId);
  const plan = key && findTrainPlan(key.number);
  return plan && key ? trainJourney(plan, key.from, key.to, key.date) : null;
}

function offerFor(
  offerId: string,
  quota: TrainQuota,
  travelClass?: TrainClassType,
): TrainOffer | null {
  const journey = journeyOf(offerId);
  if (!journey || !MOCK_TRAIN_QUOTAS.includes(quota)) return null;
  if (travelClass && !journey.plan.classes.includes(travelClass)) return null;
  return buildTrainOffer({
    journey,
    quota,
    provider: PROVIDER,
    now: new Date(),
    travelClass,
    extraSold: (c) => soldHere(journey, c, quota),
  });
}

function checkQuota(quota: TrainQuota, path: string) {
  if (!MOCK_TRAIN_QUOTAS.includes(quota)) {
    throw new StaticError(400, 'VALIDATION_ERROR', 'Validation failed', [
      { path, message: 'This quota is not offered by the railway provider' },
    ]);
  }
}

const chartStatus = (departureAt: string) =>
  Date.parse(departureAt) - Date.now() > TRAIN_CHART_MINUTES * 60_000
    ? 'Chart not prepared'
    : 'Chart prepared';

function ownTrainBooking(
  reference: string,
): StoredBooking & { details: BookingDetails & { train: TrainBookingInfo } } {
  const user = currentUser();
  const booking = db().bookings.find((b) => b.details.reference === reference.toUpperCase());
  if (!booking || booking.userId !== user.id) throw notFound('Booking not found');
  if (!booking.details.train) throw notFound('Train booking not found');
  return booking as StoredBooking & { details: BookingDetails & { train: TrainBookingInfo } };
}

function refund(
  d: BookingDetails & { train: TrainBookingInfo },
  amountPaise: number,
  reason: string,
) {
  if (amountPaise <= 0) return;
  const now = new Date().toISOString();
  d.train.refunds.push({
    id: randomId(),
    amountPaise,
    status: 'COMPLETED',
    reason,
    gatewayReference: `mockrfnd_${randomId().slice(0, 12)}`,
    createdAt: now,
    completedAt: now,
  });
  const refunded = d.train.refunds.reduce((sum, r) => sum + r.amountPaise, 0);
  d.paymentStatus = refunded >= d.price.totalPaise ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
  if (d.status === 'REFUND_PENDING') d.status = 'REFUNDED';
}

/** Takes places and allocates berths, like the railway would after payment. */
function reserve(
  stored: StoredBooking & { details: BookingDetails & { train: TrainBookingInfo } },
): void {
  const d = stored.details;
  const t = d.train;
  const fail = (reason: string) => {
    t.reservationStatus = 'FAILED';
    t.failureReason = reason;
    t.lastCheckedAt = new Date().toISOString();
    d.status = 'REFUND_PENDING';
    d.cancelledAt = new Date().toISOString();
    refund(d, d.price.totalPaise, 'Railway reservation failed — full refund');
  };
  const journey = journeyOf(t.offer.id);
  if (!journey) return fail('This train or class is no longer available.');
  const now = new Date();
  const availability = journeyAvailability({
    journey,
    travelClass: t.travelClass,
    quota: t.quota,
    extraSold: 0,
    now,
  });
  if (!availability.bookable && availability.status !== 'REGRET')
    return fail(availability.note ?? 'Booking is not open.');
  const n = t.passengers.length;
  const presold = presoldCount({
    trainNumber: journey.plan.number,
    runDate: journey.runDate,
    travelClass: t.travelClass,
    quota: t.quota,
    today: localDate(now, RAIL_TZ),
  });
  const key = invKey(journey.plan.number, journey.runDate, t.travelClass, t.quota);
  const sold = db().trainInventory[key] ?? 0;
  if (presold + sold + n > maxSellable(t.travelClass, t.quota))
    return fail('No seats and the waiting list is full (REGRET).');
  const seats = allocateBerths({
    travelClass: t.travelClass,
    quota: t.quota,
    sold: presold + sold,
    count: n,
  });
  if (seats.length !== n) return fail('No seats and the waiting list is full (REGRET).');
  if (t.confirmOnly && seats.some((s) => s.status !== 'CONFIRMED')) {
    return fail(
      'Confirmed berths are no longer available, and you chose to book only confirmed berths.',
    );
  }
  db().trainInventory[key] = sold + n;
  t.pnr = `ZD${randomDigits(8)}`;
  t.providerReference = t.providerReference ?? `MOCKTXN-${randomDigits(10)}`;
  t.reservationStatus = 'BOOKED';
  t.chartStatus = chartStatus(t.offer.departureAt);
  t.lastCheckedAt = now.toISOString();
  t.passengers = t.passengers.map((p, i) => {
    const s = seats[i];
    return s
      ? {
          ...p,
          status: s.status,
          bookingStatus: s.label,
          currentStatus: s.label,
          coach: s.coach,
          berth: s.berth,
          berthType: s.berthType,
        }
      : p;
  });
  d.status = 'CONFIRMED';
  d.confirmedAt = now.toISOString();
}

/**
 * Called by the static payment endpoint once the (simulated) payment succeeds: the booking is
 * PROCESSING until the railway answers. Test hooks as on the server: "+railfail" in the contact
 * email fails the reservation (full refund); "+railpending" keeps it pending until a status refresh.
 */
export function fulfilTrainBooking(stored: StoredBooking): void {
  const d = stored.details;
  if (!d.train) return;
  d.status = 'PROCESSING';
  const typed = stored as StoredBooking & { details: BookingDetails & { train: TrainBookingInfo } };
  if (d.contact.email.includes('+railfail')) {
    d.train.providerReference = `MOCKTXN-${randomDigits(10)}`;
    d.train.reservationStatus = 'FAILED';
    d.train.failureReason = 'The railway system declined this reservation (simulated failure).';
    d.status = 'REFUND_PENDING';
    d.cancelledAt = new Date().toISOString();
    refund(typed.details, d.price.totalPaise, 'Railway reservation failed — full refund');
    return;
  }
  if (d.contact.email.includes('+railpending')) {
    d.train.providerReference = `MOCKTXN-${randomDigits(10)}`;
    d.train.lastCheckedAt = new Date().toISOString();
    return;
  }
  reserve(typed);
}

function cancellationQuote(
  d: BookingDetails & { train: TrainBookingInfo },
  passengerIds: string[],
): TrainCancellationQuote {
  const t = d.train;
  const fail = (reason: string, farePaise = 0): TrainCancellationQuote => ({
    eligible: false,
    reason,
    passengerIds,
    farePaise,
    chargesPaise: 0,
    refundPaise: 0,
    rules: TRAIN_CANCELLATION_RULES,
    demo: true,
  });
  const chosen = passengerIds.map((id) => t.passengers.find((p) => p.passengerId === id));
  if (chosen.some((p) => !p)) {
    throw new StaticError(400, 'VALIDATION_ERROR', 'Validation failed', [
      { path: 'body.passengerIds', message: 'Choose passengers from this booking' },
    ]);
  }
  if (d.status !== 'CONFIRMED' || !t.pnr)
    return fail('Only booked tickets with a PNR can be cancelled.');
  if (chosen.some((p) => p?.status === 'CANCELLED' || p?.status === 'PENDING'))
    return fail('One or more of these passengers are already cancelled.');
  const farePaise = chosen.reduce((sum, p) => sum + (p?.farePaise ?? 0), 0);
  let charges = 0;
  for (const p of chosen) {
    const r = trainCancellationCharge({
      travelClass: t.travelClass,
      quota: t.quota,
      status: p?.status as 'CONFIRMED',
      farePaise: p?.farePaise ?? 0,
      departureAt: new Date(t.offer.departureAt),
      now: new Date(),
    });
    if ('reason' in r) return fail(r.reason, farePaise);
    charges += r.chargePaise;
  }
  return {
    eligible: true,
    reason: null,
    passengerIds,
    farePaise,
    chargesPaise: charges,
    refundPaise: farePaise - charges,
    rules: TRAIN_CANCELLATION_RULES,
    demo: true,
  };
}

export function trainRoutes(req: StaticRequest): StaticResult | null {
  const { method, path, params, body } = req;
  if (!path.startsWith('/trains')) return null;

  if (method === 'GET' && path === '/trains/capabilities')
    return { data: STATIC_TRAIN_CAPABILITIES };

  if (method === 'GET' && path === '/trains/stations') {
    const q = (params.q ?? '').trim().toLowerCase();
    const limit = Math.min(20, Math.max(1, Number(params.limit) || 8));
    const list = TRAIN_STATIONS.filter(
      (s) =>
        !q ||
        s.code.toLowerCase().startsWith(q) ||
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q),
    ).slice(0, limit);
    return {
      data: list.map((s) => ({ code: s.code, name: s.name, city: s.city, state: s.state })),
    };
  }

  if (method === 'GET' && path === '/trains/search') {
    const search = parse(
      trainSearchSchema,
      trainSearchInputFromParams({ get: (n) => params[n] ?? null }),
      'query',
    );
    checkQuota(search.quota, 'query.quota');
    const travelClass = search.travelClass === 'ALL' ? undefined : search.travelClass;
    const now = new Date();
    const trains = searchTrainJourneys(search.from, search.to, search.date)
      .filter((j) => !travelClass || j.plan.classes.includes(travelClass))
      .map((journey) =>
        buildTrainOffer({
          journey,
          quota: search.quota,
          provider: PROVIDER,
          now,
          travelClass,
          extraSold: (c) => soldHere(journey, c, search.quota),
        }),
      );
    const result: TrainSearchResult = {
      from: search.from,
      to: search.to,
      date: search.date,
      quota: search.quota,
      travelClass: search.travelClass,
      passengers: search.passengers,
      trains,
      demo: true,
      capabilities: STATIC_TRAIN_CAPABILITIES,
    };
    return { data: result };
  }

  const offerMatch = /^\/trains\/offers\/([^/]+)$/.exec(path);
  if (method === 'GET' && offerMatch) {
    const quota = (params.quota ?? 'GN') as TrainQuota;
    checkQuota(quota, 'query.quota');
    const offer = offerFor(decodeURIComponent(offerMatch[1] as string), quota);
    if (!offer) throw notFound(GONE);
    return { data: offer };
  }

  if (method === 'POST' && path === '/trains/quote') {
    const input = parse(trainQuoteSchema, body, 'body');
    checkQuota(input.quota, 'body.quota');
    const max = input.quota === 'TQ' ? MOCK_TRAIN_MAX_TATKAL_PASSENGERS : MOCK_TRAIN_MAX_PASSENGERS;
    if (input.passengers > max) {
      throw new StaticError(400, 'VALIDATION_ERROR', 'Validation failed', [
        { path: 'body.passengers', message: `Up to ${max} passengers per ticket` },
      ]);
    }
    const offer = offerFor(input.offerId, input.quota, input.travelClass);
    const option = offer?.classes.find((c) => c.travelClass === input.travelClass);
    if (!offer || !option?.fare)
      throw new StaticError(
        409,
        'OFFER_EXPIRED',
        'This train or class is no longer available. Please search again.',
      );
    const quote: TrainQuote = {
      offerId: offer.id,
      travelClass: option.travelClass,
      quota: option.quota,
      passengers: input.passengers,
      availability: option.availability,
      perPassenger: option.fare,
      price: trainQuotePrice(option.fare, input.passengers, 0),
      quotedAt: new Date().toISOString(),
      warnings: trainAvailabilityWarnings(option.availability, input.passengers, input.quota),
      demo: true,
    };
    return { data: quote };
  }

  if (method === 'POST' && path === '/trains/book') {
    const user = currentUser();
    const key = idempotencyKey(req);
    const input = parse(bookTrainSchema, body, 'body');
    const existing = db().bookings.find((b) => b.userId === user.id && b.idempotencyKey === key);
    if (existing) return { status: 201, data: existing.details };
    checkQuota(input.quota, 'body.quota');
    const n = input.passengers.length;
    const offer = offerFor(input.offerId, input.quota, input.travelClass);
    const option = offer?.classes.find((c) => c.travelClass === input.travelClass);
    if (!offer || !option?.fare)
      throw new StaticError(
        409,
        'OFFER_EXPIRED',
        'This train or class is no longer available. Please search again.',
      );
    const issues = input.passengers.flatMap((p, i) =>
      p.foodChoice && !offer.pantry
        ? [
            {
              path: `body.passengers.${i}.foodChoice`,
              message: 'Food choice is not offered on this train',
            },
          ]
        : [],
    );
    if (issues.length > 0)
      throw new StaticError(400, 'VALIDATION_ERROR', 'Validation failed', issues);
    if (!option.availability.bookable) {
      throw new StaticError(
        409,
        'SOLD_OUT',
        option.availability.note ??
          `${option.availability.label}: this class cannot be booked now.`,
      );
    }
    if (
      input.confirmOnly &&
      (option.availability.status !== 'AVAILABLE' || (option.availability.count ?? 0) < n)
    ) {
      throw new StaticError(
        409,
        'SOLD_OUT',
        'Confirmed berths are not available for every passenger. Untick "Book only if confirmed berths are available" to accept RAC or waiting list.',
      );
    }
    const gross = trainQuotePrice(option.fare, n, 0);
    // Same rules as the API: an admin coupon valid on trains comes off the whole fare.
    const promo = input.promoCode?.trim().toUpperCase();
    const adminCoupon = promo ? publicCoupons.quoteCoupon({ code: promo, service: 'TRAIN', userId: user.id, orderPaise: gross.totalPaise }) : null;
    if (promo && !adminCoupon) {
      throw new StaticError(400, 'VALIDATION_ERROR', 'Validation failed', [{ path: 'body.promoCode', message: 'Invalid or expired coupon code' }]);
    }
    const discountPaise = adminCoupon?.discountPaise ?? 0;
    const price = { ...gross, discountPaise, totalPaise: gross.totalPaise - discountPaise };
    const shareOf = (i: number) => Math.floor(discountPaise / n) + (i === 0 ? discountPaise % n : 0);
    if (price.totalPaise !== input.expectedTotalPaise) {
      throw new StaticError(
        409,
        'PRICE_CHANGED',
        'The fare has changed since you selected it. Please review the new price.',
        [
          {
            path: 'body.expectedTotalPaise',
            message: `The new total is ₹${(price.totalPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          },
        ],
      );
    }
    const fare = option.fare;
    const details = newBooking({
      reference: generateBookingReference(new Date()),
      serviceType: 'TRAIN',
      price,
      travelDate: offer.date,
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
        seatNumber: null,
      })),
      flights: [],
      bus: null,
      train: {
        offer: { ...offer, classes: [option] },
        travelClass: input.travelClass,
        quota: input.quota,
        confirmOnly: input.confirmOnly,
        provider: PROVIDER,
        pnr: null,
        providerReference: null,
        reservationStatus: 'PENDING',
        chartStatus: null,
        lastCheckedAt: null,
        failureReason: null,
        fare,
        passengers: input.passengers.map((p, i) => ({
          passengerId: `p${i + 1}`,
          berthPreference: p.berthPreference,
          foodChoice: p.foodChoice ?? null,
          status: 'PENDING',
          bookingStatus: null,
          currentStatus: null,
          coach: null,
          berth: null,
          berthType: null,
          farePaise: Math.max(0, fare.totalPaise - shareOf(i)),
          cancelledAt: null,
        })),
        cancellations: [],
        refunds: [],
        capabilities: { cancellation: true, partialCancellation: true, liveStatus: false },
      },
    });
    db().bookings.push({
      userId: user.id,
      idempotencyKey: key,
      details,
      holds: [],
      train: { confirmOnly: input.confirmOnly, cancellationKeys: {} },
    });
    if (adminCoupon) publicCoupons.redeemCoupon(adminCoupon, user.id, details.reference);
    save();
    return {
      status: 201,
      data: details,
      message: 'Fare locked. Complete payment to request your reservation.',
    };
  }

  const refresh = /^\/trains\/bookings\/([^/]+)\/refresh$/.exec(path);
  if (method === 'POST' && refresh) {
    const stored = ownTrainBooking(refresh[1] as string);
    const d = stored.details;
    if (d.status === 'PROCESSING' && d.train.reservationStatus === 'PENDING') reserve(stored);
    else if (d.train.pnr) {
      d.train.chartStatus = chartStatus(d.train.offer.departureAt);
      d.train.lastCheckedAt = new Date().toISOString();
    }
    save();
    return { data: d };
  }

  const cq = /^\/trains\/bookings\/([^/]+)\/cancellation-quote$/.exec(path);
  if (method === 'POST' && cq) {
    const { passengerIds } = parse(cancelTrainSchema, body, 'body');
    return { data: cancellationQuote(ownTrainBooking(cq[1] as string).details, passengerIds) };
  }

  const cancel = /^\/trains\/bookings\/([^/]+)\/cancel$/.exec(path);
  if (method === 'POST' && cancel) {
    const key = idempotencyKey(req);
    const { passengerIds } = parse(cancelTrainSchema, body, 'body');
    const stored = ownTrainBooking(cancel[1] as string);
    const d = stored.details;
    stored.train ??= { confirmOnly: d.train.confirmOnly, cancellationKeys: {} };
    if (stored.train.cancellationKeys[key]) return { data: d, message: 'Cancellation processed' };
    const quote = cancellationQuote(d, passengerIds);
    if (!quote.eligible)
      throw new StaticError(
        409,
        'INVALID_STATE',
        quote.reason ?? 'This booking cannot be cancelled now.',
      );
    const now = new Date().toISOString();
    const id = randomId();
    d.train.passengers = d.train.passengers.map((p) =>
      passengerIds.includes(p.passengerId)
        ? { ...p, status: 'CANCELLED', currentStatus: 'CAN', cancelledAt: now }
        : p,
    );
    d.train.cancellations.push({
      id,
      passengerIds,
      status: 'COMPLETED',
      chargesPaise: quote.chargesPaise,
      refundPaise: quote.refundPaise,
      failureReason: null,
      createdAt: now,
      completedAt: now,
    });
    const remaining = d.train.passengers.filter((p) => p.status !== 'CANCELLED').length;
    d.train.reservationStatus = remaining === 0 ? 'CANCELLED' : 'PARTIALLY_CANCELLED';
    if (remaining === 0) {
      d.status = quote.refundPaise > 0 ? 'REFUND_PENDING' : 'CANCELLED';
      d.cancelledAt = now;
    }
    const journey = journeyOf(d.train.offer.id);
    if (journey) {
      const k = invKey(journey.plan.number, journey.runDate, d.train.travelClass, d.train.quota);
      db().trainInventory[k] = Math.max(0, (db().trainInventory[k] ?? 0) - passengerIds.length);
    }
    refund(
      d,
      quote.refundPaise,
      `Cancellation of ${passengerIds.length} passenger${passengerIds.length === 1 ? '' : 's'}`,
    );
    stored.train.cancellationKeys[key] = id;
    save();
    return { data: d, message: 'Cancellation processed' };
  }

  const live = /^\/trains\/([^/]+)\/live-status$/.exec(path);
  if (method === 'GET' && live) {
    const status: TrainLiveStatus = {
      supported: false,
      trainNumber: decodeURIComponent(live[1] as string),
      date: params.date ?? '',
      message:
        'Live running status needs a railway data provider. The demo provider has no live train data, so none is shown.',
      lastUpdatedAt: null,
      stale: false,
      state: null,
      currentStation: null,
      delayMinutes: null,
      stations: [],
    };
    return { data: status };
  }
  return null;
}
