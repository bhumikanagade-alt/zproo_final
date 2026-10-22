import type {
  PriceBreakdown,
  TrainAvailability,
  TrainBookingInfo,
  TrainFare,
  TrainQuota,
} from '@zproo/types';

/*
 * Train fare arithmetic and status wording shared by the API and the static website, so both
 * compute exactly the same totals and never word a waitlisted ticket as confirmed.
 */

/** Fare lines: per-passenger components times the passengers, plus the platform fee if any. */
export function trainPriceLines(
  fare: TrainFare,
  passengers: number,
  feePaise: number,
): PriceBreakdown['lines'] {
  const n = passengers;
  const x = (label: string, paise: number) =>
    paise > 0 ? [{ label, amountPaise: paise * n }] : [];
  return [
    { label: `Base fare × ${n} passenger${n === 1 ? '' : 's'}`, amountPaise: fare.basePaise * n },
    ...x('Reservation charges', fare.reservationPaise),
    ...x('Superfast charges', fare.superfastPaise),
    ...x('Tatkal charges', fare.tatkalPaise),
    ...x('GST', fare.gstPaise),
    ...(feePaise > 0 ? [{ label: 'Service fee', amountPaise: feePaise }] : []),
  ];
}

/** Total for `passengers` at the quoted per-passenger fare, plus the platform fee. */
export function trainQuotePrice(
  fare: TrainFare,
  passengers: number,
  feePaise: number,
): PriceBreakdown {
  const base =
    (fare.basePaise + fare.reservationPaise + fare.superfastPaise + fare.tatkalPaise) * passengers;
  const taxes = fare.gstPaise * passengers;
  return {
    lines: trainPriceLines(fare, passengers, feePaise),
    basePaise: base,
    taxesPaise: taxes,
    feesPaise: feePaise,
    discountPaise: 0,
    totalPaise: base + taxes + feePaise,
    currency: 'INR',
  };
}

/** Plain-language warnings shown before booking. Never implies a berth is confirmed when it isn't. */
export function trainAvailabilityWarnings(
  availability: TrainAvailability,
  passengers: number,
  quota: TrainQuota,
): string[] {
  const warnings: string[] = [];
  if (availability.status === 'AVAILABLE' && (availability.count ?? 0) < passengers) {
    warnings.push(
      `Only ${availability.count} berth${availability.count === 1 ? ' is' : 's are'} available for ${passengers} passengers. The others will be on RAC or the waiting list.`,
    );
  }
  if (availability.status === 'RAC') {
    warnings.push(
      `This ticket will be RAC (${availability.label}): you can board and share a berth, but a full berth is given only if one becomes free. Your berth is not confirmed.`,
    );
  }
  if (availability.status === 'WAITLIST') {
    warnings.push(
      `This ticket will be waitlisted (${availability.label}). It is NOT a confirmed berth.`,
      'Indian Railways rule: an e-ticket that is still fully waitlisted when the chart is prepared is cancelled automatically and refunded, and you may not travel on it in reserved coaches.',
    );
  }
  if (quota === 'TQ') warnings.push('Confirmed Tatkal tickets are not refundable on cancellation.');
  if (availability.status !== 'AVAILABLE' && availability.bookable) {
    warnings.push(
      'Availability changes as people book. The final status is the one the railway system confirms after payment.',
    );
  }
  return warnings;
}

/** Short reservation status for lists, e.g. "Booked · GNWL 12". */
export function trainStatusLabel(info: TrainBookingInfo, bookingStatus: string): string {
  if (bookingStatus === 'PROCESSING') return 'Payment received · reserving';
  switch (info.reservationStatus) {
    case 'PENDING':
      return bookingStatus === 'PENDING_PAYMENT' ? 'Awaiting payment' : 'Reservation pending';
    case 'FAILED':
      return 'Reservation failed';
    case 'CANCELLED':
      return 'Cancelled';
    case 'PARTIALLY_CANCELLED':
      return 'Partially cancelled';
    case 'BOOKED': {
      const active = info.passengers.filter((p) => p.status !== 'CANCELLED');
      const waiting = active.find((p) => p.status !== 'CONFIRMED');
      return waiting ? `Booked · ${waiting.currentStatus ?? waiting.status}` : 'Booked · Confirmed';
    }
  }
}
