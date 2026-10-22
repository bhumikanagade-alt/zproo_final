import type { CouponCheck, PublicCoupon, ServiceType } from '@zproo/types';
import { useQuery } from '@tanstack/react-query';
import { ApiClientError, apiGet, apiPost } from '@/services/http';

export const couponKeys = {
  live: (service?: ServiceType) => ['coupons', 'public', service ?? 'ALL'] as const,
  check: (code: string, service: ServiceType, orderPaise: number) => ['coupons', 'check', code, service, orderPaise] as const,
};

/** Coupons created in the admin panel (Marketing → Coupons) that can be used right now. */
export function useLiveCoupons(service?: ServiceType) {
  return useQuery({
    queryKey: couponKeys.live(service),
    queryFn: () => apiGet<PublicCoupon[]>('/coupons/public', { params: service ? { service } : undefined }),
    staleTime: 30_000,
    retry: false,
  });
}

export const couponsApi = {
  /** Coupons made in the admin panel that are live right now for one service. */
  live: (service?: ServiceType) => apiGet<PublicCoupon[]>('/coupons/public', { params: service ? { service } : undefined }),
  /** The server checks the code, dates, service, minimum order and usage limits and returns the discount. */
  check: (input: { code: string; service: ServiceType; orderPaise: number }) => apiPost<CouponCheck>('/coupons/validate', input),
  /** Hotel stays finish in the browser: tell the server the coupon was used (counts once per booking reference). */
  redeem: (input: { code: string; service: ServiceType; orderPaise: number; bookingRef: string }) => apiPost<CouponCheck>('/coupons/redeem', input),
  /** Gives back a use recorded with `redeem` (the payment failed, or the booking was cancelled). Safe to call twice. */
  release: (input: { code: string; bookingRef: string }) => apiPost<{ released: boolean }>('/coupons/release', input),
};

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** "10% off (max ₹100)" / "₹150 off" */
export function couponHeadline(c: Pick<PublicCoupon, 'discountType' | 'value' | 'maxDiscountPaise'>): string {
  return c.discountType === 'PERCENT'
    ? `${c.value}% off${c.maxDiscountPaise ? ` (max ${rupees(c.maxDiscountPaise)})` : ''}`
    : `${rupees(c.value)} off`;
}

/** "On orders over ₹999" or empty text. */
export function couponCondition(c: Pick<PublicCoupon, 'minOrderPaise'>): string {
  return c.minOrderPaise > 0 ? `On orders over ${rupees(c.minOrderPaise)}` : '';
}

/** The reason a coupon was refused ("This coupon has expired"), not the generic "Validation failed". */
export function couponErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.details[0]?.message ?? error.message;
  return 'Could not check this coupon. Please try again.';
}
