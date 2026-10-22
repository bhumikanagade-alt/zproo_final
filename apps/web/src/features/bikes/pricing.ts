import { RULES } from './rules';
import { parseLocal } from './dates';
import type { Bike, PaymentMethod, QuoteLine, RentalExtra, RentalQuote, RentalSchedule } from './types';

export const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

interface QuoteInput {
  bike: Bike;
  schedule: RentalSchedule;
  extras: RentalExtra[];
  /** A coupon already checked by the server: its code and the whole rupees it takes off the total (GST included). */
  coupon?: { code: string; discount: number } | null;
}

/**
 * Estimated rental charges. Returns `null` when the dates are missing or the return is not
 * after the pickup, so callers never display a nonsense price.
 *
 * Rules (see rules.ts):
 *  - billed per started hour, with the bike's minimum billable hours
 *  - each full 24h block costs the daily rate; leftover hours cost hourly, capped at one day
 *  - 5% off from 3 days, 10% off from 7 days (rental charge only)
 *  - add-ons are charged per rental day (24h blocks, rounded up)
 *  - one-way fee when the return hub differs from the pickup hub
 *  - GST on everything above; the refundable deposit is shown separately
 *  - a coupon from the admin panel comes off the total after GST and never takes it below ₹1
 */
export function computeQuote({ bike, schedule, extras, coupon }: QuoteInput): RentalQuote | null {
  const start = parseLocal(schedule.pickupDate, schedule.pickupTime);
  const end = parseLocal(schedule.returnDate, schedule.returnTime);
  if (!start || !end || end <= start) return null;

  const { pricing } = bike;
  const elapsedHours = (end.getTime() - start.getTime()) / 3_600_000;
  const billableHours = Math.max(pricing.minHours, Math.ceil(elapsedHours - 1e-9));
  const fullDays = Math.floor(billableHours / 24);
  const extraHours = billableHours - fullDays * 24;
  const rentalDays = Math.max(1, Math.ceil(billableHours / 24));

  const lines: QuoteLine[] = [];
  const dayCharge = fullDays * pricing.daily;
  if (fullDays) lines.push({ label: `Rental: ${fullDays} ${fullDays === 1 ? 'day' : 'days'} × ${rupees(pricing.daily)}`, amount: dayCharge });
  const hourCharge = extraHours ? Math.min(extraHours * pricing.hourly, pricing.daily) : 0;
  if (extraHours) lines.push({ label: `Rental: ${extraHours} ${extraHours === 1 ? 'hr' : 'hrs'} × ${rupees(pricing.hourly)}${extraHours * pricing.hourly > pricing.daily ? ' (capped at 1 day)' : ''}`, amount: hourCharge });
  const rentalCharge = dayCharge + hourCharge;

  const tier = RULES.discounts.find((d) => billableHours >= d.minHours);
  const discount = tier ? Math.round(rentalCharge * tier.rate) : 0;
  if (tier) lines.push({ label: tier.label, amount: discount, negative: true });

  let extrasTotal = 0;
  for (const x of extras) {
    const amount = x.perDay * rentalDays;
    extrasTotal += amount;
    lines.push({ label: `${x.label}: ${rentalDays} ${rentalDays === 1 ? 'day' : 'days'} × ${rupees(x.perDay)}`, amount });
  }

  const oneWayFee = schedule.pickupLocationId !== schedule.returnLocationId ? RULES.oneWayFee : 0;
  if (oneWayFee) lines.push({ label: 'One-way return fee', amount: oneWayFee });

  const subtotal = rentalCharge - discount + extrasTotal + oneWayFee;
  const tax = Math.round(subtotal * RULES.taxRate);
  const grossTotal = subtotal + tax;
  const couponDiscount = coupon ? Math.max(0, Math.min(Math.floor(coupon.discount), grossTotal - 1)) : 0;
  return {
    elapsedHours,
    billableHours,
    rentalDays,
    fullDays,
    extraHours,
    kmIncluded: rentalDays * pricing.kmPerDay,
    lines,
    rentalCharge,
    discount,
    extrasTotal,
    oneWayFee,
    subtotal,
    tax,
    grossTotal,
    couponCode: coupon && couponDiscount > 0 ? coupon.code : null,
    couponDiscount,
    total: grossTotal - couponDiscount,
    deposit: bike.securityDeposit,
  };
}

/** Amount charged at the payment step. Pay-at-pickup charges nothing now; the deposit is always collected at the hub. */
export const amountDueNow = (method: PaymentMethod, quote: RentalQuote) => (method === 'pay-at-pickup' ? 0 : quote.total);
