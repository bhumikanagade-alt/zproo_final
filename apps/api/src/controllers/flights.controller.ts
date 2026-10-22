import {
  bookFlightSchema,
  flightSearchInputFromParams,
  flightSearchSchema,
  type BookFlightInput,
} from '@zproo/validation';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { idempotencyKey } from '../middleware/idempotency';
import { validated } from '../middleware/validate';
import type { BookingService } from '../services/booking.service';
import type { FlightService } from '../services/flight.service';
import { NotFoundError, ValidationError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { zodIssues } from '../utils/zod';
import { requestContext } from './auth.controller';

export const offerQuerySchema = z.object({
  adults: z.coerce.number().int().min(1).max(9).default(1),
  children: z.coerce.number().int().min(0).max(8).default(0),
  infants: z.coerce.number().int().min(0).max(9).default(0),
});

export { bookFlightSchema };

export function createFlightsController(flights: FlightService, bookings: BookingService) {
  const search: RequestHandler = async (req, res) => {
    const params = new URLSearchParams(req.query as Record<string, string>);
    const parsed = flightSearchSchema.safeParse(flightSearchInputFromParams(params));
    if (!parsed.success) {
      throw new ValidationError(
        zodIssues(parsed.error).map((i) => ({ ...i, path: `query.${i.path}` })),
      );
    }
    // Search results change with bookings; clients may cache for a minute at most.
    res.setHeader('Cache-Control', 'private, max-age=60');
    sendSuccess(res, await flights.search(parsed.data));
  };

  const offer: RequestHandler = async (req, res) => {
    const { offerId } = validated<{ offerId: string }>(req, 'params');
    const pax = validated<z.output<typeof offerQuerySchema>>(req, 'query');
    const found = await flights.getOffer(offerId, pax);
    if (!found) throw new NotFoundError('This fare is no longer available. Please search again.');
    sendSuccess(res, found);
  };

  const book: RequestHandler = async (req, res) => {
    const auth = requireAuth(req);
    const booking = await bookings.createFlightBooking(
      auth.userId,
      validated<BookFlightInput>(req, 'body'),
      idempotencyKey(req),
      requestContext(req),
    );
    sendSuccess(res, booking, 'Booking created. Complete payment to confirm.', 201);
  };

  return { search, offer, book };
}
