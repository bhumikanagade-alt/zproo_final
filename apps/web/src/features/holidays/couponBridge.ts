import type { CouponCheck, PublicCoupon } from '@zproo/types';
import { couponErrorMessage, couponsApi } from '@/features/coupons/api';
import { ApiClientError } from '@/services/http';

/**
 * The Holiday Explorer is a self-contained page shown in an iframe (public/holiday-explorer.html). It cannot call the
 * API itself, so it asks the ZPROO GO page around it through `postMessage`, and this module answers.
 * That keeps one coupon system for every service: coupons made in Admin → Marketing → Coupons with
 * "Valid on" = Holidays (or all services) are listed, checked and counted exactly as for flights, buses and hotels.
 */
export const HOLIDAY_COUPON_REQUEST = 'zproo-holiday-coupons';
export const HOLIDAY_COUPON_REPLY = 'zproo-holiday-coupons-reply';
export const HOLIDAY_SERVICE = 'HOLIDAY' as const;

export type HolidayCouponAction = 'list' | 'check' | 'redeem' | 'signin';

export interface HolidayCouponRequest {
  type: typeof HOLIDAY_COUPON_REQUEST;
  id: number;
  action: HolidayCouponAction;
  code?: string;
  orderPaise?: number;
  bookingRef?: string;
}

export interface HolidayCouponReply {
  type: typeof HOLIDAY_COUPON_REPLY;
  id: number;
  ok: boolean;
  /** Whether a customer is signed in (coupons need an account, like hotels, trains and cabs). */
  signedIn: boolean;
  data?: PublicCoupon[] | CouponCheck;
  message?: string;
  /** The server said no to this coupon (expired, used up, below the minimum order…). */
  refused?: boolean;
  needsSignIn?: boolean;
}

const ACTIONS: readonly string[] = ['list', 'check', 'redeem', 'signin'];

/** Accepts only well-formed requests; anything else posted to the window is ignored. */
export function parseHolidayCouponRequest(value: unknown): HolidayCouponRequest | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (v.type !== HOLIDAY_COUPON_REQUEST || typeof v.id !== 'number' || !Number.isFinite(v.id)) return null;
  if (typeof v.action !== 'string' || !ACTIONS.includes(v.action)) return null;
  const code = typeof v.code === 'string' ? v.code.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 20) : undefined;
  const orderPaise = typeof v.orderPaise === 'number' && Number.isInteger(v.orderPaise) && v.orderPaise > 0 ? v.orderPaise : undefined;
  const bookingRef = typeof v.bookingRef === 'string' ? v.bookingRef.trim().slice(0, 64) : undefined;
  return { type: HOLIDAY_COUPON_REQUEST, id: v.id, action: v.action as HolidayCouponAction, code, orderPaise, bookingRef };
}

/** Does what the holiday page asked (list / check / redeem) and returns the reply to post back. `signin` is handled by the page. */
export async function answerHolidayCouponRequest(req: HolidayCouponRequest, signedIn: boolean): Promise<HolidayCouponReply> {
  const reply = (extra: Partial<HolidayCouponReply>): HolidayCouponReply => ({ type: HOLIDAY_COUPON_REPLY, id: req.id, ok: false, signedIn, ...extra });
  try {
    if (req.action === 'list') return reply({ ok: true, data: await couponsApi.live(HOLIDAY_SERVICE) });
    if (req.action === 'signin') return reply({ ok: true });
    if (!signedIn) return reply({ needsSignIn: true, message: 'Please sign in to use a coupon.' });
    if (!req.code || !req.orderPaise) return reply({ refused: true, message: req.code ? 'Your booking total is missing. Please try again.' : 'Enter a coupon code first.' });
    if (req.action === 'check') {
      return reply({ ok: true, data: await couponsApi.check({ code: req.code, service: HOLIDAY_SERVICE, orderPaise: req.orderPaise }) });
    }
    if (!req.bookingRef || req.bookingRef.length < 3) return reply({ refused: true, message: 'The booking reference is missing. Please try again.' });
    return reply({ ok: true, data: await couponsApi.redeem({ code: req.code, service: HOLIDAY_SERVICE, orderPaise: req.orderPaise, bookingRef: req.bookingRef }) });
  } catch (error) {
    const status = error instanceof ApiClientError ? error.status : 0;
    return reply({
      refused: status === 400,
      needsSignIn: status === 401,
      message: status === 401 ? 'Please sign in to use a coupon.' : couponErrorMessage(error),
    });
  }
}
