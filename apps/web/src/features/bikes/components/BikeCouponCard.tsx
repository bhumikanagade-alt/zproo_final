import { Button, cn } from '@zproo/ui';
import { Tag } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { loginPath } from '@/features/auth/redirect';
import { useAuthStore } from '@/features/auth/store';
import { couponCondition, couponErrorMessage, couponHeadline, couponsApi, useLiveCoupons } from '@/features/coupons/api';
import { ApiClientError } from '@/services/http';
import { rupees } from '../pricing';
import { useBikeStore } from '../store';
import { Card, focusRing } from './ui';

/**
 * "Offers & coupons" for a bike rental: coupons made in Admin → Marketing → Coupons that are valid on bikes
 * (or on every service). Used on the review and payment pages.
 */
export function BikeCouponCard({
  grossTotal,
  discount,
  problem,
  idPrefix = 'bike-cpn',
}: {
  /** The rental total before any coupon, in whole rupees (deposit excluded). */
  grossTotal: number;
  /** What the applied coupon takes off right now, in whole rupees. */
  discount: number;
  /** Why the applied coupon no longer works, when the server refuses it. */
  problem: string | null;
  idPrefix?: string;
}) {
  const coupon = useBikeStore((s) => s.coupon);
  const setCoupon = useBikeStore((s) => s.setCoupon);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const [input, setInput] = useState(coupon?.code ?? '');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [showOffers, setShowOffers] = useState(false);
  const live = useLiveCoupons('BIKE');
  const offers = live.data ?? [];
  const signIn = loginPath(location.pathname + location.search);
  const inputId = `${idPrefix}-code`;

  async function apply(raw: string) {
    const code = raw.trim().toUpperCase();
    setError('');
    if (!code) {
      setShowOffers((o) => !o);
      return;
    }
    if (!user) {
      setError('Please sign in to use a coupon.');
      return;
    }
    setApplying(true);
    try {
      const result = await couponsApi.check({ code, service: 'BIKE', orderPaise: grossTotal * 100 });
      setCoupon({ code: result.code, discount: Math.floor(result.discountPaise / 100) });
      setInput(result.code);
      setShowOffers(false);
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 401) setError('Please sign in to use a coupon.');
      else setError(couponErrorMessage(e));
    } finally {
      setApplying(false);
    }
  }

  function remove() {
    setCoupon(null);
    setInput('');
    setError('');
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">Offers &amp; coupons</h2>
          <p className="text-xs text-muted">Enter a code or pick one of the offers available for bike rentals.</p>
        </div>
        <Button type="button" variant="outline" size="sm" aria-expanded={showOffers} onClick={() => setShowOffers((o) => !o)}>
          <Tag aria-hidden /> View offers
        </Button>
      </div>

      <div className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">Coupon code</label>
        <input
          id={inputId}
          value={input}
          maxLength={20}
          disabled={Boolean(coupon)}
          onChange={(e) => { setInput(e.target.value.trim().toUpperCase().slice(0, 20)); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !coupon) { e.preventDefault(); void apply(input); } }}
          placeholder="Enter coupon code"
          className={cn('h-11 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 uppercase', focusRing)}
        />
        {coupon ? (
          <Button type="button" variant="outline" onClick={remove}>Remove</Button>
        ) : (
          <Button type="button" disabled={applying || !input.trim()} onClick={() => void apply(input)}>{applying ? 'Checking…' : 'Apply'}</Button>
        )}
      </div>

      {showOffers && !coupon && (
        <ul aria-label="Available bike offers" className="space-y-2">
          {live.isPending && <li className="text-xs text-muted">Loading offers…</li>}
          {!live.isPending && offers.length === 0 && <li className="text-xs text-muted">There are no bike offers right now.</li>}
          {!user && offers.length > 0 && (
            <li className="text-xs text-muted"><Link to={signIn} className="font-semibold text-primary underline">Sign in</Link> to use these offers.</li>
          )}
          {offers.map((c) => {
            const eligible = grossTotal * 100 >= c.minOrderPaise;
            const cond = couponCondition(c);
            return (
              <li key={c.code} className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-primary/40 bg-primary-light px-3 py-2">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-bold tracking-wide text-primary">{c.code} <span className="font-sans text-xs font-semibold">· {couponHeadline(c)}</span></p>
                  <p className="text-xs text-muted">{c.description}{cond ? ` · ${cond}` : ''}</p>
                </div>
                <Button type="button" variant="outline" size="sm" disabled={!user || !eligible || applying} onClick={() => void apply(c.code)}>Apply</Button>
              </li>
            );
          })}
        </ul>
      )}

      {coupon && !problem && discount > 0 && <p role="status" className="text-sm font-semibold text-success">✓ {coupon.code} applied — you save {rupees(discount)}.</p>}
      {problem && <p role="alert" className="text-sm font-semibold text-danger">✕ {problem} The total shown is without the coupon.</p>}
      {error && <p role="alert" className="text-sm font-semibold text-danger">✕ {error}</p>}
    </Card>
  );
}
