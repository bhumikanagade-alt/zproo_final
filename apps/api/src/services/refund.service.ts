import type { Prisma, PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import type { PaymentProvider } from '../providers/payment';
import type { Db } from '../repositories/db';
import type { AuditService } from './audit.service';

/** A refund an admin marked "failed" is parked with this prefix on its failure reason; the automatic retry leaves it alone. */
export const MANUAL_HOLD_PREFIX = 'On hold (marked failed by admin): ';

interface RefundServiceDeps {
  prisma: PrismaClient;
  provider: PaymentProvider;
  audit: AuditService;
  logger: Logger;
  now?: () => Date;
}

/**
 * Refunds through the payment gateway. A refund row is written first (inside the caller's
 * transaction, unique per cause), then sent to the gateway; failures stay FAILED and are retried
 * by `processPending`, so money owed is never forgotten and never refunded twice. A refund is
 * shown as successful only once the gateway accepts it.
 */
export class RefundService {
  private readonly now: () => Date;

  constructor(private readonly deps: RefundServiceDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  /** Records a refund owed (idempotent on `idempotencyKey`). Call inside the state-change transaction. */
  async request(
    db: Db,
    input: { bookingId: string; amountPaise: number; reason: string; idempotencyKey: string; requestedById?: string },
  ) {
    const payment = await db.payment.findFirst({
      where: { bookingId: input.bookingId, status: { in: ['SUCCESS', 'PARTIALLY_REFUNDED'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (!payment) throw new Error(`No captured payment for booking ${input.bookingId}`);
    return db.refund.upsert({
      where: { idempotencyKey: input.idempotencyKey },
      create: {
        bookingId: input.bookingId,
        paymentId: payment.id,
        amountPaise: Math.min(input.amountPaise, payment.amountPaise),
        reason: input.reason,
        idempotencyKey: input.idempotencyKey,
        requestedById: input.requestedById ?? null,
      },
      update: {},
    });
  }

  /** Sends a requested (or previously failed) refund to the gateway, then settles the booking. */
  async process(refundId: string): Promise<void> {
    const claimed = await this.deps.prisma.refund.updateMany({
      where: { id: refundId, status: { in: ['REQUESTED', 'FAILED'] } },
      data: { status: 'PROCESSING', failureReason: null },
    });
    if (claimed.count !== 1) return; // done, or another worker has it
    const refund = await this.deps.prisma.refund.findUniqueOrThrow({
      where: { id: refundId },
      include: { payment: true },
    });
    try {
      if (!refund.payment.providerPaymentId) throw new Error('Payment has no gateway payment id');
      const result = await this.deps.provider.refund({
        orderId: refund.payment.providerOrderId,
        paymentId: refund.payment.providerPaymentId,
        amountPaise: refund.amountPaise,
        idempotencyKey: refund.id,
        note: refund.reason.slice(0, 80),
      });
      await this.deps.prisma.refund.update({
        where: { id: refund.id },
        data:
          result.status === 'PROCESSED'
            ? { status: 'COMPLETED', gatewayRefundId: result.refundId, completedAt: this.now() }
            : { status: 'PROCESSING', gatewayRefundId: result.refundId },
      });
      await this.deps.audit.record({
        action: result.status === 'PROCESSED' ? 'REFUND_COMPLETED' : 'REFUND_SUBMITTED',
        entityType: 'Refund',
        entityId: refund.id,
        after: { bookingId: refund.bookingId, amountPaise: refund.amountPaise },
      });
    } catch (err) {
      await this.deps.prisma.refund.update({
        where: { id: refund.id },
        data: { status: 'FAILED', failureReason: (err as Error).message.slice(0, 200) },
      });
      this.deps.logger.error(
        { err: { message: (err as Error).message }, refundId: refund.id },
        'Refund failed at the gateway — will retry',
      );
      return;
    }
    await this.settle(refund.bookingId);
  }

  /** Retries refunds that are requested or failed (run periodically). */
  async processPending(take = 20): Promise<number> {
    const due = await this.deps.prisma.refund.findMany({
      where: {
        status: { in: ['REQUESTED', 'FAILED'] },
        // Refunds an admin parked ("marked failed") wait for a person; they are not retried automatically.
        OR: [{ failureReason: null }, { NOT: { failureReason: { startsWith: MANUAL_HOLD_PREFIX } } }],
      },
      orderBy: { updatedAt: 'asc' },
      take,
    });
    for (const r of due) await this.process(r.id);
    return due.length;
  }

  /**
   * Once nothing is left to refund: the payment shows REFUNDED / PARTIALLY_REFUNDED, and a booking
   * waiting on its refund (REFUND_PENDING) becomes REFUNDED.
   */
  async settle(bookingId: string): Promise<void> {
    await this.deps.prisma.$transaction(async (tx) => {
      const refunds = await tx.refund.findMany({ where: { bookingId } });
      if (refunds.some((r) => r.status !== 'COMPLETED')) return;
      const payments = new Map<string, number>();
      for (const r of refunds)
        payments.set(r.paymentId, (payments.get(r.paymentId) ?? 0) + r.amountPaise);
      for (const [paymentId, refunded] of payments) {
        const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
        const status = refunded >= payment.amountPaise ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
        await tx.payment.update({ where: { id: paymentId }, data: { status } });
        const data: Prisma.BookingUpdateManyMutationInput = { paymentStatus: status };
        await tx.booking.updateMany({ where: { id: bookingId }, data });
      }
      await tx.booking.updateMany({
        where: { id: bookingId, status: 'REFUND_PENDING' },
        data: { status: 'REFUNDED' },
      });
    });
  }
}
