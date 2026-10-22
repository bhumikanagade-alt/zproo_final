import { busSearchInputFromParams, busSearchSchema, type BookBusInput, type CancelBusInput } from '@zproo/validation';
import type { RequestHandler } from 'express';
import { requireAuth } from '../middleware/auth';
import { idempotencyKey } from '../middleware/idempotency';
import { validated } from '../middleware/validate';
import type { BookingService } from '../services/booking.service';
import type { BusService } from '../services/bus.service';
import type { BusCancellationService } from '../services/busCancellation.service';
import { NotFoundError, ValidationError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { zodIssues } from '../utils/zod';
import { requestContext } from './auth.controller';

const GONE = 'This bus is no longer available. Please search again.';

export function createBusesController(buses: BusService, bookings: BookingService, cancellations: BusCancellationService) {
  const search: RequestHandler = async (req, res) => {
    const params = new URLSearchParams(req.query as Record<string, string>);
    const parsed = busSearchSchema.safeParse(busSearchInputFromParams(params));
    if (!parsed.success) {
      throw new ValidationError(
        zodIssues(parsed.error).map((i) => ({ ...i, path: `query.${i.path}` })),
      );
    }
    // Seats sell as people book; clients may cache results for a minute at most.
    res.setHeader('Cache-Control', 'private, max-age=60');
    sendSuccess(res, await buses.search(parsed.data));
  };

  const trip: RequestHandler = async (req, res) => {
    const { tripId } = validated<{ tripId: string }>(req, 'params');
    const found = await buses.getTrip(tripId);
    if (!found) throw new NotFoundError(GONE);
    sendSuccess(res, found);
  };

  const seats: RequestHandler = async (req, res) => {
    const { tripId } = validated<{ tripId: string }>(req, 'params');
    const map = await buses.seatMap(tripId);
    if (!map) throw new NotFoundError(GONE);
    res.setHeader('Cache-Control', 'no-store');
    sendSuccess(res, map);
  };

  const book: RequestHandler = async (req, res) => {
    const auth = requireAuth(req);
    const booking = await bookings.createBusBooking(
      auth.userId,
      validated<BookBusInput>(req, 'body'),
      idempotencyKey(req),
      requestContext(req),
    );
    sendSuccess(res, booking, 'Seats held. Complete payment to confirm.', 201);
  };

  const cancellationQuote: RequestHandler = async (req, res) => {
    const { reference } = validated<{ reference: string }>(req, 'params');
    res.setHeader('Cache-Control', 'no-store');
    sendSuccess(res, await cancellations.quote(reference, requireAuth(req).userId));
  };

  const cancel: RequestHandler = async (req, res) => {
    const { reference } = validated<{ reference: string }>(req, 'params');
    const input = validated<CancelBusInput>(req, 'body');
    const booking = await cancellations.cancel(reference, requireAuth(req).userId, input, requestContext(req));
    sendSuccess(res, booking, 'Booking cancelled');
  };

  return { search, trip, seats, book, cancellationQuote, cancel };
}
