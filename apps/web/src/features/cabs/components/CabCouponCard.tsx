import { cn } from '@zproo/ui';
import { Tag } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { loginPath } from '@/features/auth/redirect';
import { useAuthStore } from '@/features/auth/store';
import { couponCondition, couponErrorMessage, couponHeadline, couponsApi, useLiveCoupons } from '@/features/coupons/api';
import { ApiClientError } from '@/services/http';
import { COUPONS } from '../data';
import { calcFare, rupees, subtotalOf, validateCoupon } from '../fare';
import { useCabStore } from '../store';
import type { RouteEstimate, Vehicle } from '../types';
import { Card, focusRing } from './ui';

/**
 * "Offers & coupons" for a cab ride: coupons made in Admin → Marketing → Coupons that are valid on cabs
 * (or on every service) plus the built-in codes. Used on the ride details and payment pages.
 */
export function CabCouponCard({
  vehicle,
  route,
  discount,
  problem,
  idPrefix = 'cpn',
}: {
  vehicle: Vehicle;
  route: RouteEstimate;
  /** What the applied coupon takes off right now, in whole rupees. */
  discount: number;
  /** Why the applied admin coupon no longer works, when the server refuses it. */
  problem: string | null;
  idPrefix?: string;
}) {
  const couponCode = useCabStore((s) => s.draft.couponCode);
  const patch = useCabStore((s) => s.patch);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const [input, setInput] = useState(couponCode ?? '');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [showOffers, setShowOffers] = useState(false);
  const live = useLiveCoupons('CAB');

  const plain = calcFare(vehicle, route);
  const subtotal = subtotalOf(plain);
  const grossRupees = plain.total;
  const signIn = loginPath(location.pathname + location.search);

  function applyBuiltIn(code: string) {
    const r = validateCoupon(code, subtotal);
    if (!r.ok) {
      setError(r.reason);
      return;
    }
    patch({ couponCode: r.coupon.code, couponDiscount: null });
    setInput(r.coupon.code);
    setShowOffers(false);
  }

  async function applyAdmin(code: string) {
    if (!user) {
      setError('Please sign in to use this coupon.');
      return;
    }
    setApplying(true);
    try {
      const result = await couponsApi.check({ code, service: 'CAB', orderPaise: grossRupees * 100 });
      patch({ couponCode: result.code, couponDiscount: Math.floor(result.discountPaise / 100) });
      setInput(result.code);
      setShowOffers(false);
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 401) setError('Please sign in to use this coupon.');
      else setError(couponErrorMessage(e));
    } finally {
      setApplying(false);
    }
  }

  async function apply(raw: string) {
    const code = raw.trim().toUpperCase();
    setError('');
    if (!code) {
      setShowOffers((o) => !o);
      return;
    }
    if (COUPONS.some((c) => c.code === code)) applyBuiltIn(code);
    else await applyAdmin(code);
  }

  function remove() {
    patch({ couponCode: null, couponDiscount: null });
    setInput('');
    setError('');
  }

  const offers = live.data ?? [];
  const builtIns = COUPONS.filter((c) => !offers.some((o) => o.code === c.code));
  const inputId = `${idPrefix}-code`;

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Offers &amp; coupons</h2>
          <p className="text-xs text-muted">Enter a code or pick one of the offers available for cab rides.</p>
        </div>
        <button type="button" onClick={() => setShowOffers((o) => !o)} aria-expanded={showOffers} className={cn('inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold', focusRing)}>
          <Tag aria-hidden className="size-4" /> View offers
        </button>
      </div>
      <div className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">Coupon code</label>
        <input
          id={inputId}
          value={input}
          maxLength={20}
          onChange={(e) => { setInput(e.target.value.trim().toUpperCase().slice(0, 20)); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !couponCode) { e.preventDefault(); void apply(input); } }}
          placeholder="Enter coupon code"
          disabled={Boolean(couponCode)}
          className={cn('h-11 flex-1 rounded-lg border border-border bg-card px-3 uppercase', focusRing)}
        />
        {couponCode ? (
          <button type="button" onClick={remove} className={cn('rounded-lg border border-border px-4 text-sm font-semibold', focusRing)}>Remove</button>
        ) : (
          <button type="button" disabled={applying || !input.trim()} onClick={() => void apply(input)} className={cn('rounded-lg border border-primary px-4 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50', focusRing)}>
            {applying ? 'Checking…' : 'Apply'}
          </button>
        )}
      </div>

      {showOffers && !couponCode && (
        <ul aria-label="Available cab offers" className="mt-3 space-y-2">
          {live.isPending && <li className="text-xs text-muted">Loading offers…</li>}
          {!user && offers.length > 0 && (
            <li className="text-xs text-muted">
              <Link to={signIn} className="font-semibold text-primary underline">Sign in</Link> to use the offers below.
            </li>
          )}
          {offers.map((c) => {
            const eligible = grossRupees * 100 >= c.minOrderPaise;
            const cond = couponCondition(c);
            return (
              <li key={c.code} className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-primary/40 bg-primary-light px-3 py-2">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-bold tracking-wide text-primary">{c.code} <span className="font-sans text-xs font-semibold">· {couponHeadline(c)}</span></p>
                  <p className="text-xs text-muted">{c.description}{cond ? ` · ${cond}` : ''}</p>
                </div>
                <button type="button" disabled={!user || !eligible || applying} onClick={() => void apply(c.code)} className={cn('shrink-0 rounded-lg border border-primary px-3 py-1.5 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50', focusRing)}>Apply</button>
              </li>
            );
          })}
          {builtIns.map((c) => {
            const eligible = !c.minSubtotal || subtotal >= c.minSubtotal;
            return (
              <li key={c.code} className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-primary/40 bg-primary-light px-3 py-2">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-bold tracking-wide text-primary">{c.code}</p>
                  <p className="text-xs text-muted">{c.label}{!eligible ? ` · needs fare of ${rupees(c.minSubtotal!)}+` : ''}</p>
                </div>
                <button type="button" disabled={!eligible} onClick={() => void apply(c.code)} className={cn('shrink-0 rounded-lg border border-primary px-3 py-1.5 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50', focusRing)}>Apply</button>
              </li>
            );
          })}
        </ul>
      )}

      {couponCode && !problem && discount > 0 && (
        <p role="status" className="mt-2 text-sm text-success">✓ {couponCode} applied — you save {rupees(discount)}.</p>
      )}
      {problem && <p role="alert" className="mt-2 text-sm text-danger">✕ {problem} The total shown is without the coupon.</p>}
      {error && <p role="alert" className="mt-2 text-sm text-danger">✕ {error}</p>}
    </Card>
  );
}
