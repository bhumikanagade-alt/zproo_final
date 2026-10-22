import type { TrainQuota } from '@zproo/types';
import {
  trainSearchInputFromParams,
  trainSearchSchema,
  type BookTrainInput,
  type CancelTrainInput,
  type TrainQuoteInput,
} from '@zproo/validation';
import type { Request, RequestHandler } from 'express';
import { requireAuth } from '../middleware/auth';
import { idempotencyKey } from '../middleware/idempotency';
import { validated } from '../middleware/validate';
import type { BookingService } from '../services/booking.service';
import type { RbacService } from '../services/rbac.service';
import type { TrainService } from '../services/train.service';
import type { TrainReservationService } from '../services/trainReservation.service';
import { ValidationError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { zodIssues } from '../utils/zod';
import { requestContext } from './auth.controller';

export function createTrainsController(
  trains: TrainService,
  bookings: BookingService,
  reservations: TrainReservationService,
  rbac: RbacService,
) {
  const viewer = async (req: Request) => {
    const auth = requireAuth(req);
    return { userId: auth.userId, canReadAny: await rbac.hasAll(auth.roles, ['booking:read:any']) };
  };

  const capabilities: RequestHandler = (_req, res) => {
    sendSuccess(res, trains.capabilities());
  };

  const stations: RequestHandler = async (req, res) => {
    const { q, limit } = validated<{ q: string; limit: number }>(req, 'query');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    sendSuccess(res, await trains.stations(q, limit));
  };

  const search: RequestHandler = async (req, res) => {
    const params = new URLSearchParams(req.query as Record<string, string>);
    const parsed = trainSearchSchema.safeParse(trainSearchInputFromParams(params));
    if (!parsed.success) {
      throw new ValidationError(
        zodIssues(parsed.error).map((i) => ({ ...i, path: `query.${i.path}` })),
      );
    }
    // Availability changes as people book; clients may cache results for a minute at most.
    res.setHeader('Cache-Control', 'private, max-age=60');
    sendSuccess(res, await trains.search(parsed.data));
  };

  const offer: RequestHandler = async (req, res) => {
    const { offerId } = validated<{ offerId: string }>(req, 'params');
    const { quota } = validated<{ quota: TrainQuota }>(req, 'query');
    res.setHeader('Cache-Control', 'no-store');
    sendSuccess(res, await trains.offer(offerId, quota));
  };

  const quote: RequestHandler = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    sendSuccess(res, await trains.quote(validated<TrainQuoteInput>(req, 'body')));
  };

  const book: RequestHandler = async (req, res) => {
    const auth = requireAuth(req);
    const booking = await bookings.createTrainBooking(
      auth.userId,
      validated<BookTrainInput>(req, 'body'),
      idempotencyKey(req),
      requestContext(req),
    );
    sendSuccess(res, booking, 'Fare locked. Complete payment to request your reservation.', 201);
  };

  const refresh: RequestHandler = async (req, res) => {
    const { reference } = validated<{ reference: string }>(req, 'params');
    sendSuccess(res, await reservations.refresh(reference, await viewer(req)));
  };

  const cancellationQuote: RequestHandler = async (req, res) => {
    const { reference } = validated<{ reference: string }>(req, 'params');
    const { passengerIds } = validated<CancelTrainInput>(req, 'body');
    const auth = requireAuth(req);
    sendSuccess(
      res,
      await reservations.cancellationQuote(
        reference,
        { userId: auth.userId, canReadAny: false },
        passengerIds,
      ),
    );
  };

  const cancel: RequestHandler = async (req, res) => {
    const { reference } = validated<{ reference: string }>(req, 'params');
    const { passengerIds } = validated<CancelTrainInput>(req, 'body');
    const auth = requireAuth(req);
    const booking = await reservations.cancel(
      reference,
      { userId: auth.userId, canReadAny: false },
      passengerIds,
      idempotencyKey(req),
      requestContext(req),
    );
    sendSuccess(res, booking, 'Cancellation processed');
  };

  const liveStatus: RequestHandler = async (req, res) => {
    const { trainNumber } = validated<{ trainNumber: string }>(req, 'params');
    const { date } = validated<{ date: string }>(req, 'query');
    res.setHeader('Cache-Control', 'no-store');
    sendSuccess(res, await trains.liveStatus(trainNumber, date));
  };

  return {
    capabilities,
    stations,
    search,
    offer,
    quote,
    book,
    refresh,
    cancellationQuote,
    cancel,
    liveStatus,
  };
}
