import type { BookingStatus, BusCancellationQuote, BusCancellationRule, PaymentStatus } from '@zproo/types';

/**
 * Cancellation rules for a bus booking, shared by the API and the in-browser demo so both give
 * the same answer. The refund share comes from the operator's policy sold with the trip: the
 * first rule whose "hours before departure" is met applies.
 */
export const DEFAULT_BUS_CANCELLATION_POLICY: BusCancellationRule[] = [
  { hoursBefore: 24, refundPercent: 90 },
  { hoursBefore: 12, refundPercent: 75 },
  { hoursBefore: 4, refundPercent: 50 },
  { hoursBefore: 0, refundPercent: 0 },
];

const UNPAID: BookingStatus[] = ['INITIATED', 'PENDING_PAYMENT'];

export function busCancellationQuote(input: {
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  totalPaise: number;
  departureAt: string | Date;
  policy?: BusCancellationRule[] | null;
  now?: Date;
}): BusCancellationQuote {
  const rules = [...(input.policy?.length ? input.policy : DEFAULT_BUS_CANCELLATION_POLICY)].sort(
    (a, b) => b.hoursBefore - a.hoursBefore,
  );
  const now = input.now ?? new Date();
  const hours = Math.floor((new Date(input.departureAt).getTime() - now.getTime()) / 3_600_000);
  const base = {
    farePaise: input.totalPaise,
    hoursBeforeDeparture: hours,
    rules,
    refundPercent: 0,
    chargesPaise: 0,
    refundPaise: 0,
    paid: false,
  };
  const no = (reason: string, paid = false): BusCancellationQuote => ({ ...base, paid, eligible: false, reason });

  if (UNPAID.includes(input.status)) {
    // Nothing was charged: the seats are simply released.
    return { ...base, eligible: true, reason: null };
  }
  if (input.status === 'CANCELLED' || input.status === 'REFUND_PENDING' || input.status === 'REFUNDED') {
    return no('This booking is already cancelled.');
  }
  if (input.status !== 'CONFIRMED') {
    return no(
      input.status === 'COMPLETED'
        ? 'This trip is complete and cannot be cancelled.'
        : 'This booking is still being processed. Please try again in a few minutes.',
    );
  }
  if (hours < 0 || new Date(input.departureAt).getTime() <= now.getTime()) {
    return no('This bus has already departed, so the ticket cannot be cancelled.', true);
  }
  const rule = rules.find((r) => hours >= r.hoursBefore);
  const refundPercent = rule?.refundPercent ?? 0;
  const refundPaise = Math.floor((input.totalPaise * refundPercent) / 100);
  return {
    ...base,
    paid: true,
    eligible: true,
    reason: null,
    refundPercent,
    refundPaise,
    chargesPaise: input.totalPaise - refundPaise,
  };
}
