import type { Coupon, CouponCheck, PublicCoupon, ServiceType } from '@zproo/types';
import { adminInstant } from '@zproo/utils';
import { StaticError } from '../core';
import { adminDb, saveAdminDb } from './db';
import { STARTERS } from './demo';

/**
 * Static (demo) mode twin of the API's CouponService: customers see and use the coupons created
 * in the admin panel (stored in this browser), with the same rules and messages.
 */

function allCoupons(): Coupon[] {
  const a = adminDb();
  if (!a.seeded.coupons) {
    a.collections.coupons = [...STARTERS.coupons(), ...a.collections.coupons];
    a.seeded.coupons = true;
    saveAdminDb();
  }
  return a.collections.coupons;
}

export function publicCoupons(service?: ServiceType): PublicCoupon[] {
  const now = Date.now();
  return allCoupons()
    .filter(
      (c) =>
        c.active &&
        adminInstant(c.validFrom, 'start') <= now &&
        adminInstant(c.validTo, 'end') >= now &&
        (c.usageLimit === null || c.usedCount < c.usageLimit) &&
        (!service || c.services.length === 0 || c.services.includes(service)),
    )
    .map((c) => ({
      code: c.code,
      description: c.description,
      discountType: c.discountType,
      value: c.value,
      maxDiscountPaise: c.maxDiscountPaise,
      minOrderPaise: c.minOrderPaise,
      services: c.services,
      validTo: c.validTo,
    }));
}

export interface StaticCouponQuote {
  coupon: Coupon;
  discountPaise: number;
}

/** null = no such code (caller may try a built-in code); throws a validation error that says why not. */
export function quoteCoupon(input: { code: string; service: ServiceType; userId: string; orderPaise: number }, path = 'body.promoCode'): StaticCouponQuote | null {
  const code = input.code.trim().toUpperCase();
  const c = allCoupons().find((x) => x.code === code);
  if (!c) return null;
  const reject = (message: string): never => {
    throw new StaticError(400, 'VALIDATION_ERROR', 'Validation failed', [{ path, message }]);
  };
  const now = Date.now();
  if (!c.active) return reject('This coupon is not active');
  if (adminInstant(c.validFrom, 'start') > now) return reject('This coupon is not valid yet');
  if (adminInstant(c.validTo, 'end') < now) return reject('This coupon has expired');
  if (c.services.length > 0 && !c.services.includes(input.service)) return reject('This coupon does not apply to this service');
  if (input.orderPaise < c.minOrderPaise) return reject(`Spend at least ₹${(c.minOrderPaise / 100).toLocaleString('en-IN')} to use this coupon`);
  if (c.usageLimit !== null && c.usedCount >= c.usageLimit) return reject('This coupon has been fully used');
  const used = adminDb().couponUses.filter((u) => u.couponId === c.id && u.userId === input.userId).length;
  if (used >= c.perUserLimit) return reject('You have already used this coupon the maximum number of times');
  const raw = c.discountType === 'PERCENT' ? Math.floor((input.orderPaise * c.value) / 100) : c.value;
  const capped = c.discountType === 'PERCENT' && c.maxDiscountPaise !== null ? Math.min(raw, c.maxDiscountPaise) : raw;
  return { coupon: c, discountPaise: Math.max(0, Math.min(capped, input.orderPaise)) };
}

export function checkCoupon(input: { code: string; service: ServiceType; userId: string; orderPaise: number }): CouponCheck {
  const q = quoteCoupon(input, 'body.code');
  if (!q) throw new StaticError(400, 'VALIDATION_ERROR', 'Validation failed', [{ path: 'body.code', message: 'Invalid or expired coupon code' }]);
  return { code: q.coupon.code, description: q.coupon.description, discountPaise: q.discountPaise };
}

/** Counts one use (so the admin panel's "Used" column moves and limits are enforced). */
export function redeemCoupon(quote: StaticCouponQuote, userId: string, bookingId: string): void {
  quote.coupon.usedCount += 1;
  adminDb().couponUses.push({ couponId: quote.coupon.id, userId, bookingId });
  saveAdminDb();
}

/**
 * Hotel stays finish in the browser: records the coupon use for this booking reference (once), after
 * checking the code again. Same booking reference + code counts one time.
 */
export function redeemCouponForReference(input: { code: string; service: ServiceType; userId: string; orderPaise: number; bookingRef: string }): CouponCheck {
  const code = input.code.trim().toUpperCase();
  const existing = allCoupons().find((x) => x.code === code);
  if (existing && adminDb().couponUses.some((u) => u.couponId === existing.id && u.userId === input.userId && u.bookingId === input.bookingRef)) {
    const raw = existing.discountType === 'PERCENT' ? Math.floor((input.orderPaise * existing.value) / 100) : existing.value;
    const capped = existing.discountType === 'PERCENT' && existing.maxDiscountPaise !== null ? Math.min(raw, existing.maxDiscountPaise) : raw;
    return { code, description: existing.description, discountPaise: Math.max(0, Math.min(capped, input.orderPaise)) };
  }
  const quote = quoteCoupon(input, 'body.code');
  if (!quote) throw new StaticError(400, 'VALIDATION_ERROR', 'Validation failed', [{ path: 'body.code', message: 'Invalid or expired coupon code' }]);
  redeemCoupon(quote, input.userId, input.bookingRef);
  return { code: quote.coupon.code, description: quote.coupon.description, discountPaise: quote.discountPaise };
}

/** Gives back the use recorded for this booking reference: the "Used" count goes down and the customer can use the coupon again. */
export function releaseCouponForReference(input: { code: string; userId: string; bookingRef: string }): { released: boolean } {
  const code = input.code.trim().toUpperCase();
  const c = allCoupons().find((x) => x.code === code);
  if (!c) return { released: false };
  const db = adminDb();
  const i = db.couponUses.findIndex((u) => u.couponId === c.id && u.userId === input.userId && u.bookingId === input.bookingRef);
  if (i < 0) return { released: false };
  db.couponUses.splice(i, 1);
  c.usedCount = Math.max(0, c.usedCount - 1);
  saveAdminDb();
  return { released: true };
}
