import { bookTrainSchema, cancelTrainSchema, trainQuoteSchema } from '@zproo/validation';
import { z } from 'zod';
import { ErrorResponse, registry, successEnvelope } from '../openapi';

const bearer = [{ bearerAuth: [] }];
const json = (schema: z.ZodType) => ({ 'application/json': { schema } });
const ok = (description: string, data: z.ZodType) => ({
  description,
  content: json(successEnvelope(data)),
});
const error = (description: string) => ({ description, content: json(ErrorResponse) });
const tags = ['Trains'];

const classes = ['1A', '2A', '3A', '3E', 'SL', 'CC', 'EC', '2S'] as const;
const quotas = ['GN', 'TQ', 'LD', 'SS', 'PT'] as const;

const TrainAvailability = registry.register(
  'TrainAvailability',
  z.object({
    status: z.enum(['AVAILABLE', 'RAC', 'WAITLIST', 'REGRET', 'NOT_AVAILABLE', 'BOOKING_CLOSED']),
    count: z.number().int().nullable(),
    label: z.string().openapi({ example: 'GNWL 23', description: 'As reported by the provider' }),
    bookable: z.boolean(),
    note: z.string().nullable(),
    checkedAt: z.iso.datetime(),
  }),
);

const TrainFare = registry.register(
  'TrainFare',
  z.object({
    basePaise: z.number().int(),
    reservationPaise: z.number().int(),
    superfastPaise: z.number().int(),
    tatkalPaise: z.number().int(),
    gstPaise: z.number().int(),
    totalPaise: z.number().int().openapi({ description: 'Per passenger' }),
  }),
);

export const TrainOffer = registry.register(
  'TrainOffer',
  z.object({
    id: z.string().openapi({ description: 'Opaque offer id; pass back to refresh, quote or book' }),
    provider: z.string(),
    trainNumber: z.string(),
    trainName: z.string(),
    trainType: z.string(),
    from: z.object({ code: z.string().openapi({ example: 'PUNE' }), name: z.string() }),
    to: z.object({ code: z.string().openapi({ example: 'NDLS' }), name: z.string() }),
    date: z.string().openapi({ description: 'Boarding date (IST)' }),
    departureAt: z.iso.datetime(),
    arrivalAt: z.iso.datetime(),
    durationMinutes: z.number().int(),
    distanceKm: z.number().int(),
    runningDays: z.array(z.number().int().min(1).max(7)),
    pantry: z.boolean(),
    stops: z.array(
      z.object({
        code: z.string(),
        name: z.string(),
        arrival: z.string().nullable(),
        departure: z.string().nullable(),
        day: z.number().int(),
        distanceKm: z.number().int(),
      }),
    ),
    classes: z.array(
      z.object({
        travelClass: z.enum(classes),
        quota: z.enum(quotas),
        availability: TrainAvailability,
        fare: TrainFare.nullable(),
      }),
    ),
  }),
);

const TrainCapabilities = registry.register(
  'TrainCapabilities',
  z.object({
    provider: z.string(),
    demo: z.boolean(),
    quotas: z.array(z.enum(quotas)),
    classes: z.array(z.enum(classes)),
    maxPassengers: z.number().int(),
    maxTatkalPassengers: z.number().int(),
    advanceReservationDays: z.number().int(),
    berthPreference: z.boolean(),
    foodChoice: z.boolean(),
    confirmOnlyOption: z.boolean(),
    idRequired: z.boolean(),
    cancellation: z.boolean(),
    partialCancellation: z.boolean(),
    liveStatus: z.boolean(),
  }),
);

const PriceBreakdown = z.object({
  lines: z.array(z.object({ label: z.string(), amountPaise: z.number().int() })),
  basePaise: z.number().int(),
  taxesPaise: z.number().int(),
  feesPaise: z.number().int(),
  discountPaise: z.number().int(),
  totalPaise: z.number().int(),
  currency: z.literal('INR'),
});

/** The `train` part of BookingDetails. */
export const TrainBookingInfo = z.object({
  offer: TrainOffer,
  travelClass: z.enum(classes),
  quota: z.enum(quotas),
  confirmOnly: z.boolean(),
  provider: z.string(),
  pnr: z.string().nullable().openapi({ description: 'Set only when the provider issues one' }),
  providerReference: z.string().nullable(),
  reservationStatus: z.enum(['PENDING', 'BOOKED', 'FAILED', 'CANCELLED', 'PARTIALLY_CANCELLED']),
  chartStatus: z.string().nullable(),
  lastCheckedAt: z.iso.datetime().nullable(),
  failureReason: z.string().nullable(),
  fare: TrainFare,
  passengers: z.array(
    z.object({
      passengerId: z.string(),
      berthPreference: z.string(),
      foodChoice: z.string().nullable(),
      status: z.enum(['PENDING', 'CONFIRMED', 'RAC', 'WAITLIST', 'CANCELLED']),
      bookingStatus: z.string().nullable(),
      currentStatus: z.string().nullable(),
      coach: z.string().nullable(),
      berth: z.string().nullable(),
      berthType: z.string().nullable(),
      farePaise: z.number().int(),
      cancelledAt: z.iso.datetime().nullable(),
    }),
  ),
  cancellations: z.array(
    z.object({
      id: z.string(),
      passengerIds: z.array(z.string()),
      status: z.enum(['REQUESTED', 'COMPLETED', 'FAILED']),
      chargesPaise: z.number().int(),
      refundPaise: z.number().int(),
      failureReason: z.string().nullable(),
      createdAt: z.iso.datetime(),
      completedAt: z.iso.datetime().nullable(),
    }),
  ),
  refunds: z.array(
    z.object({
      id: z.string(),
      amountPaise: z.number().int(),
      status: z.enum(['REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED']),
      reason: z.string(),
      gatewayReference: z.string().nullable(),
      createdAt: z.iso.datetime(),
      completedAt: z.iso.datetime().nullable(),
    }),
  ),
  capabilities: z.object({
    cancellation: z.boolean(),
    partialCancellation: z.boolean(),
    liveStatus: z.boolean(),
  }),
});

const referenceParams = z.object({ reference: z.string().openapi({ example: 'ZP-2026-7K4Q2M' }) });
const idempotency = z.object({ 'Idempotency-Key': z.string() });

registry.registerPath({
  method: 'get',
  path: '/trains/capabilities',
  tags,
  summary:
    'What the configured railway provider supports (quotas, classes, limits, cancellation, live status)',
  responses: { 200: ok('Capabilities', TrainCapabilities) },
});

registry.registerPath({
  method: 'get',
  path: '/trains/stations',
  tags,
  summary: 'Station autocomplete by code, name or city',
  request: {
    query: z.object({
      q: z.string().optional().openapi({ example: 'pun' }),
      limit: z.number().int().optional(),
    }),
  },
  responses: {
    200: ok(
      'Stations',
      z.array(
        z.object({ code: z.string(), name: z.string(), city: z.string(), state: z.string() }),
      ),
    ),
  },
});

registry.registerPath({
  method: 'get',
  path: '/trains/search',
  tags,
  summary: 'Trains between two stations with class-wise availability and fares',
  description: 'Results are cached for 60 s; availability is re-checked live before booking.',
  request: {
    query: z.object({
      from: z.string().openapi({ example: 'PUNE' }),
      to: z.string().openapi({ example: 'NDLS' }),
      date: z.string().optional().openapi({ example: '2026-10-25' }),
      class: z.enum(classes).optional(),
      quota: z.enum(quotas).optional(),
      passengers: z.number().int().min(1).max(6).optional(),
    }),
  },
  responses: {
    200: ok(
      'Trains in departure order',
      z.object({
        from: z.string(),
        to: z.string(),
        date: z.string(),
        quota: z.enum(quotas),
        travelClass: z.string(),
        passengers: z.number().int(),
        trains: z.array(TrainOffer),
        demo: z
          .boolean()
          .openapi({ description: 'True for the development provider (not real trains)' }),
        capabilities: TrainCapabilities,
      }),
    ),
    400: error('Invalid search or unsupported quota'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/trains/offers/{offerId}',
  tags,
  summary: 'Refresh availability and fares for one train (never cached)',
  request: {
    params: z.object({ offerId: z.string() }),
    query: z.object({ quota: z.enum(quotas).optional() }),
  },
  responses: { 200: ok('Train', TrainOffer), 404: error('No longer runs on this date') },
});

registry.registerPath({
  method: 'post',
  path: '/trains/quote',
  tags,
  summary: 'Server-calculated fare and live availability for a class, quota and passenger count',
  request: { body: { content: json(trainQuoteSchema) } },
  responses: {
    200: ok(
      'Quote',
      z.object({
        offerId: z.string(),
        travelClass: z.enum(classes),
        quota: z.enum(quotas),
        passengers: z.number().int(),
        availability: TrainAvailability,
        perPassenger: TrainFare,
        price: PriceBreakdown,
        quotedAt: z.iso.datetime(),
        warnings: z.array(z.string()),
        demo: z.boolean(),
      }),
    ),
    409: error('OFFER_EXPIRED'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/trains/book',
  tags,
  summary: 'Create a train booking awaiting payment',
  description:
    'Requires an `Idempotency-Key`. Re-checks the fare and availability live; the reservation ' +
    'is requested from the railway provider only after the payment is verified. The booking is ' +
    'PROCESSING until the provider answers, then CONFIRMED (with PNR) or REFUND_PENDING.',
  security: bearer,
  request: { headers: idempotency, body: { content: json(bookTrainSchema) } },
  responses: {
    201: { description: 'Booking created (see BookingDetails)' },
    400: error('Invalid passengers, quota rules or options'),
    401: error('Not signed in'),
    409: error('OFFER_EXPIRED, SOLD_OUT or PRICE_CHANGED'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/trains/bookings/{reference}/refresh',
  tags,
  summary: 'Re-check the reservation (pending outcome, PNR and passenger status) with the provider',
  security: bearer,
  request: { params: referenceParams },
  responses: { 200: { description: 'BookingDetails' }, 404: error('Not found') },
});

registry.registerPath({
  method: 'post',
  path: '/trains/bookings/{reference}/cancellation-quote',
  tags,
  summary: 'Cancellation charges and refund for some or all passengers',
  security: bearer,
  request: { params: referenceParams, body: { content: json(cancelTrainSchema) } },
  responses: {
    200: ok(
      'Quote',
      z.object({
        eligible: z.boolean(),
        reason: z.string().nullable(),
        passengerIds: z.array(z.string()),
        farePaise: z.number().int(),
        chargesPaise: z.number().int(),
        refundPaise: z.number().int(),
        rules: z.array(z.string()),
        demo: z.boolean(),
      }),
    ),
  },
});

registry.registerPath({
  method: 'post',
  path: '/trains/bookings/{reference}/cancel',
  tags,
  summary: 'Cancel passengers with the provider and refund what the rules allow',
  description: 'Requires an `Idempotency-Key`; a retry returns (or resumes) the same cancellation.',
  security: bearer,
  request: {
    params: referenceParams,
    headers: idempotency,
    body: { content: json(cancelTrainSchema) },
  },
  responses: {
    200: { description: 'BookingDetails' },
    409: error('INVALID_STATE (not cancellable now)'),
    502: error('PROVIDER_ERROR (outcome unknown; retry with the same key)'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/trains/{trainNumber}/live-status',
  tags,
  summary: 'Running status, when the provider supports it (`supported: false` otherwise)',
  request: { params: z.object({ trainNumber: z.string() }), query: z.object({ date: z.string() }) },
  responses: { 200: { description: 'TrainLiveStatus' } },
});
