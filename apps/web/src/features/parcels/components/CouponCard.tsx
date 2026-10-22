import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { loginPath } from '@/features/auth/redirect';
import { useAuthStore } from '@/features/auth/store';
import { couponCondition, couponErrorMessage, couponHeadline, couponsApi, useLiveCoupons } from '@/features/coupons/api';
import { ApiClientError } from '@/services/http';
import { inr } from '../logic';
import { useParcelCoupon } from '../useParcelCoupon';
import { useParcelStore } from '../store';
import { useCharges } from './ui';

/**
 * "Offers & coupons" for a parcel: coupons made in Admin → Marketing → Coupons that are valid on parcels
 * (or on every service). Shown on the review and payment steps; a coupon applied on one stays applied on the other.
 */
export function ParcelCouponCard({ idPrefix = 'pcl-cpn' }: { idPrefix?: string }) {
  const m = useCharges();
  const stored = useParcelStore((s) => s.coupon);
  const setCoupon = useParcelStore((s) => s.setCoupon);
  const { coupon, problem } = useParcelCoupon();
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const [input, setInput] = useState(stored?.code ?? '');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [showOffers, setShowOffers] = useState(false);
  const live = useLiveCoupons('PARCEL');
  const offers = live.data ?? [];
  const gross = m?.gross ?? 0;
  const signIn = loginPath(location.pathname + location.search);
  const inputId = `${idPrefix}-code`;

  async function apply(raw: string) {
    const code = raw.trim().toUpperCase();
    setError('');
    if (!code) { setShowOffers((o) => !o); return; }
    if (!user) { setError('Please sign in to use a coupon.'); return; }
    if (gross <= 0) { setError('Charges are still loading. Try again in a moment.'); return; }
    setApplying(true);
    try {
      const result = await couponsApi.check({ code, service: 'PARCEL', orderPaise: gross * 100 });
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
    <section className="c" aria-label="Offers and coupons">
      <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h2 style={{ marginBottom: 2 }}>Offers &amp; coupons</h2>
          <div className="mu">Enter a code or pick one of the offers available for parcels.</div>
        </div>
        <button type="button" className="btn o sm" aria-expanded={showOffers} onClick={() => setShowOffers((o) => !o)}>View offers</button>
      </div>

      <div className="row" style={{ gap: 8, margin: '10px 0 0' }}>
        <label htmlFor={inputId} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Coupon code</label>
        <input
          id={inputId}
          value={input}
          maxLength={20}
          disabled={Boolean(stored)}
          autoComplete="off"
          placeholder="Enter coupon code"
          style={{ margin: 0, textTransform: 'uppercase' }}
          onChange={(e) => { setInput(e.target.value.trim().toUpperCase().slice(0, 20)); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !stored) { e.preventDefault(); void apply(input); } }}
        />
        {stored ? (
          <button type="button" className="btn o" onClick={remove}>Remove</button>
        ) : (
          <button type="button" className="btn" disabled={applying || !input.trim()} onClick={() => void apply(input)}>{applying ? 'Checking…' : 'Apply'}</button>
        )}
      </div>

      {showOffers && !stored && (
        <ul aria-label="Available parcel offers" style={{ listStyle: 'none', margin: '10px 0 0', padding: 0 }}>
          {live.isPending && <li className="mu">Loading offers…</li>}
          {!live.isPending && offers.length === 0 && <li className="mu">There are no parcel offers right now.</li>}
          {!user && offers.length > 0 && <li className="mu" style={{ marginBottom: 6 }}><Link to={signIn} className="linkbtn">Sign in</Link> to use these offers.</li>}
          {offers.map((c) => {
            const eligible = gross * 100 >= c.minOrderPaise;
            const cond = couponCondition(c);
            const short = Math.ceil((c.minOrderPaise - gross * 100) / 100);
            return (
              <li key={c.code} className="row" style={{ gap: 10, border: '1px dashed var(--b)', borderRadius: 10, padding: '8px 12px', margin: '6px 0', background: 'var(--bl)' }}>
                <div style={{ minWidth: 0 }}>
                  <b style={{ letterSpacing: '.04em' }}>{c.code}</b> <span className="mu">· {couponHeadline(c)}</span>
                  <div className="mu">{c.description}{cond ? ` · ${cond}` : ''}{!eligible && short > 0 ? ` · Add ${inr(short)} more to use this` : ''}</div>
                </div>
                <button type="button" className="btn o sm" disabled={!user || !eligible || applying} onClick={() => void apply(c.code)}>Apply</button>
              </li>
            );
          })}
        </ul>
      )}

      {stored && coupon && !problem && m && m.d > 0 && <div role="status" className="ok" style={{ marginTop: 10 }}>✓ {coupon.code} applied. You save {inr(m.d)}.</div>}
      {problem && <div role="alert" className="wn" style={{ marginTop: 10 }}>✕ {problem} The total shown is without the coupon.</div>}
      {error && <div role="alert" className="wn" style={{ marginTop: 10 }}>✕ {error}</div>}
    </section>
  );
}
