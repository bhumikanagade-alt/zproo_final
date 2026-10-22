import type { PriceBreakdown } from '@zproo/types';

/**
 * Fare summary for chosen seats, shown before booking. GST is included in seat prices; the
 * booked amounts (with the exact split) come back from the API.
 */
export function busPriceBreakdown(selection: { seats: { pricePaise: number }[]; discountPaise?: number }): PriceBreakdown {
  const total = selection.seats.reduce((sum, s) => sum + s.pricePaise, 0);
  const n = selection.seats.length;
  const discount = Math.min(total, selection.discountPaise ?? 0);
  return {
    lines: [{ label: `Fare incl. GST — ${n} seat${n === 1 ? '' : 's'}`, amountPaise: total }],
    basePaise: total,
    taxesPaise: 0,
    feesPaise: 0,
    discountPaise: discount,
    totalPaise: total - discount,
    currency: 'INR',
  };
}
