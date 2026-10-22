import { useQuery } from '@tanstack/react-query';
import { couponErrorMessage, couponKeys, couponsApi } from '@/features/coupons/api';
import { ApiClientError } from '@/services/http';
import { useTrainDraft } from './draft';

/**
 * The coupon applied to this train fare, checked by the server against the CURRENT fare.
 * A coupon that has since expired, been switched off or used up stops applying and says why.
 * If the server cannot be reached, the amount it gave earlier is kept (it is checked again when booking).
 */
export function useTrainCoupon(grossPaise: number): {
  promoCode: string | null;
  discountPaise: number;
  problem: string | null;
  checking: boolean;
} {
  const code = useTrainDraft((s) => s.promoCode);
  const stored = useTrainDraft((s) => s.promoDiscountPaise ?? 0);
  const check = useQuery({
    queryKey: couponKeys.check(code ?? '', 'TRAIN', grossPaise),
    queryFn: () => couponsApi.check({ code: code as string, service: 'TRAIN', orderPaise: grossPaise }),
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
