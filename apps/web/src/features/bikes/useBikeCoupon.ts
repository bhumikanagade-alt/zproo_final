import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { couponErrorMessage, couponKeys, couponsApi } from '@/features/coupons/api';
import { ApiClientError } from '@/services/http';
import { useBikeStore } from './store';

/**
 * The coupon applied to this bike rental (Admin → Marketing → Coupons, "Valid on" = Bikes or all services),
 * checked by the server against the CURRENT rental total (rental + add-ons + fees + GST, deposit excluded).
 *
 * A coupon that has since expired, been switched off, used up, or no longer meets its minimum order (the dates,
 * bike or add-ons changed) is dropped and the reason is returned in `problem`. If the server cannot be reached the
 * amount it gave earlier is kept (it is checked again when booking).
 */
export function useBikeCoupon(grossTotal: number): { coupon: { code: string; discount: number } | null; problem: string | null; checking: boolean } {
  const stored = useBikeStore((s) => s.coupon);
  const setCoupon = useBikeStore((s) => s.setCoupon);
  const code = stored?.code ?? null;
  const [problem, setProblem] = useState<string | null>(null);

  const check = useQuery({
    queryKey: couponKeys.check(code ?? '', 'BIKE', grossTotal * 100),
    queryFn: () => couponsApi.check({ code: code as string, service: 'BIKE', orderPaise: grossTotal * 100 }),
    enabled: code !== null && grossTotal > 0,
    retry: false,
    staleTime: 15_000,
  });

  const refused = code !== null && check.isError && check.error instanceof ApiClientError && check.error.status === 400;
  const serverDiscount = check.data ? Math.floor(check.data.discountPaise / 100) : null;

  useEffect(() => {
    if (refused) {
      setProblem(couponErrorMessage(check.error));
      setCoupon(null);
    } else if (stored && serverDiscount !== null && serverDiscount !== stored.discount) {
      // The rental changed (dates, add-ons): keep the stored amount in step so the booking carries the right one.
      setCoupon({ code: stored.code, discount: serverDiscount });
    }
  }, [refused, check.error, stored, serverDiscount, setCoupon]);

  useEffect(() => {
    if (code) setProblem(null);
  }, [code]);

  const storedCode = stored?.code ?? null;
  const discount = serverDiscount ?? stored?.discount ?? 0;
  // One stable object per (code, amount), so price calculations that depend on it are not redone on every render.
  const applied = useMemo(() => (storedCode && !refused ? { code: storedCode, discount } : null), [storedCode, refused, discount]);
  return { coupon: applied, problem, checking: Boolean(applied) && check.isFetching };
}
