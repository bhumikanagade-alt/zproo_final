import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/coupons/api', async () => {
  const { ApiClientError } = await import('@/services/http');
  return {
    couponErrorMessage: (e: unknown) => (e instanceof ApiClientError ? (e.details[0]?.message ?? e.message) : 'Could not check this coupon. Please try again.'),
    couponsApi: {
      live: vi.fn(async () => [{ code: 'HOLIDAY10' }]),
      check: vi.fn(async (i: { code: string; orderPaise: number }) => {
        if (i.code === 'OLD') throw new ApiClientError('Validation failed', 400, 'VALIDATION_ERROR', [{ path: 'body.promoCode', message: 'This coupon has expired' }]);
        return { code: i.code, description: '', discountPaise: Math.floor(i.orderPaise / 10) };
      }),
      redeem: vi.fn(async (i: { code: string; orderPaise: number }) => ({ code: i.code, description: '', discountPaise: Math.floor(i.orderPaise / 10) })),
    },
  };
});

import { answerHolidayCouponRequest, HOLIDAY_COUPON_REPLY, HOLIDAY_COUPON_REQUEST, parseHolidayCouponRequest } from './couponBridge';

const req = (over: Record<string, unknown>) => parseHolidayCouponRequest({ type: HOLIDAY_COUPON_REQUEST, id: 1, action: 'check', ...over });

describe('holiday coupon bridge', () => {
  it('ignores messages that are not well-formed holiday coupon requests', () => {
    expect(parseHolidayCouponRequest(null)).toBeNull();
    expect(parseHolidayCouponRequest({ type: 'other', id: 1, action: 'list' })).toBeNull();
    expect(parseHolidayCouponRequest({ type: HOLIDAY_COUPON_REQUEST, id: 'x', action: 'list' })).toBeNull();
    expect(parseHolidayCouponRequest({ type: HOLIDAY_COUPON_REQUEST, id: 1, action: 'delete' })).toBeNull();
  });

  it('cleans the code and the amount', () => {
    expect(req({ code: ' hol-iday10!! ', orderPaise: 1000.5 })).toMatchObject({ code: 'HOLIDAY10', orderPaise: undefined });
    expect(req({ code: 'x'.repeat(40), orderPaise: 100 })?.code).toHaveLength(20);
  });

  it('lists live holiday coupons for everyone, signed in or not', async () => {
    const r = await answerHolidayCouponRequest(req({ action: 'list' })!, false);
    expect(r).toMatchObject({ type: HOLIDAY_COUPON_REPLY, id: 1, ok: true, signedIn: false, data: [{ code: 'HOLIDAY10' }] });
  });

  it('asks a signed-out visitor to sign in before checking or using a coupon', async () => {
    const r = await answerHolidayCouponRequest(req({ code: 'HOLIDAY10', orderPaise: 2_000_000 })!, false);
    expect(r).toMatchObject({ ok: false, needsSignIn: true, message: 'Please sign in to use a coupon.' });
  });

  it('checks a coupon and returns the discount', async () => {
    const r = await answerHolidayCouponRequest(req({ code: 'HOLIDAY10', orderPaise: 2_000_000 })!, true);
    expect(r).toMatchObject({ ok: true, data: { code: 'HOLIDAY10', discountPaise: 200_000 } });
  });

  it('returns the real reason when the server refuses a coupon', async () => {
    const r = await answerHolidayCouponRequest(req({ code: 'OLD', orderPaise: 2_000_000 })!, true);
    expect(r).toMatchObject({ ok: false, refused: true, message: 'This coupon has expired' });
  });

  it('needs a booking reference to record a use', async () => {
    const bad = await answerHolidayCouponRequest(req({ action: 'redeem', code: 'HOLIDAY10', orderPaise: 2_000_000 })!, true);
    expect(bad).toMatchObject({ ok: false, refused: true });
    const good = await answerHolidayCouponRequest(req({ action: 'redeem', code: 'HOLIDAY10', orderPaise: 2_000_000, bookingRef: 'ZP-HOL-12345' })!, true);
    expect(good.ok).toBe(true);
  });
});
