import type { RequestHandler } from 'express';
import { requireAuth } from '../middleware/auth';
import { validated } from '../middleware/validate';
import type { BookingService } from '../services/booking.service';
import type { RbacService } from '../services/rbac.service';
import type { TicketService } from '../services/ticket.service';
import { InvalidStateError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

export function createBookingsController(
  bookings: BookingService,
  tickets: TicketService,
  rbac: RbacService,
) {
  const viewer = async (req: Parameters<RequestHandler>[0]) => {
    const auth = requireAuth(req);
    return { userId: auth.userId, canReadAny: await rbac.hasAll(auth.roles, ['booking:read:any']) };
  };

  const list: RequestHandler = async (req, res) => {
    sendSuccess(res, await bookings.list(requireAuth(req).userId));
  };

  const get: RequestHandler = async (req, res) => {
    const { reference } = validated<{ reference: string }>(req, 'params');
    sendSuccess(res, await bookings.getDetails(reference, await viewer(req)));
  };

  const ticket: RequestHandler = async (req, res) => {
    const { reference } = validated<{ reference: string }>(req, 'params');
    const record = await bookings.get(reference, await viewer(req));
    if (record.status !== 'CONFIRMED' && record.status !== 'COMPLETED') {
      throw new InvalidStateError('The e-ticket is available once the booking is confirmed');
    }
    const details = await bookings.getDetails(reference, await viewer(req));
    const demo = Boolean((record.metadata as { demo?: boolean } | null)?.demo);
    const pdf = await tickets.ticket(details, { demo });
    res
      .status(200)
      .type('application/pdf')
      .setHeader('Content-Disposition', `attachment; filename="ZPROO GO_${details.travelDate}_Ticket.pdf"`)
      .setHeader('Cache-Control', 'private, no-store')
      .send(pdf);
  };

  return { list, get, ticket };
}
