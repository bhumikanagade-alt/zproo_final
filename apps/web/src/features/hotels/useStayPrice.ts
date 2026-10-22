import { useQuery } from '@tanstack/react-query';
import { couponErrorMessage, couponKeys, couponsApi } from '@/features/coupons/api';
import { ApiClientError } from '@/services/http';
import { couponSelection, type CouponSelection } from './pricing';
import { useHotelBooking } from './store';

/**
 * The coupon to price this stay with.
 *
 * - Built-in codes (ZPROO10, STAY15) are plain text and priced locally.
 * - Coupons made in the admin panel are checked by the server against the CURRENT room price, so a coupon
 *   that has since expired, been switched off, or been used up stops applying, and the reason is shown.
 *   If the server cannot be reached the amount it gave earlier is kept (it is checked again when paying).
 */
export function useStayCoupon(roomSubtotalPaise: number): { selection: CouponSelection; problem: string | null; checking: boolean } {
  const coupon = useHotelBooking((s) => s.coupon);
  const stored = useHotelBooking((s) => s.couponDiscountPaise ?? null);
  const fromServer = coupon !== null && stored !== null;

  const check = useQuery({
    queryKey: couponKeys.check(coupon ?? '', 'HOTEL', roomSubtotalPaise),
    queryFn: () => couponsApi.check({ code: coupon as string, service: 'HOTEL', orderPaise: roomSubtotalPaise }),
    enabled: fromServer && roomSubtotalPaise > 0,
    retry: false,
    staleTime: 15_000,
  });

  const refused = check.isError && check.error instanceof ApiClientError && check.error.status === 400;
  if (!coupon) return { selection: null, problem: null, checking: false };
  if (!fromServer) return { selection: coupon, problem: null, checking: false };
  if (refused) return { selection: null, problem: couponErrorMessage(check.error), checking: false };
  return {
    selection: couponSelection(coupon, check.data ? check.data.discountPaise : stored),
    problem: null,
    checking: check.isFetching,
  };
}
