import type { PrismaClient } from '@prisma/client';
import type { PaymentOrder } from '@zproo/types';
import type { Logger } from 'pino';
import type { BusProvider } from '../providers/bus';
import type { FlightProvider } from '../providers/flight';
import { MockPaymentProvider, type PaymentProvider } from '../providers/payment';
import { BookingRepository } from '../repositories/booking.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import {
  BookingExpiredError,
  InvalidStateError,
  NotFoundError,
  PaymentError,
} from '../utils/errors';
import type { AuditService, RequestContext } from './audit.service';
import type { BookingService } from './booking.service';
import type { TrainReservationService } from './trainReservation.service';

interface PaymentServiceDeps {
  prisma: PrismaClient;
  provider: PaymentProvider;
  flights: FlightProvider;
  buses: BusProvider;
  bookings: BookingService;
  /** Railway reservations are made after payment (see TrainReservationService). */
  trains?: TrainReservationService;
  audit: AuditService;
  logger: Logger;
  now?: () => Date;
}

/**
 * Payments follow the gateway pattern: create an order for the booking's amount (computed here,
 * never taken from the browser), let the customer pay with the gateway, then verify the gateway's
 * signature on the server before confirming the booking.
 */
export class PaymentService {
  private readonly now: () => Date;

  constructor(private readonly deps: PaymentServiceDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  get providerName(): string {
    return this.deps.provider.name;
  }

  /** Idempotent: an open payment for the booking is returned rather than a second order created. */
  async createOrder(userId: string, reference: string, ctx: RequestContext): Promise<PaymentOrder> {
    const booking = await this.deps.bookings.get(reference, { userId, canReadAny: false });
    if (booking.status !== 'PENDING_PAYMENT')
      throw new InvalidStateError('This booking is not awaiting payment');
    if (booking.holdExpiresAt && booking.holdExpiresAt <= this.now())
      throw new BookingExpiredError();

    const payments = new PaymentRepository(this.deps.prisma);
    const payment =
      (await payments.findOpenForBooking(booking.id)) ??
      (await payments.create({
        bookingId: booking.id,
        userId,
        provider: this.deps.provider.name,
        providerOrderId: (
          await this.deps.provider.createOrder({
            amountPaise: booking.totalAmountPaise,
            currency: 'INR',
            receipt: booking.reference,
          })
        ).orderId,
        amountPaise: booking.totalAmountPaise,
      }));
    await this.deps.audit.record({
      action: 'PAYMENT_ORDER_CREATED',
      actorId: userId,
      entityType: 'Payment',
      entityId: payment.id,
      after: { reference, amountPaise: payment.amountPaise, provider: payment.provider },
      context: ctx,
    });
    return {
      paymentId: payment.id,
      provider: payment.provider,
      providerOrderId: payment.providerOrderId,
      amountPaise: payment.amountPaise,
      currency: 'INR',
      publicKey: this.deps.provider.publicKey,
      bookingReference: booking.reference,
      holdExpiresAt: booking.holdExpiresAt?.toISOString() ?? null,
    };
  }

  /** Called with the gateway's result from the browser; trusted only if the signature verifies. */
  async verify(
    userId: string,
    input: {
      paymentId: string;
      providerPaymentId: string;
      signature: string;
      method?: string | undefined;
    },
    ctx: RequestContext,
  ): Promise<{ reference: string }> {
    const payment = await new PaymentRepository(this.deps.prisma).findById(input.paymentId);
    if (!payment || payment.userId !== userId) throw new NotFoundError('Payment not found');
    if (payment.status === 'SUCCESS') return { reference: payment.booking.reference }; // retry of a completed call

    const valid = this.deps.provider.verifyPayment({
      orderId: payment.providerOrderId,
      paymentId: input.providerPaymentId,
      signature: input.signature,
    });
    if (!valid) {
      await this.deps.audit.record({
        action: 'PAYMENT_SIGNATURE_INVALID',
        actorId: userId,
        entityType: 'Payment',
        entityId: payment.id,
        context: ctx,
      });
      throw new PaymentError(
        'We could not verify this payment. You have not been charged for a booking.',
      );
    }
    await this.confirm(payment.id, input.providerPaymentId, input.method, userId, ctx);
    return { reference: payment.booking.reference };
  }

  /** Records a failed attempt; the booking stays payable until its hold expires. */
  async markFailed(
    userId: string,
    paymentId: string,
    reason: string,
    ctx: RequestContext,
  ): Promise<void> {
    const payment = await new PaymentRepository(this.deps.prisma).findById(paymentId);
    if (!payment || payment.userId !== userId) throw new NotFoundError('Payment not found');
    await new PaymentRepository(this.deps.prisma).transition(payment.id, ['CREATED', 'PENDING'], {
      status: 'FAILED',
      failureReason: reason.slice(0, 200),
    });
    await this.deps.audit.record({
      action: 'PAYMENT_FAILED',
      actorId: userId,
      entityType: 'Payment',
      entityId: payment.id,
      after: { reason },
      context: ctx,
    });
  }

  /** Development only: behaves like the gateway returning from checkout. */
  async simulateMockPayment(
    userId: string,
    paymentId: string,
    outcome: 'success' | 'failure',
    ctx: RequestContext,
  ) {
    if (!(this.deps.provider instanceof MockPaymentProvider)) throw new NotFoundError();
    const payment = await new PaymentRepository(this.deps.prisma).findById(paymentId);
    if (!payment || payment.userId !== userId) throw new NotFoundError('Payment not found');
    if (outcome === 'failure') {
      await this.markFailed(userId, paymentId, 'Declined by bank (simulated)', ctx);
      return { reference: payment.booking.reference, status: 'FAILED' as const };
    }
    const result = this.deps.provider.simulateSuccess(payment.providerOrderId);
    await this.verify(
      userId,
      {
        paymentId,
        providerPaymentId: result.paymentId,
        signature: result.signature,
        method: 'mock',
      },
      ctx,
    );
    return { reference: payment.booking.reference, status: 'SUCCESS' as const };
  }

  // ───────── internals ─────────

  private async confirm(
    paymentId: string,
    providerPaymentId: string,
    method: string | undefined,
    userId: string,
    ctx: RequestContext,
  ) {
    let captured: { bookingId: string; serviceType: string };
    try {
      captured = await this.capture(paymentId, providerPaymentId, method);
    } catch (err) {
      if (!(err instanceof BookingExpiredError)) throw err;
      const current = await new PaymentRepository(this.deps.prisma).findById(paymentId);
      // A concurrent verify of the same payment confirmed the booking first.
      if (current?.status === 'SUCCESS') return;
      await this.recordLateCapture(paymentId, providerPaymentId, method, userId, ctx);
      throw err;
    }
    await this.deps.audit.record({
      action: 'PAYMENT_CAPTURED',
      actorId: userId,
      entityType: 'Payment',
      entityId: paymentId,
      context: ctx,
    });
    // Trains reserve with the railway only now; the booking is confirmed when a PNR comes back.
    if (captured.serviceType === 'TRAIN' && this.deps.trains) {
      try {
        await this.deps.trains.fulfil(captured.bookingId);
      } catch (err) {
        this.deps.logger.error({ err, bookingId: captured.bookingId }, 'Train reservation failed to start — will reconcile');
      }
      return;
    }
    await this.issueTickets(captured.bookingId);
  }

  /**
   * Marks the payment captured and the booking paid, atomically, while the hold is valid. Paid
   * flights and buses are CONFIRMED (tickets follow); paid trains move to PROCESSING until the
   * railway confirms the reservation.
   */
  private async capture(
    paymentId: string,
    providerPaymentId: string,
    method: string | undefined,
  ): Promise<{ bookingId: string; serviceType: string }> {
    const now = this.now();
    return this.deps.prisma.$transaction(async (tx) => {
      const payment = await new PaymentRepository(tx).findById(paymentId);
      if (!payment) throw new NotFoundError('Payment not found');
      // The hold must still be valid; otherwise the seats may already be resold.
      const train = payment.booking.serviceType === 'TRAIN';
      const confirmed = await new BookingRepository(tx).transition(
        payment.bookingId,
        'PENDING_PAYMENT',
        train
          ? { status: 'PROCESSING', paymentStatus: 'SUCCESS', holdExpiresAt: null }
          : { status: 'CONFIRMED', paymentStatus: 'SUCCESS', confirmedAt: now, holdExpiresAt: null },
        { holdExpiresAt: { gt: now } },
      );
      if (!confirmed)
        throw new BookingExpiredError(
          'Your seat hold expired before payment completed. Any amount debited will be refunded.',
        );
      const captured = await new PaymentRepository(tx).transition(
        payment.id,
        ['CREATED', 'PENDING', 'FAILED'],
        {
          status: 'SUCCESS',
          providerPaymentId,
          method: method ?? null,
          capturedAt: now,
          failureReason: null,
        },
      );
      if (!captured) throw new InvalidStateError('This payment was already processed');
      return { bookingId: payment.bookingId, serviceType: payment.booking.serviceType };
    });
  }

  /**
   * The gateway took the money but the seats were already released. Keep a record of the gateway
   * payment so finance can refund it; the booking itself stays cancelled.
   */
  private async recordLateCapture(
    paymentId: string,
    providerPaymentId: string,
    method: string | undefined,
    userId: string,
    ctx: RequestContext,
  ) {
    await new PaymentRepository(this.deps.prisma).transition(
      paymentId,
      ['CREATED', 'PENDING', 'FAILED', 'CANCELLED'],
      {
        status: 'FAILED',
        providerPaymentId,
        method: method ?? null,
        failureReason: 'Captured after the seat hold expired; refund due',
      },
    );
    await this.deps.audit.record({
      action: 'PAYMENT_REFUND_DUE',
      actorId: userId,
      entityType: 'Payment',
      entityId: paymentId,
      context: ctx,
    });
    this.deps.logger.warn({ paymentId }, 'Payment captured after hold expiry — refund required');
  }

  /**
   * Tickets are issued after the payment commits. If the airline or operator call fails, the
   * booking stays confirmed without a PNR and is picked up by support (logged), rather than
   * losing the payment.
   */
  private async issueTickets(bookingId: string) {
    const booking = await this.deps.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        passengers: { orderBy: { sequence: 'asc' } },
        flights: { orderBy: { sequence: 'asc' } },
        bus: true,
      },
    });
    if (!booking) return;
    const repo = new BookingRepository(this.deps.prisma);
    if (booking.bus) {
      try {
        const issued = await this.deps.buses.issue(booking.bus.offerId, booking.bus.seatNumbers);
        await repo.setBusPnr(booking.id, issued.pnr);
      } catch (err) {
        this.deps.logger.error(
          { err, bookingId },
          'Bus ticket issuance failed — needs manual follow-up',
        );
      }
    }
    for (const leg of booking.flights) {
      try {
        const issued = await this.deps.flights.issue(leg.offerId, booking.passengers);
        await repo.setFlightTickets(
          leg.id,
          issued.pnr,
          booking.passengers.map((p, i) => ({
            passengerId: p.id,
            ticketNumber: issued.ticketNumbers[i] ?? '',
          })),
        );
      } catch (err) {
        this.deps.logger.error(
          { err, bookingId, leg: leg.sequence },
          'Ticket issuance failed — needs manual follow-up',
        );
      }
    }
  }
}
