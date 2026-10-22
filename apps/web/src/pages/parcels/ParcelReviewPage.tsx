import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { RouteViz } from '@/features/parcels/components/Art';
import { ParcelCouponCard } from '@/features/parcels/components/CouponCard';
import { ChargesCard, ParcelShell, Stepper, useCharges } from '@/features/parcels/components/ui';
import { HANDLING, PARCEL_TYPES } from '@/features/parcels/data';
import { formatDay, inr } from '@/features/parcels/logic';
import { useParcelQuote, useParcelStore } from '@/features/parcels/store';

export default function ParcelReviewPage() {
  const { route: f, details: P, slot } = useParcelStore();
  const quote = useParcelQuote();
  const m = useCharges();
  const navigate = useNavigate();
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');
  if (!P.sn) return <Navigate to="/parcel/sender" replace />;
  if (!m || quote.status !== 'ok' || !quote.data) return <Navigate to="/parcel/details" replace />;

  const rows: [string, string][] = [
    ['Type', PARCEL_TYPES[P.type]!],
    ['Weight', `${f.w} kg (chargeable ${quote.data.cw} kg)`],
    ['Size', `${P.l} × ${P.wd} × ${P.hh} cm`],
    ['Description', P.d],
    ['Declared value', P.val ? inr(Number(P.val)) : 'Not declared'],
    ['Handling', HANDLING.filter((_, i) => P.h[i]).map((x) => x[0].split(' -')[0]).join(', ') || 'None'],
    ['Delivery', `${m.o.k} · ${m.o.days ? `by ${formatDay(Date.now() + m.o.days * 864e5)}` : 'today'}`],
    ['Pickup', slot.d ? `${formatDay(slot.d)} · ${slot.t}` : 'To be scheduled'],
  ];
  const next = () => { if (!ok) { setErr('Confirm to continue'); return; } navigate('/parcel/payment'); };

  return (
    <ParcelShell>
      <Seo title="Review your parcel" noIndex />
      <div className="wrap">
        <Stepper index={2} />
        <div className="lay">
          <div>
            <div className="c">
              <div className="row"><h2>Route</h2><Link to="/parcel/sender" className="btn t sm" style={{ color: 'var(--b)' }}>Edit</Link></div>
              <RouteViz />
              <div className="g g2">
                <div><span className="tag">PICKUP</span><br /><b>{f.from} {P.sp}</b><br />{P.sn} · +91 {P.sm}<br /><span className="mu">{P.sa}</span></div>
                <div><span className="tag">DELIVERY</span><br /><b>{f.to} {P.rp}</b><br />{P.rn} · +91 {P.rm}<br /><span className="mu">{P.ra}</span></div>
              </div>
            </div>
            <div className="c">
              <div className="row"><h2>Parcel</h2><Link to="/parcel/details" className="btn t sm" style={{ color: 'var(--b)' }}>Edit</Link></div>
              {rows.map((x) => (
                <div className="row" key={x[0]} style={{ padding: '3px 0' }}><span className="mu">{x[0]}</span><b style={{ textAlign: 'right' }}>{x[1]}</b></div>
              ))}
            </div>
            <ParcelCouponCard idPrefix="pcl-review-cpn" />
            <label className="c" style={{ display: 'block' }}>
              <input type="checkbox" id="tc" checked={ok} onChange={(e) => { setOk(e.target.checked); setErr(''); }} style={{ width: 'auto', marginRight: 8 }} aria-describedby="e_tc" />
              I confirm the parcel has no prohibited items.
              <small className="er" id="e_tc" role={err ? 'alert' : undefined}>{err}</small>
            </label>
          </div>
          <ChargesCard label="Continue to pay" action={next} />
        </div>
      </div>
    </ParcelShell>
  );
}
