import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { couponErrorMessage, couponKeys, couponsApi } from '@/features/coupons/api';
import { ApiClientError } from '@/services/http';
import { computeCharges, type ParcelCoupon } from './logic';
import { useParcelQuote, useParcelStore } from './store';

/**
 * The coupon applied to this parcel (Admin → Marketing → Coupons, "Valid on" = Parcels or all services),
 * checked by the server against the CURRENT gross amount (delivery + handling + GST).
 *
 * A coupon that has since expired, been switched off, used up, or no longer meets its minimum order (the weight,
 * service or handling changed) is dropped and the reason is returned in `problem`. If the server cannot be reached the
 * amount it gave earlier is kept (it is checked again when paying).
 */
export function useParcelCoupon(): { coupon: ParcelCoupon | null; problem: string | null; checking: boolean } {
  const stored = useParcelStore((s) => s.coupon);
  const setCoupon = useParcelStore((s) => s.setCoupon);
  const svc = useParcelStore((s) => s.svc);
  const details = useParcelStore((s) => s.details);
  const quote = useParcelQuote((s) => s.data);
  const gross = computeCharges(quote, svc, details, null)?.gross ?? 0;
  const code = stored?.code ?? null;
  const [problem, setProblem] = useState<string | null>(null);

  const check = useQuery({
    queryKey: couponKeys.check(code ?? '', 'PARCEL', gross * 100),
    queryFn: () => couponsApi.check({ code: code as string, service: 'PARCEL', orderPaise: gross * 100 }),
    enabled: code !== null && gross > 0,
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
      // The parcel changed (weight, service, handling): keep the stored amount in step so the booking carries the right one.
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
