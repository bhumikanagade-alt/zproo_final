import type { BusCancellationRule } from '@zproo/types';
import { daysBetweenIso, isoWeekday } from './time';

/** GST on A/C bus tickets; non-A/C fares carry none. */
export const BUS_AC_GST_PERCENT = 5;

/** The development provider's refund rules, shown on every trip and printed on tickets. */
export const BUS_CANCELLATION_POLICY: BusCancellationRule[] = [
  { hoursBefore: 24, refundPercent: 90 },
  { hoursBefore: 12, refundPercent: 75 },
  { hoursBefore: 4, refundPercent: 50 },
  { hoursBefore: 0, refundPercent: 0 },
];

export interface SeatFare {
  basePaise: number;
  taxPaise: number;
  pricePaise: number;
}

/**
 * Price of one seat on a trip. Weekend departures and last-minute travel cost more, early
 * bookings slightly less; lower sleepers and window seats carry their seat premium. Base fares
 * round to ₹10 and GST to the rupee, so every price is a whole rupee amount.
 */
export function busSeatFare(input: {
  baseFarePaise: number;
  seatFarePercent: number;
  date: string;
  today: string;
  ac: boolean;
}): SeatFare {
  const daysAhead = daysBetweenIso(input.today, input.date);
  const weekday = isoWeekday(input.date);
  let demand = 1;
  if (weekday >= 5) demand += 0.12; // Friday–Sunday
  if (daysAhead <= 1) demand += 0.1;
  else if (daysAhead >= 20) demand -= 0.05;
  const base =
    Math.round((input.baseFarePaise * demand * input.seatFarePercent) / 100 / 1000) * 1000;
  const tax = input.ac ? Math.round((base * BUS_AC_GST_PERCENT) / 100 / 100) * 100 : 0;
  return { basePaise: base, taxPaise: tax, pricePaise: base + tax };
}
