import { useQuery } from '@tanstack/react-query';
import { couponErrorMessage, couponKeys, couponsApi } from '@/features/coupons/api';
import { ApiClientError } from '@/services/http';
import { useFlightDraft } from './draft';

/**
 * The coupon applied to this flight booking, checked by the server against the CURRENT total
 * (fare + taxes + any seats, meals and baggage). A coupon that has since expired, been switched off
 * or used up stops applying and says why. If the server cannot be reached, the amount it gave
 * earlier is kept (it is checked again when booking).
 */
export function useFlightCoupon(grossPaise: number): {
  promoCode: string | null;
  discountPaise: number;
  problem: string | null;
  checking: boolean;
} {
  const code = useFlightDraft((s) => s.promoCode);
  const stored = useFlightDraft((s) => s.promoDiscountPaise ?? 0);
  const check = useQuery({
    queryKey: couponKeys.check(code ?? '', 'FLIGHT', grossPaise),
    queryFn: () => couponsApi.check({ code: code as string, service: 'FLIGHT', orderPaise: grossPaise }),
    enabled: code !== null && grossPaise > 0,
    retry: false,
    staleTime: 15_000,
  });
  if (!code) return { promoCode: null, discountPaise: 0, problem: null, checking: false };
  if (check.isError && check.error instanceof ApiClientError && check.error.status === 400) {
    return { promoCode: null, discountPaise: 0, problem: couponErrorMessage(check.error), checking: false };
  }
  const discountPaise = Math.min(check.data ? check.data.discountPaise : stored, grossPaise);
  return { promoCode: code, discountPaise, problem: null, checking: check.isFetching };
}
