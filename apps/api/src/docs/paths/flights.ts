import { bookFlightSchema } from '@zproo/validation';
import { BookingStatus, CabinClass, PaymentStatus } from '@zproo/types';
import { z } from 'zod';
import { offerQuerySchema } from '../../controllers/flights.controller';
import { ErrorResponse, registry, successEnvelope } from '../openapi';
import { BusBookingInfo } from './buses';
import { TrainBookingInfo } from './trains';

const bearer = [{ bearerAuth: [] }];
const json = (schema: z.ZodType) => ({ 'application/json': { schema } });
const ok = (description: string, data: z.ZodType) => ({
  description,
  content: json(successEnvelope(data)),
});
const error = (description: string) => ({ description, content: json(ErrorResponse) });
const paise = (description: string) =>
  z
    .number()
    .int()
    .openapi({ description: `${description} (paise)` });
const cabin = z.enum(Object.values(CabinClass) as [string, ...string[]]);

const Airport = z.object({
  code: z.string(),
  city: z.string(),
  name: z.string(),
  country: z.string(),
  timezone: z.string(),
});
const Airline = z.object({ code: z.string(), name: z.string() });
const PaxFare = z.object({
  basePaise: z.number().int(),
  taxesPaise: z.number().int(),
  totalPaise: z.number().int(),
});

const FlightOffer = registry.register(
  'FlightOffer',
  z.object({
    id: z.string().openapi({ description: 'Opaque offer id; pass back to fetch or book it' }),
    provider: z.string(),
    airline: Airline,
    flightNumber: z.string(),
    from: Airport,
    to: Airport,
    departureAt: z.iso.datetime(),
    arrivalAt: z.iso.datetime(),
    durationMinutes: z.number().int(),
    stops: z.number().int(),
    segments: z.array(
      z.object({
        airline: Airline,
        flightNumber: z.string(),
        from: Airport,
        to: Airport,
        departureAt: z.iso.datetime(),
        arrivalAt: z.iso.datetime(),
        durationMinutes: z.number().int(),
        aircraft: z.string(),
      }),
    ),
    layovers: z.array(z.object({ airport: Airport, minutes: z.number().int() })),
    cabin,
    fareFamily: z.string(),
    refundable: z.boolean(),
    cancellationFeePaise: z.number().int().nullable(),
    baggage: z.object({ cabinKg: z.number(), checkInKg: z.number() }),
    seatsLeft: z.number().int(),
    fares: z.object({ ADULT: PaxFare, CHILD: PaxFare, INFANT: PaxFare }),
    totalPaise: paise('Price for the searched passengers'),
  }),
);

const FlightSearchResult = registry.register(
  'FlightSearchResult',
  z.object({
    legs: z.array(
      z.object({
        from: z.string(),
        to: z.string(),
        date: z.string(),
        offers: z.array(FlightOffer),
      }),
    ),
    passengers: z.object({
      adults: z.number().int(),
      children: z.number().int(),
      infants: z.number().int(),
    }),
    cabin,
    demo: z
      .boolean()
      .openapi({ description: 'True when results come from the development provider' }),
  }),
);

const BookingDetails = registry.register(
  'BookingDetails',
  z.object({
    reference: z.string().openapi({ example: 'ZP-2026-7K4Q2M' }),
    serviceType: z.enum(['FLIGHT', 'BUS', 'TRAIN']),
    status: z.enum(Object.values(BookingStatus) as [string, ...string[]]),
    paymentStatus: z.enum(Object.values(PaymentStatus) as [string, ...string[]]),
    createdAt: z.iso.datetime(),
    holdExpiresAt: z.iso.datetime().nullable(),
    confirmedAt: z.iso.datetime().nullable(),
    cancelledAt: z.iso.datetime().nullable(),
    travelDate: z.string(),
    price: z.object({
      lines: z.array(z.object({ label: z.string(), amountPaise: z.number().int() })),
      basePaise: z.number().int(),
      taxesPaise: z.number().int(),
      feesPaise: z.number().int(),
      discountPaise: z.number().int(),
      totalPaise: z.number().int(),
      currency: z.literal('INR'),
    }),
    contact: z.object({ email: z.string(), phone: z.string() }),
    passengers: z.array(
      z.object({
        id: z.string(),
        type: z.string(),
        title: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        dateOfBirth: z.string().nullable(),
        age: z.number().int().nullable(),
        gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
        seatNumber: z.string().nullable(),
      }),
    ),
    flights: z.array(
      z.object({
        sequence: z.number().int(),
        offer: FlightOffer,
        pnr: z.string().nullable(),
        tickets: z.array(z.object({ passengerId: z.string(), ticketNumber: z.string() })),
      }),
    ),
    bus: BusBookingInfo.nullable(),
    train: TrainBookingInfo.nullable().optional(),
  }),
);

const PaymentOrder = registry.register(
  'PaymentOrder',
  z.object({
    paymentId: z.string(),
    provider: z.string(),
    providerOrderId: z.string(),
    amountPaise: z.number().int(),
    currency: z.literal('INR'),
    publicKey: z.string().nullable(),
    bookingReference: z.string(),
    holdExpiresAt: z.iso.datetime().nullable(),
  }),
);

const referenceParams = z.object({ reference: z.string().openapi({ example: 'ZP-2026-7K4Q2M' }) });

registry.registerPath({
  method: 'get',
  path: '/flights/search',
  tags: ['Flights'],
  summary: 'Search flights',
  description:
    'One way / round trip: `from`, `to`, `date`, `return`. Multi-city: `trip=MULTI_CITY&legs=PNQ.DEL.2026-10-25,DEL.GOI.2026-10-28`. ' +
    'Results may be cached for 60 seconds; prices are re-checked when booking.',
  request: {
    query: z.object({
      trip: z.enum(['ONE_WAY', 'ROUND_TRIP', 'MULTI_CITY']).optional(),
      from: z.string().optional().openapi({ example: 'PNQ' }),
      to: z.string().optional().openapi({ example: 'DEL' }),
      date: z.string().optional().openapi({ example: '2026-10-25' }),
      return: z.string().optional(),
      legs: z.string().optional(),
      adults: z.string().optional(),
      children: z.string().optional(),
      infants: z.string().optional(),
      cabin: cabin.optional(),
    }),
  },
  responses: {
    200: ok('Offers per leg, cheapest first', FlightSearchResult),
    400: error('Invalid search'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/flights/{offerId}',
  tags: ['Flights'],
  summary: 'Current price and availability of one offer',
  request: { params: z.object({ offerId: z.string() }), query: offerQuerySchema },
  responses: { 200: ok('Offer', FlightOffer), 404: error('Offer no longer available') },
});

registry.registerPath({
  method: 'post',
  path: '/flights/book',
  tags: ['Flights'],
  summary: 'Hold seats and create a booking awaiting payment',
  description:
    'Requires an `Idempotency-Key` header; retrying with the same key returns the same booking. ' +
    'Seats are held for BOOKING_HOLD_MINUTES; unpaid bookings are then cancelled.',
  security: bearer,
  request: {
    headers: z.object({
      'Idempotency-Key': z.string().openapi({ example: '3f1c3c8e-4a1b-4f7e-9d7a-0a2c9b9f6e11' }),
    }),
    body: { content: json(bookFlightSchema) },
  },
  responses: {
    201: ok('Booking created', BookingDetails),
    400: error('Invalid passengers or missing Idempotency-Key'),
    401: error('Not signed in'),
    409: error('OFFER_EXPIRED, PRICE_CHANGED or SOLD_OUT'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/bookings',
  tags: ['Bookings'],
  summary: "The signed-in user's bookings, newest first",
  security: bearer,
  responses: {
    200: ok(
      'Bookings',
      z.array(
        z.object({
          reference: z.string(),
          serviceType: z.string(),
          status: z.string(),
          paymentStatus: z.string(),
          title: z.string(),
          subtitle: z.string(),
          travelDate: z.string(),
          totalPaise: z.number().int(),
          createdAt: z.iso.datetime(),
        }),
      ),
    ),
  },
});

registry.registerPath({
  method: 'get',
  path: '/bookings/{reference}',
  tags: ['Bookings'],
  summary: 'Booking details (owner, or staff with booking:read:any)',
  security: bearer,
  request: { params: referenceParams },
  responses: { 200: ok('Booking', BookingDetails), 404: error('Not found') },
});

registry.registerPath({
  method: 'get',
  path: '/bookings/{reference}/ticket.pdf',
  tags: ['Bookings'],
  summary: 'Download the e-ticket (confirmed bookings only)',
  security: bearer,
  request: { params: referenceParams },
  responses: {
    200: {
      description: 'PDF e-ticket',
      content: { 'application/pdf': { schema: z.string().openapi({ format: 'binary' }) } },
    },
    404: error('Not found'),
    409: error('Booking not confirmed'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/payments/create',
  tags: ['Payments'],
  summary: 'Create (or reuse) the payment order for a booking',
  description: 'The amount always comes from the booking on the server.',
  security: bearer,
  request: { body: { content: json(z.object({ bookingReference: z.string() })) } },
  responses: {
    201: ok('Payment order', PaymentOrder),
    404: error('Booking not found'),
    409: error('Booking not awaiting payment, or hold expired'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/payments/verify',
  tags: ['Payments'],
  summary: "Verify the gateway's payment signature and confirm the booking",
  security: bearer,
  request: {
    body: {
      content: json(
        z.object({
          paymentId: z.string(),
          providerPaymentId: z.string(),
          signature: z.string(),
          method: z.string().optional(),
        }),
      ),
    },
  },
  responses: {
    200: ok('Payment captured; booking confirmed', z.object({ reference: z.string() })),
    402: error('Signature did not verify'),
    409: error('Seat hold expired before payment'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/payments/{paymentId}/fail',
  tags: ['Payments'],
  summary: 'Record a failed or abandoned payment attempt',
  security: bearer,
  request: {
    params: z.object({ paymentId: z.string() }),
    body: { content: json(z.object({ reason: z.string() })) },
  },
  responses: { 200: ok('Recorded', z.null()), 404: error('Payment not found') },
});
