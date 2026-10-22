import type { PrismaClient } from '@prisma/client';
import type { BookingDetails, BusCancellationQuote, BusCancellationRule } from '@zproo/types';
import { busCancellationQuote, formatMoney } from '@zproo/utils';
import type { Logger } from 'pino';
import { toBookingDetails } from '../models/booking.dto';
import type { BusProvider } from '../providers/bus';
import type { EmailProvider } from '../providers/email';
import type { PaymentProvider } from '../providers/payment';
import { BookingRepository, type BookingRecord } from '../repositories/booking.repository';
import { ConflictError, InvalidStateError, NotFoundError } from '../utils/errors';
import type { AuditService, RequestContext } from './audit.service';
import { BUS_CANCELLATION_POLICY } from './busPricing';
import type { RefundService } from './refund.service';

interface Deps {
  prisma: PrismaClient;
  buses: BusProvider;
  refunds: RefundService;
  audit: AuditService;
  email?: EmailProvider;
  payments?: Pick<PaymentProvider, 'cancelOrder'>;
  logger: Logger;
  now?: () => Date;
}

/**
 * Customer-side cancellation of a bus booking. Unpaid bookings simply release their seats; a
 * paid, confirmed booking is cancelled according to the refund rules sold with the trip, the
 * seats go back on sale, and the refund goes through the normal refund queue (so it shows on the
 * admin Refunds page and is retried if the gateway fails).
 */
export class BusCancellationService {
  private readonly now: () => Date;

  constructor(private readonly deps: Deps) {
    this.now = deps.now ?? (() => new Date());
  }

  /** The owner's booking, or 404 (also for someone else's booking, so references cannot be probed). */
  private async own(reference: string, userId: string): Promise<BookingRecord & { bus: NonNullable<BookingRecord['bus']> }> {
    const booking = await new BookingRepository(this.deps.prisma).findByReference(reference);
    if (!booking || booking.userId !== userId || !booking.bus) throw new NotFoundError('Booking not found');
    return booking as BookingRecord & { bus: NonNullable<BookingRecord['bus']> };
  }

  private quoteFor(booking: BookingRecord & { bus: NonNullable<BookingRecord['bus']> }): BusCancellationQuote {
    const policy = (booking.bus.offer as { cancellationPolicy?: BusCancellationRule[] } | null)?.cancellationPolicy;
    return busCancellationQuote({
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      totalPaise: booking.totalAmountPaise,
      departureAt: booking.bus.departureAt,
      policy: policy?.length ? policy : BUS_CANCELLATION_POLICY,
      now: this.now(),
    });
  }

  async quote(reference: string, userId: string): Promise<BusCancellationQuote> {
    return this.quoteFor(await this.own(reference, userId));
  }

  async cancel(
    reference: string,
    userId: string,
    input: { reason?: string | undefined },
    ctx?: RequestContext,
  ): Promise<BookingDetails> {
    const booking = await this.own(reference, userId);
    const quote = this.quoteFor(booking);
    if (!quote.eligible) throw new InvalidStateError(quote.reason ?? 'This booking cannot be cancelled');

    const willRefund = quote.paid && quote.refundPaise > 0;
    const note = (input.reason?.trim() || 'Changed my plans').slice(0, 150);
    const openOrders = await this.deps.prisma.payment.findMany({
      where: { bookingId: booking.id, status: { in: ['CREATED', 'PENDING'] } },
      select: { providerOrderId: true },
    });

    const refundId = await this.deps.prisma.$transaction(async (tx) => {
      // Only moves a booking that is still in the state we quoted, so a double click or a
      // concurrent payment cannot cancel it twice or after it changed.
      const moved = await tx.booking.updateMany({
        where: { id: booking.id, status: booking.status },
        data: {
          status: willRefund ? 'REFUND_PENDING' : 'CANCELLED',
          cancelledAt: this.now(),
          cancellationReason: `CUSTOMER: ${quote.paid && !willRefund ? '[NO REFUND] ' : ''}${note}`.slice(0, 300),
          ...(!quote.paid && { paymentStatus: 'CANCELLED' }),
        },
      });
      if (moved.count !== 1) throw new ConflictError('This booking changed meanwhile. Reload and try again.');
      await this.deps.buses.release(booking.id, tx);
      await tx.payment.updateMany({
        where: { bookingId: booking.id, status: { in: ['CREATED', 'PENDING'] } },
        data: { status: 'CANCELLED' },
      });
      if (!willRefund) return null;
      const refund = await this.deps.refunds.request(tx, {
        bookingId: booking.id,
        amountPaise: quote.refundPaise,
        reason: `Bus booking cancelled by customer (${quote.refundPercent}% refund)`,
        idempotencyKey: `bus-cancel:${booking.id}`,
        requestedById: userId,
      });
      return refund.id;
    });

    await this.deps.audit.record({
      action: 'BOOKING_CANCELLED_BY_CUSTOMER',
      actorId: userId,
      entityType: 'Booking',
      entityId: booking.reference,
      before: { status: booking.status },
      after: { status: willRefund ? 'REFUND_PENDING' : 'CANCELLED', refundPaise: quote.refundPaise, chargesPaise: quote.chargesPaise },
      context: ctx,
    });

    // Close any open payment order so a payment page that is still open cannot take money now.
    for (const { providerOrderId } of openOrders) {
      try {
        await this.deps.payments?.cancelOrder?.(providerOrderId);
      } catch (err) {
        this.deps.logger.warn({ err: { message: (err as Error).message }, reference }, 'Could not cancel the open payment order');
      }
    }
    if (refundId) await this.deps.refunds.process(refundId);
    void this.notify(booking.contactEmail, booking.reference, quote);

    const fresh = await new BookingRepository(this.deps.prisma).findByReference(reference);
    return toBookingDetails(fresh as BookingRecord);
  }

  /** Cancellation email; a failure never affects the cancellation. */
  private async notify(to: string, reference: string, quote: BusCancellationQuote): Promise<void> {
    try {
      await this.deps.email?.send({
        to,
        subject: 'Your ZPROO BUS booking is cancelled',
        text: quote.paid
          ? `Booking ${reference} is cancelled. Cancellation charges: ${formatMoney(quote.chargesPaise)}. Refund: ${formatMoney(quote.refundPaise)} to your original payment method.`
          : `Booking ${reference} is cancelled. You were not charged.`,
      });
    } catch (err) {
      this.deps.logger.warn({ err: { message: (err as Error).message }, reference }, 'Cancellation email failed');
    }
  }
}
