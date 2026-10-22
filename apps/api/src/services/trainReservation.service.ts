import { Prisma, type PrismaClient } from '@prisma/client';
import type { BookingDetails, TrainCancellationQuote, TrainClass, TrainQuota } from '@zproo/types';
import { formatMoney } from '@zproo/utils';
import type { Logger } from 'pino';
import { toBookingDetails } from '../models/booking.dto';
import type { EmailProvider } from '../providers/email';
import type { ProviderBookingResult, TrainProvider } from '../providers/train';
import { BookingRepository, type BookingRecord } from '../repositories/booking.repository';
import { InvalidStateError, NotFoundError, ProviderError, ValidationError } from '../utils/errors';
import type { AuditService, RequestContext } from './audit.service';
import type { BookingService } from './booking.service';
import type { RefundService } from './refund.service';

interface Deps {
  prisma: PrismaClient;
  provider: TrainProvider;
  bookings: BookingService;
  refunds: RefundService;
  audit: AuditService;
  email: EmailProvider;
  logger: Logger;
  now?: () => Date;
}

type Viewer = { userId: string; canReadAny: boolean };

/** Paid bookings older than this without a provider answer are escalated in the logs. */
const ESCALATE_AFTER_MS = 30 * 60_000;
/** Minimum gap between automatic status checks of one pending booking. */
const RECHECK_AFTER_MS = 60_000;

/**
 * Railway reservation lifecycle after payment.
 *
 *   PENDING_PAYMENT ──pay (verified)──▶ PROCESSING ──provider BOOKED──▶ CONFIRMED (PNR)
 *                                           │ provider FAILED                 │ cancel all
 *                                           ▼                                 ▼
 *                                     REFUND_PENDING ──refund done──▶ REFUNDED   (or CANCELLED if nothing is refundable)
 *
 * A booking is CONFIRMED only when the provider returns a PNR. If the provider's answer is
 * unknown (timeout), the booking stays PROCESSING and `reconcilePending` asks again; the money
 * is refunded only when the provider says the reservation failed.
 */
export class TrainReservationService {
  private readonly now: () => Date;

  constructor(private readonly deps: Deps) {
    this.now = deps.now ?? (() => new Date());
  }

  /** Called once the payment is captured: asks the provider to reserve. */
  async fulfil(bookingId: string): Promise<void> {
    const booking = await this.load(bookingId);
    if (!booking?.train || booking.status !== 'PROCESSING' || booking.train.pnr) return;
    await this.touch(booking.train.id);
    let result: ProviderBookingResult;
    try {
      result = await this.deps.provider.book(this.bookingRequest(booking));
    } catch (err) {
      // Outcome unknown (timeout / provider down): keep the money and the booking, ask again later.
      this.deps.logger.warn(
        { bookingId, err: { name: (err as Error).name, message: (err as Error).message } },
        'Railway booking call failed; will reconcile',
      );
      result = {
        outcome: 'PENDING',
        providerReference: null,
        message: 'No answer from the railway system yet.',
      };
    }
    await this.apply(booking, result);
  }

  /** Asks the provider about a paid booking whose outcome is not known yet. */
  async reconcile(bookingId: string): Promise<void> {
    const booking = await this.load(bookingId);
    if (!booking?.train || booking.status !== 'PROCESSING' || booking.train.pnr) return;
    await this.touch(booking.train.id);
    let result: ProviderBookingResult;
    try {
      // `book` is idempotent on our reference, so it is safe when the first call never reached the provider.
      result = booking.train.providerReference
        ? await this.deps.provider.status({
            clientReference: booking.reference,
            providerReference: booking.train.providerReference,
            pnr: null,
          })
        : await this.deps.provider.book(this.bookingRequest(booking));
    } catch (err) {
      this.deps.logger.warn(
        { bookingId, err: { name: (err as Error).name, message: (err as Error).message } },
        'Railway status check failed; will retry',
      );
      return;
    }
    await this.apply(booking, result);
  }

  /** Periodic job: reconciles paid bookings still waiting for the provider. */
  async reconcilePending(): Promise<number> {
    const now = this.now();
    const due = await new BookingRepository(this.deps.prisma).findProcessingTrains(
      new Date(now.getTime() - RECHECK_AFTER_MS),
    );
    for (const booking of due) {
      await this.reconcile(booking.id);
      if (now.getTime() - booking.updatedAt.getTime() > ESCALATE_AFTER_MS) {
        this.deps.logger.error(
          {
            bookingId: booking.id,
            reference: booking.reference,
            attempts: booking.train?.attempts,
          },
          'Paid train booking still has no railway outcome — needs manual follow-up',
        );
      }
    }
    return due.length;
  }

  /** Customer "refresh status": reconciles a pending booking or fetches the latest PNR status. */
  async refresh(reference: string, viewer: Viewer): Promise<BookingDetails> {
    const booking = await this.deps.bookings.get(reference, viewer);
    const train = booking.train;
    if (!train) throw new NotFoundError('Train booking not found');
    if (booking.status === 'PROCESSING') {
      await this.reconcile(booking.id);
    } else if (
      train.pnr &&
      (train.reservationStatus === 'BOOKED' || train.reservationStatus === 'PARTIALLY_CANCELLED')
    ) {
      const result = await this.deps.provider.status({
        clientReference: booking.reference,
        providerReference: train.providerReference,
        pnr: train.pnr,
      });
      if (result.outcome === 'BOOKED') {
        await this.deps.prisma.$transaction(async (tx) => {
          await tx.trainBooking.update({
            where: { id: train.id },
            data: {
              chartStatus: result.chartStatus,
              lastCheckedAt: this.now(),
              attempts: { increment: 1 },
            },
          });
          for (const [i, p] of result.passengers.entries()) {
            await tx.trainPassenger.updateMany({
              where: { trainBookingId: train.id, sequence: i + 1, status: { not: 'CANCELLED' } },
              data: {
                currentStatus: p.currentStatus,
                ...(p.status !== 'CANCELLED' && { status: p.status }),
                coach: p.coach,
                berth: p.berth,
                berthType: p.berthType,
              },
            });
          }
        });
      }
    }
    return toBookingDetails((await this.load(booking.id)) as BookingRecord);
  }

  async cancellationQuote(
    reference: string,
    viewer: Viewer,
    passengerIds: string[],
  ): Promise<TrainCancellationQuote> {
    const booking = await this.deps.bookings.get(reference, viewer);
    return this.quote(booking, passengerIds);
  }

  /**
   * Cancels passengers with the provider. Retrying with the same Idempotency-Key returns (or
   * resumes) the same cancellation. The refund is shown as successful only once the gateway
   * accepts it.
   */
  async cancel(
    reference: string,
    viewer: Viewer,
    passengerIds: string[],
    idempotencyKey: string,
    ctx: RequestContext,
  ): Promise<BookingDetails> {
    const booking = await this.deps.bookings.get(reference, {
      userId: viewer.userId,
      canReadAny: false,
    });
    const train = booking.train;
    if (!train) throw new NotFoundError('Train booking not found');

    let cancellation = await this.deps.prisma.trainCancellation.findUnique({
      where: { trainBookingId_idempotencyKey: { trainBookingId: train.id, idempotencyKey } },
    });
    if (cancellation && cancellation.status !== 'REQUESTED') return this.details(booking.id);

    if (!cancellation) {
      const quote = await this.quote(booking, passengerIds);
      if (!quote.eligible)
        throw new InvalidStateError(quote.reason ?? 'This booking cannot be cancelled now.');
      try {
        cancellation = await this.deps.prisma.trainCancellation.create({
          data: {
            trainBookingId: train.id,
            idempotencyKey,
            passengerIds,
            chargesPaise: quote.chargesPaise,
            refundPaise: quote.refundPaise,
            requestedById: viewer.userId,
          },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
          return this.details(booking.id);
        throw err;
      }
      await this.deps.audit.record({
        action: 'TRAIN_CANCELLATION_REQUESTED',
        actorId: viewer.userId,
        entityType: 'Booking',
        entityId: booking.id,
        after: {
          cancellationId: cancellation.id,
          passengers: passengerIds.length,
          refundPaise: quote.refundPaise,
        },
        context: ctx,
      });
    }

    const sequences = cancellation.passengerIds.map(
      (id) => train.passengers.find((p) => p.bookingPassengerId === id)?.sequence as number,
    );
    let result;
    try {
      result = await this.deps.provider.cancel({
        clientReference: booking.reference,
        providerReference: train.providerReference,
        pnr: train.pnr,
        cancellationReference: cancellation.id,
        passengerNumbers: sequences,
      });
    } catch {
      throw new ProviderError(
        'The railway system did not confirm the cancellation yet. Nothing is cancelled until it does — please try again shortly.',
        this.deps.provider.name,
      );
    }

    if (result.outcome === 'FAILED') {
      await this.deps.prisma.trainCancellation.update({
        where: { id: cancellation.id },
        data: {
          status: 'FAILED',
          failureReason: result.reason.slice(0, 200),
          completedAt: this.now(),
        },
      });
      throw new InvalidStateError(result.reason);
    }
    if (result.outcome === 'PENDING') {
      await this.deps.prisma.trainCancellation.update({
        where: { id: cancellation.id },
        data: { providerCancellationId: result.providerCancellationId },
      });
      return this.details(booking.id);
    }

    const cancellationId = cancellation.id;
    const ids = new Set(cancellation.passengerIds);
    const refundId = await this.deps.prisma.$transaction(async (tx) => {
      const now = this.now();
      const moved = await tx.trainCancellation.updateMany({
        where: { id: cancellationId, status: 'REQUESTED' },
        data: {
          status: 'COMPLETED',
          providerCancellationId: result.providerCancellationId,
          chargesPaise: result.chargesPaise,
          refundPaise: result.refundPaise,
          completedAt: now,
        },
      });
      if (moved.count !== 1) return null;
      await tx.trainPassenger.updateMany({
        where: { trainBookingId: train.id, bookingPassengerId: { in: [...ids] } },
        data: { status: 'CANCELLED', currentStatus: 'CAN', cancelledAt: now },
      });
      const remaining = await tx.trainPassenger.count({
        where: { trainBookingId: train.id, status: { not: 'CANCELLED' } },
      });
      await tx.trainBooking.update({
        where: { id: train.id },
        data: { reservationStatus: remaining === 0 ? 'CANCELLED' : 'PARTIALLY_CANCELLED' },
      });
      if (remaining === 0) {
        await tx.booking.updateMany({
          where: { id: booking.id, status: 'CONFIRMED' },
          data: {
            status: result.refundPaise > 0 ? 'REFUND_PENDING' : 'CANCELLED',
            cancelledAt: now,
            cancellationReason: 'CUSTOMER_CANCELLED',
          },
        });
      }
      if (result.refundPaise <= 0) return null;
      const refund = await this.deps.refunds.request(tx, {
        bookingId: booking.id,
        amountPaise: result.refundPaise,
        reason: `Cancellation of ${ids.size} passenger${ids.size === 1 ? '' : 's'}`,
        idempotencyKey: `train-cancel:${cancellationId}`,
      });
      return refund.id;
    });
    await this.deps.audit.record({
      action: 'TRAIN_CANCELLED',
      actorId: viewer.userId,
      entityType: 'Booking',
      entityId: booking.id,
      after: { cancellationId, refundPaise: result.refundPaise, chargesPaise: result.chargesPaise },
      context: ctx,
    });
    if (refundId) await this.deps.refunds.process(refundId);
    void this.notify(booking, 'Train ticket cancelled', [
      `Your cancellation for PNR ${train.pnr} (booking ${booking.reference}) is complete.`,
      `Cancellation charges: ${formatMoney(result.chargesPaise)}. Refund: ${formatMoney(result.refundPaise)} to your original payment method.`,
    ]);
    return this.details(booking.id);
  }

  // ───────── internals ─────────

  private load(id: string) {
    return new BookingRepository(this.deps.prisma).findById(id);
  }

  private async details(id: string): Promise<BookingDetails> {
    return toBookingDetails((await this.load(id)) as BookingRecord);
  }

  private touch(trainBookingId: string) {
    return this.deps.prisma.trainBooking.update({
      where: { id: trainBookingId },
      data: { attempts: { increment: 1 }, lastCheckedAt: this.now() },
    });
  }

  private bookingRequest(booking: BookingRecord) {
    const train = booking.train as NonNullable<BookingRecord['train']>;
    return {
      clientReference: booking.reference,
      offerId: train.offerId,
      travelClass: train.travelClass as TrainClass,
      quota: train.quota as TrainQuota,
      confirmOnly: train.confirmOnly,
      contact: { email: booking.contactEmail, phone: booking.contactPhone },
      passengers: train.passengers.map((tp) => {
        const p = booking.passengers.find((x) => x.id === tp.bookingPassengerId);
        return {
          name: `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim(),
          age: p?.age ?? 0,
          gender: p?.gender ?? 'OTHER',
          berthPreference: tp.berthPreference as never,
          foodChoice: (tp.foodChoice as never) ?? null,
        };
      }),
    };
  }

  private async apply(booking: BookingRecord, result: ProviderBookingResult): Promise<void> {
    const train = booking.train as NonNullable<BookingRecord['train']>;
    const now = this.now();
    if (result.outcome === 'PENDING') {
      if (result.providerReference) {
        await this.deps.prisma.trainBooking.update({
          where: { id: train.id },
          data: { providerReference: result.providerReference },
        });
      }
      return;
    }

    if (result.outcome === 'BOOKED') {
      if (result.passengers.length !== train.passengers.length) {
        this.deps.logger.error(
          { bookingId: booking.id },
          'Railway provider returned a different passenger count',
        );
      }
      const applied = await this.deps.prisma.$transaction(async (tx) => {
        const moved = await tx.trainBooking.updateMany({
          where: { id: train.id, reservationStatus: 'PENDING' },
          data: {
            reservationStatus: 'BOOKED',
            pnr: result.pnr,
            providerReference: result.providerReference,
            chartStatus: result.chartStatus,
            failureReason: null,
            lastCheckedAt: now,
          },
        });
        if (moved.count !== 1) return false;
        for (const [i, p] of result.passengers.entries()) {
          await tx.trainPassenger.updateMany({
            where: { trainBookingId: train.id, sequence: i + 1 },
            data: {
              status: p.status,
              bookingStatus: p.bookingStatus,
              currentStatus: p.currentStatus,
              coach: p.coach,
              berth: p.berth,
              berthType: p.berthType,
            },
          });
        }
        await new BookingRepository(tx).transition(booking.id, 'PROCESSING', {
          status: 'CONFIRMED',
          confirmedAt: now,
        });
        return true;
      });
      if (!applied) return;
      await this.deps.audit.record({
        action: 'TRAIN_RESERVATION_CONFIRMED',
        entityType: 'Booking',
        entityId: booking.id,
        after: { pnr: result.pnr, provider: this.deps.provider.name },
      });
      const statuses = result.passengers.map((p, i) => `Passenger ${i + 1}: ${p.currentStatus}`);
      void this.notify(booking, `Train ticket booked — PNR ${result.pnr}`, [
        `Your train booking ${booking.reference} is booked with the railway system.`,
        `PNR ${result.pnr} · ${train.trainNumber} ${train.trainName} · ${train.fromStation} → ${train.toStation} · ${train.journeyDate.toISOString().slice(0, 10)}`,
        ...statuses,
        result.passengers.some((p) => p.status !== 'CONFIRMED')
          ? 'Some passengers are on RAC or the waiting list. Their berth is not confirmed yet; check the PNR status before travelling.'
          : '',
        this.deps.provider.isDemo ? 'DEMO BOOKING — not valid for travel.' : '',
      ]);
      return;
    }

    // FAILED: the provider refused. Refund the whole amount.
    const refundId = await this.deps.prisma.$transaction(async (tx) => {
      const moved = await tx.trainBooking.updateMany({
        where: { id: train.id, reservationStatus: 'PENDING' },
        data: {
          reservationStatus: 'FAILED',
          providerReference: result.providerReference,
          failureReason: result.reason.slice(0, 300),
          lastCheckedAt: now,
        },
      });
      if (moved.count !== 1) return null;
      await new BookingRepository(tx).transition(booking.id, 'PROCESSING', {
        status: 'REFUND_PENDING',
        cancelledAt: now,
        cancellationReason: 'RESERVATION_FAILED',
      });
      const refund = await this.deps.refunds.request(tx, {
        bookingId: booking.id,
        amountPaise: booking.totalAmountPaise,
        reason: 'Railway reservation failed — full refund',
        idempotencyKey: `train-failed:${booking.id}`,
      });
      return refund.id;
    });
    if (!refundId) return;
    await this.deps.audit.record({
      action: 'TRAIN_RESERVATION_FAILED',
      entityType: 'Booking',
      entityId: booking.id,
      after: { reason: result.reason.slice(0, 200), refundPaise: booking.totalAmountPaise },
    });
    await this.deps.refunds.process(refundId);
    void this.notify(booking, 'Train booking could not be completed', [
      `The railway system could not complete booking ${booking.reference}: ${result.reason}`,
      `The full amount of ${formatMoney(booking.totalAmountPaise)} is being refunded to your original payment method.`,
    ]);
  }

  private async quote(
    booking: BookingRecord,
    passengerIds: string[],
  ): Promise<TrainCancellationQuote> {
    const train = booking.train;
    if (!train) throw new NotFoundError('Train booking not found');
    const demo = this.deps.provider.isDemo;
    const caps = this.deps.provider.capabilities();
    const fail = (reason: string): TrainCancellationQuote => ({
      eligible: false,
      reason,
      passengerIds,
      farePaise: 0,
      chargesPaise: 0,
      refundPaise: 0,
      rules: [],
      demo,
    });
    const chosen = passengerIds.map((id) =>
      train.passengers.find((p) => p.bookingPassengerId === id),
    );
    if (chosen.some((p) => !p)) {
      throw new ValidationError([
        { path: 'body.passengerIds', message: 'Choose passengers from this booking' },
      ]);
    }
    if (!caps.cancellation)
      return fail('Online cancellation is not available for this railway provider.');
    if (booking.status !== 'CONFIRMED' || !train.pnr)
      return fail('Only booked tickets with a PNR can be cancelled.');
    if (train.reservationStatus !== 'BOOKED' && train.reservationStatus !== 'PARTIALLY_CANCELLED') {
      return fail('This ticket is not active.');
    }
    if (chosen.some((p) => p?.status === 'CANCELLED' || p?.status === 'PENDING')) {
      return fail('One or more of these passengers are already cancelled.');
    }
    const active = train.passengers.filter((p) => p.status !== 'CANCELLED');
    if (!caps.partialCancellation && chosen.length !== active.length) {
      return fail('This railway provider only cancels the whole ticket.');
    }
    const farePaise = chosen.reduce((sum, p) => sum + (p?.farePaise ?? 0), 0);
    const result = await this.deps.provider.cancellationQuote({
      travelClass: train.travelClass as TrainClass,
      quota: train.quota as TrainQuota,
      departureAt: train.departureAt,
      passengers: chosen.map((p) => ({
        status: p?.status as 'CONFIRMED' | 'RAC' | 'WAITLIST',
        farePaise: p?.farePaise ?? 0,
      })),
    });
    if (!result.eligible) return { ...fail(result.reason), farePaise, rules: result.rules };
    return {
      eligible: true,
      reason: null,
      passengerIds,
      farePaise,
      chargesPaise: result.chargesPaise,
      refundPaise: result.refundPaise,
      rules: result.rules,
      demo,
    };
  }

  /** Booking emails through the configured email provider; failures never affect the booking. */
  private async notify(booking: BookingRecord, subject: string, lines: string[]): Promise<void> {
    try {
      await this.deps.email.send({
        to: booking.contactEmail,
        subject: `${this.deps.provider.isDemo ? '[DEMO] ' : ''}${subject}`,
        text: lines.filter(Boolean).join('\n'),
      });
    } catch (err) {
      this.deps.logger.warn(
        { bookingId: booking.id, err: { message: (err as Error).message } },
        'Booking email failed',
      );
    }
  }
}
