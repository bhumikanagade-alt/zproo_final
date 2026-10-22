import { bookBusSchema } from '@zproo/validation';
import { z } from 'zod';
import { ErrorResponse, registry, successEnvelope } from '../openapi';

const bearer = [{ bearerAuth: [] }];
const json = (schema: z.ZodType) => ({ 'application/json': { schema } });
const ok = (description: string, data: z.ZodType) => ({
  description,
  content: json(successEnvelope(data)),
});
const error = (description: string) => ({ description, content: json(ErrorResponse) });
const tags = ['Buses'];

const BusPoint = registry.register(
  'BusPoint',
  z.object({
    id: z.string(),
    name: z.string().openapi({ example: 'Swargate' }),
    address: z.string(),
    time: z.iso.datetime(),
  }),
);

export const BusTripOffer = registry.register(
  'BusTripOffer',
  z.object({
    id: z.string().openapi({ description: 'Opaque trip id; pass back for seats or booking' }),
    provider: z.string(),
    serviceNumber: z.string().openapi({ example: 'SSK 2130' }),
    operator: z.object({
      code: z.string(),
      name: z.string(),
      rating: z.number(),
      ratingCount: z.number().int(),
    }),
    bus: z.object({
      name: z.string(),
      type: z.enum(['SEATER', 'SLEEPER', 'SEATER_SLEEPER']),
      ac: z.boolean(),
      electric: z.boolean(),
    }),
    from: z.object({ code: z.string().openapi({ example: 'pune' }), name: z.string() }),
    to: z.object({ code: z.string().openapi({ example: 'mumbai' }), name: z.string() }),
    date: z.string(),
    departureAt: z.iso.datetime(),
    arrivalAt: z.iso.datetime(),
    durationMinutes: z.number().int(),
    distanceKm: z.number().int(),
    amenities: z.array(z.string()),
    fromPaise: z.number().int().openapi({ description: 'Cheapest open seat, incl. GST (paise)' }),
    seatsAvailable: z.number().int(),
    totalSeats: z.number().int(),
    boardingPoints: z.array(BusPoint),
    droppingPoints: z.array(BusPoint),
    cancellationPolicy: z.array(
      z.object({ hoursBefore: z.number().int(), refundPercent: z.number().int() }),
    ),
  }),
);

const BusSeat = z.object({
  number: z.string().openapi({ example: 'L4' }),
  deck: z.enum(['LOWER', 'UPPER']),
  row: z.number().int(),
  column: z.number().int(),
  kind: z.enum(['SEATER', 'SLEEPER']),
  available: z.boolean(),
  ladiesOnly: z.boolean(),
  basePaise: z.number().int(),
  taxPaise: z.number().int(),
  pricePaise: z.number().int(),
});

const BusSeatMap = registry.register(
  'BusSeatMap',
  z.object({
    tripId: z.string(),
    decks: z.array(
      z.object({
        deck: z.enum(['LOWER', 'UPPER']),
        rows: z.number().int(),
        columns: z.number().int(),
        seats: z.array(BusSeat),
      }),
    ),
    maxSeats: z.number().int(),
  }),
);

/** The `bus` part of BookingDetails. */
export const BusBookingInfo = z.object({
  offer: BusTripOffer,
  seatNumbers: z.array(z.string()),
  boardingPoint: BusPoint,
  droppingPoint: BusPoint,
  pnr: z.string().nullable(),
});

const tripParams = z.object({ tripId: z.string() });

registry.registerPath({
  method: 'get',
  path: '/buses/search',
  tags,
  summary: 'Search buses between two cities',
  description: 'City codes as in the search widget (e.g. `pune`, `mumbai`). Cached 60 s.',
  request: {
    query: z.object({
      from: z.string().openapi({ example: 'pune' }),
      to: z.string().openapi({ example: 'mumbai' }),
      date: z.string().optional().openapi({ example: '2026-10-25' }),
    }),
  },
  responses: {
    200: ok(
      'Departures in time order',
      z.object({
        from: z.string(),
        to: z.string(),
        date: z.string(),
        trips: z.array(BusTripOffer),
        demo: z.boolean(),
      }),
    ),
    400: error('Invalid search'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/buses/{tripId}',
  tags,
  summary: 'Trip details: operator, coach, amenities, points and cancellation policy',
  request: { params: tripParams },
  responses: { 200: ok('Trip', BusTripOffer), 404: error('Trip no longer sold') },
});

registry.registerPath({
  method: 'get',
  path: '/buses/{tripId}/seats',
  tags,
  summary: 'Seat layout with live availability and per-seat prices (never cached)',
  request: { params: tripParams },
  responses: { 200: ok('Seat map', BusSeatMap), 404: error('Trip no longer sold') },
});

registry.registerPath({
  method: 'post',
  path: '/buses/book',
  tags,
  summary: 'Hold seats and create a booking awaiting payment',
  description:
    'Requires an `Idempotency-Key` header. One traveller per seat, up to 6. Ladies-only seats ' +
    'require a female traveller.',
  security: bearer,
  request: {
    headers: z.object({ 'Idempotency-Key': z.string() }),
    body: { content: json(bookBusSchema) },
  },
  responses: {
    201: { description: 'Booking created (see BookingDetails)' },
    400: error('Invalid travellers, seats or points, or missing Idempotency-Key'),
    401: error('Not signed in'),
    409: error('OFFER_EXPIRED, PRICE_CHANGED or SEAT_UNAVAILABLE'),
  },
});
