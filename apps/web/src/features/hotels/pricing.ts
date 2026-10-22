import { HOTEL_COUPONS, HOTEL_TAX_RATE, type HotelRoom } from './data';

export interface PriceBreakdown {
  nights: number;
  rooms: number;
  /** Room price per night, before taxes. */
  perNightPaise: number;
  /** Struck-through price per night, when the room is on offer. */
  originalPerNightPaise: number | null;
  /** perNight × nights × rooms. */
  roomSubtotalPaise: number;
  /** What the same stay costs at the original price. Equals the subtotal when there is no offer. */
  originalSubtotalPaise: number;
  /** Saving from the room offer (original − current). */
  offerDiscountPaise: number;
  taxesPaise: number;
  couponCode: string | null;
  couponPercent: number;
  couponDiscountPaise: number;
  /** Final amount payable. */
  totalPaise: number;
  /** Total per night per room, all-in (for comparing hotels). */
  allInPerNightPaise: number;
}

export type CouponResult =
  | { ok: true; code: string; percent: number }
  | { ok: false; message: string };

/**
 * A coupon the server has already checked (created in Admin → Marketing → Coupons). The discount is the
 * amount the server worked out for this stay, so dates, limits and caps are the admin's, not ours.
 */
export interface AppliedCoupon {
  code: string;
  discountPaise: number;
}

/** A built-in code (plain text) or a server-checked admin coupon. */
export type CouponSelection = string | AppliedCoupon | null | undefined;

/** Built-in codes only (ZPROO10, STAY15). Admin coupons are checked by the server instead. */
export function checkCoupon(input: string | null | undefined): CouponResult {
  const code = (input ?? '').trim().toUpperCase();
  if (!code) return { ok: false, message: 'Enter a coupon code.' };
  const percent = HOTEL_COUPONS[code];
  if (!percent) return { ok: false, message: 'Invalid hotel coupon. Tap “View offers” to see the codes you can use.' };
  return { ok: true, code, percent };
}

/** The store keeps the code and (for admin coupons) the server's amount; this turns them into one selection. */
export function couponSelection(code: string | null | undefined, discountPaise: number | null | undefined): CouponSelection {
  if (!code) return null;
  return typeof discountPaise === 'number' ? { code, discountPaise } : code;
}

const positive = (n: number) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 1);

/**
 * The single source of truth for hotel prices. Search results, the review page, payment and the
 * confirmation all call this, so the numbers can never disagree.
 * Taxes are charged on the room price; the coupon comes off the room price (never the taxes).
 */
export function priceStay(
  room: Pick<HotelRoom, 'pricePerNightPaise' | 'originalPricePerNightPaise'>,
  nights: number,
  rooms: number,
  coupon?: CouponSelection,
): PriceBreakdown {
  const n = positive(nights);
  const r = positive(rooms);
  const roomSubtotalPaise = room.pricePerNightPaise * n * r;
  const original = room.originalPricePerNightPaise;
  const hasOffer = typeof original === 'number' && original > room.pricePerNightPaise;
  const originalSubtotalPaise = hasOffer ? original * n * r : roomSubtotalPaise;
  const taxesPaise = Math.round(roomSubtotalPaise * HOTEL_TAX_RATE);

  let couponCode: string | null = null;
  let couponPercent = 0;
  let couponDiscountPaise = 0;
  if (coupon && typeof coupon === 'object') {
    couponCode = coupon.code;
    couponDiscountPaise = Math.max(0, Math.min(Math.round(coupon.discountPaise), roomSubtotalPaise));
    couponPercent = roomSubtotalPaise > 0 ? Math.round((couponDiscountPaise / roomSubtotalPaise) * 100) : 0;
  } else if (coupon) {
    const builtIn = checkCoupon(coupon);
    if (builtIn.ok) {
      couponCode = builtIn.code;
      couponPercent = builtIn.percent;
      couponDiscountPaise = Math.round((roomSubtotalPaise * couponPercent) / 100);
    }
  }
  const totalPaise = Math.max(0, roomSubtotalPaise + taxesPaise - couponDiscountPaise);

  return {
    nights: n,
    rooms: r,
    perNightPaise: room.pricePerNightPaise,
    originalPerNightPaise: hasOffer ? original : null,
    roomSubtotalPaise,
    originalSubtotalPaise,
    offerDiscountPaise: originalSubtotalPaise - roomSubtotalPaise,
    taxesPaise,
    couponCode,
    couponPercent,
    couponDiscountPaise,
    totalPaise,
    allInPerNightPaise: Math.round((roomSubtotalPaise + taxesPaise) / (n * r)),
  };
}

/** "Save 17%" style label for an offer, or null when there is none. */
export function offerPercent(
  room: Pick<HotelRoom, 'pricePerNightPaise' | 'originalPricePerNightPaise'>,
): number | null {
  const original = room.originalPricePerNightPaise;
  if (!original || original <= room.pricePerNightPaise) return null;
  return Math.round(((original - room.pricePerNightPaise) / original) * 100);
}
