import type { CancellationTerms } from './data';
import { atTime, formatDateTime } from './dates';

export type CancellationKind = 'FREE' | 'PARTIAL' | 'NON_REFUNDABLE';

export interface CancellationInfo {
  kind: CancellationKind;
  /** Short badge text, e.g. "Free cancellation". */
  badge: string;
  /** Full sentence shown beside the room and in the booking review. */
  headline: string;
  /** Every rule in plain English, in time order. */
  rules: string[];
  /** Last moment a full refund is possible, or null. */
  freeUntil: Date | null;
  /** Last moment a partial refund is possible, or null. */
  partialUntil: Date | null;
  partialPercent: number;
}

const hoursBefore = (checkIn: Date, hours: number) =>
  new Date(checkIn.getTime() - hours * 3_600_000);

/**
 * Turns a room's cancellation terms into dates and wording for a given stay.
 * `now` is injectable so the "window already closed" case is testable.
 */
export function describeCancellation(
  terms: CancellationTerms,
  checkInDate: string,
  checkInTime: string,
  now: Date = new Date(),
): CancellationInfo {
  const checkIn = atTime(checkInDate, checkInTime);
  const freeHours = terms.freeUntilHours ?? 0;
  const partialPercent = terms.partialPercent ?? 0;
  const partialHours = terms.partialUntilHours ?? 0;

  const freeUntil = freeHours > 0 ? hoursBefore(checkIn, freeHours) : null;
  const partialUntil = partialPercent > 0 && partialHours >= 0 ? hoursBefore(checkIn, partialHours) : null;
  const freeStillOpen = freeUntil !== null && now.getTime() <= freeUntil.getTime();
  const partialStillOpen = partialUntil !== null && now.getTime() <= partialUntil.getTime();

  const rules: string[] = [];
  if (freeUntil) {
    rules.push(
      freeStillOpen
        ? `Free cancellation until ${formatDateTime(freeUntil)}.`
        : `The free cancellation window closed on ${formatDateTime(freeUntil)}.`,
    );
  }
  if (partialUntil) {
    const from = freeUntil ? 'After that, ' : '';
    rules.push(
      `${from}cancel until ${formatDateTime(partialUntil)} for a ${partialPercent}% refund.`,
    );
  }
  rules.push(
    freeUntil || partialUntil
      ? 'No refund after that, and for no-shows.'
      : 'Non-refundable: no refund on cancellation or no-show.',
  );

  if (freeStillOpen) {
    return {
      kind: 'FREE',
      badge: 'Free cancellation',
      headline: `Free cancellation until ${formatDateTime(freeUntil)}`,
      rules,
      freeUntil,
      partialUntil,
      partialPercent,
    };
  }
  if (partialStillOpen) {
    return {
      kind: 'PARTIAL',
      badge: `${partialPercent}% refund`,
      headline: `Partial refund (${partialPercent}%) if cancelled before ${formatDateTime(partialUntil)}`,
      rules,
      freeUntil,
      partialUntil,
      partialPercent,
    };
  }
  return {
    kind: 'NON_REFUNDABLE',
    badge: 'Non-refundable',
    headline: 'Non-refundable',
    rules,
    freeUntil,
    partialUntil,
    partialPercent,
  };
}

/** How much would come back if the guest cancelled at `now`. Amounts in paise. */
export function refundAmount(
  terms: CancellationTerms,
  totalPaidPaise: number,
  checkInDate: string,
  checkInTime: string,
  now: Date = new Date(),
): number {
  const info = describeCancellation(terms, checkInDate, checkInTime, now);
  if (info.kind === 'FREE') return totalPaidPaise;
  if (info.kind === 'PARTIAL') return Math.round((totalPaidPaise * info.partialPercent) / 100);
  return 0;
}
