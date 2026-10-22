import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { couponErrorMessage, couponKeys, couponsApi } from '@/features/coupons/api';
import { ApiClientError } from '@/services/http';
import { calcFare, getVehicle, routeFor } from './fare';
import { useCabStore } from './store';

/**
 * The admin-panel coupon (Admin → Marketing → Coupons, "Valid on" = Cabs or all services) applied to this ride.
 *
 * - Built-in codes (ZPROO10, CAB50…) are plain text and priced locally by `calcFare`; this hook does nothing for them.
 * - An admin coupon is checked by the server against the CURRENT fare, so one that has since expired, been
 *   switched off or used up is dropped and the reason is returned in `problem`. If the server cannot be reached
 *   the amount it gave earlier is kept (it is checked again when paying).
 *
 * Returns the discount in whole rupees to pass to `calcFare` (null when there is no admin coupon).
 */
export function useCabCoupon(): { adminDiscount: number | null; problem: string | null; checking: boolean } {
  const draft = useCabStore((s) => s.draft);
  const patch = useCabStore((s) => s.patch);
  const code = draft.couponCode;
  const stored = draft.couponDiscount ?? null;
  const isAdmin = code !== null && stored !== null;
  const gross = draft.vehicleId ? calcFare(getVehicle(draft.vehicleId), routeFor(draft)).total : 0;
  const [problem, setProblem] = useState<string | null>(null);

  const check = useQuery({
    queryKey: couponKeys.check(code ?? '', 'CAB', gross * 100),
    queryFn: () => couponsApi.check({ code: code as string, service: 'CAB', orderPaise: gross * 100 }),
    enabled: isAdmin && gross > 0,
    retry: false,
    staleTime: 15_000,
  });

  const refused = isAdmin && check.isError && check.error instanceof ApiClientError && check.error.status === 400;
  const serverDiscount = check.data ? Math.floor(check.data.discountPaise / 100) : null;

  useEffect(() => {
    if (refused) {
      setProblem(couponErrorMessage(check.error));
      patch({ couponCode: null, couponDiscount: null });
    } else if (isAdmin && serverDiscount !== null && serverDiscount !== stored) {
      // The fare changed (round trip, different date…): keep the stored amount in step so the booking carries it.
      patch({ couponDiscount: serverDiscount });
    }
  }, [refused, check.error, isAdmin, serverDiscount, stored, patch]);

  useEffect(() => {
    if (code) setProblem(null);
  }, [code]);

  if (!isAdmin || refused) return { adminDiscount: null, problem, checking: false };
  return { adminDiscount: serverDiscount ?? stored, problem, checking: check.isFetching };
}
