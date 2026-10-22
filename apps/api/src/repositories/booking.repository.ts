import type { BookingStatus, Prisma } from '@prisma/client';
import type { Db } from './db';

export const bookingInclude = {
  passengers: { orderBy: { sequence: 'asc' } },
  flights: { orderBy: { sequence: 'asc' } },
  bus: true,
  train: {
    include: {
      passengers: { orderBy: { sequence: 'asc' } },
      cancellations: { orderBy: { createdAt: 'asc' } },
    },
  },
  refunds: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.BookingInclude;

export type BookingRecord = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

export class BookingRepository {
  constructor(private readonly db: Db) {}

  findByReference(reference: string) {
    return this.db.booking.findUnique({ where: { reference }, include: bookingInclude });
  }

  findByIdempotencyKey(userId: string, idempotencyKey: string) {
    return this.db.booking.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      include: bookingInclude,
    });
  }

  listForUser(userId: string, take = 50) {
    return this.db.booking.findMany({
      where: { userId },
      include: bookingInclude,
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  create(data: Prisma.BookingUncheckedCreateInput) {
    return this.db.booking.create({ data, include: bookingInclude });
  }

  /** Moves a booking between states only if it is still in the expected one (race-safe). */
  async transition(
    id: string,
    from: BookingStatus,
    data: Prisma.BookingUpdateManyMutationInput,
    extra: Prisma.BookingWhereInput = {},
  ) {
    const { count } = await this.db.booking.updateMany({
      where: { id, status: from, ...extra },
      data,
    });
    return count === 1;
  }

  findById(id: string) {
    return this.db.booking.findUnique({ where: { id }, include: bookingInclude });
  }

  /** Paid train bookings still waiting for the provider, oldest check first. */
  findProcessingTrains(checkedBefore: Date, take = 20) {
    return this.db.booking.findMany({
      where: {
        status: 'PROCESSING',
        serviceType: 'TRAIN',
        train: { OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: checkedBefore } }] },
      },
      include: bookingInclude,
      orderBy: { updatedAt: 'asc' },
      take,
    });
  }

  findExpiredHolds(now: Date, take = 100) {
    return this.db.booking.findMany({
      where: { status: 'PENDING_PAYMENT', holdExpiresAt: { lt: now } },
      include: bookingInclude,
      take,
    });
  }

  setBusPnr(bookingId: string, pnr: string) {
    return this.db.busBooking.update({ where: { bookingId }, data: { pnr } });
  }

  setFlightTickets(
    flightBookingId: string,
    pnr: string,
    tickets: { passengerId: string; ticketNumber: string }[],
  ) {
    return this.db.flightBooking.update({ where: { id: flightBookingId }, data: { pnr, tickets } });
  }
}
