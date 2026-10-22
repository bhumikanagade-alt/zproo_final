import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router';
import { create } from 'zustand';
import '../parcels.css';
import { PARCEL_TYPES, TRACK_STEPS } from '../data';
import { computeCharges, formatDay, inr, type Charges, type ParcelBooking } from '../logic';
import { useParcelQuote, useParcelStore } from '../store';
import { TruckMark } from './Art';
import { Icon } from './Icon';
import { useCountUp, useReducedMotion } from './motion';

// ───────────────────────────── Toast ─────────────────────────────

interface ToastState { msg: string; on: boolean; show: (m: string) => void }
let toastTimer: ReturnType<typeof setTimeout> | undefined;
const useToastStore = create<ToastState>()((set) => ({
  msg: '',
  on: false,
  show: (msg) => {
    clearTimeout(toastTimer);
    set({ msg, on: true });
    toastTimer = setTimeout(() => set({ on: false }), 2400);
  },
}));
export const toast = (m: string) => useToastStore.getState().show(m);

function ToastHost() {
  const { msg, on } = useToastStore();
  return <div id="pcl-toast" className={on ? 'on' : ''} role="status" aria-live="polite">{msg}</div>;
}

// ───────────────────────────── Shell ─────────────────────────────

/** Wraps every parcel page: scopes the styles (`.pcl`) and adds the toast. */
export function ParcelShell({ children }: { children: ReactNode }) {
  return (
    <div className="pcl">
      <div className="pcl-page">{children}</div>
      <ToastHost />
    </div>
  );
}

export function PageNote() {
  return (
    <div className="wrap">
      <div className="mu" style={{ textAlign: 'center' }}>
        All charges shown are sample values until the rate service is connected.
      </div>
    </div>
  );
}

// ───────────────────────────── Form fields ─────────────────────────────

type FieldProps = { id: string; label: string; error?: string; hint?: string; prefix?: string } & InputHTMLAttributes<HTMLInputElement>;

export function Field({ id, label, error, hint, prefix, ...input }: FieldProps) {
  const control = (
    <input id={id} aria-invalid={!!error} aria-describedby={`e_${id}`} className={`${error ? 'bad' : ''}${prefix ? ' hasp' : ''}`} {...input} />
  );
  return (
    <label className="lb">
      {label}
      {prefix ? <div className="pfxw"><span className="pfx" aria-hidden="true">{prefix}</span>{control}</div> : control}
      <small className="er" id={`e_${id}`} role={error ? 'alert' : undefined} style={!error && hint ? { color: 'var(--ok)' } : undefined}>
        {error || hint || ''}
      </small>
    </label>
  );
}

export function Select({ id, label, options, value, onChange }: {
  id: string; label: string; options: readonly string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <label className="lb">
      {label}
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

/** Focus the first field (in DOM order given by `order`) that has an error. */
export function focusFirstError(errors: Record<string, string>, order: string[]) {
  const id = order.find((k) => errors[k]);
  if (id) document.getElementById(id)?.focus();
}

// ───────────────────────────── Stepper ─────────────────────────────

const STEPS = ['Sender & receiver', 'Parcel details', 'Summary', 'Payment', 'Confirmed'];

export function Stepper({ index }: { index: number }) {
  return (
    <nav className="stp2" aria-label="Progress">
      <div className="pb" style={{ ['--w' as string]: `${(index * 100) / 4}%` }}><i /></div>
      <div className="pls">
        {STEPS.map((x, j) => (
          <span key={x} className={j < index ? 'dn' : j === index ? 'on' : ''} aria-current={j === index ? 'step' : undefined}>
            <b>{j < index ? '✓' : j + 1}</b>
            <em>{x}</em>
          </span>
        ))}
      </div>
    </nav>
  );
}

// ───────────────────────────── Delivery options ─────────────────────────────

export function DeliveryOptions() {
  const { status, data, error } = useParcelQuote();
  const { svc, setSvc, route } = useParcelStore();
  if (status === 'loading' || status === 'idle') {
    return <div aria-busy="true"><div className="sk" /><div className="sk" /><div className="sk" /></div>;
  }
  if (status === 'err') {
    return (
      <>
        <div className="wn" role="alert">Could not load delivery rates: {error}. Your details are safe.</div>
        <button type="button" className="btn o sm" style={{ marginTop: 8 }} onClick={() => useParcelQuote.getState().retry()}>Retry</button>
      </>
    );
  }
  if (!data) return null;
  const chosen = data.opts.find((o) => o.k === svc && !o.off) ?? data.opts.find((o) => !o.off);
  const cheapest = Math.min(...data.opts.filter((o) => !o.off).map((o) => o.price));
  return (
    <>
      <div className="mu">Chargeable weight {data.cw} kg (actual {route.w} kg, volumetric {data.vol} kg)</div>
      {data.opts.map((o) => (
        <button
          type="button"
          key={o.k}
          className={`oc ${chosen?.k === o.k ? 'on' : ''}`}
          disabled={o.off}
          aria-pressed={chosen?.k === o.k}
          onClick={() => setSvc(o.k)}
        >
          <Icon name={o.k === 'Standard' ? 'truck' : o.k === 'Express' ? 'bolt' : 'clock'} />
          <span style={{ flex: 1 }}>
            <b>{o.k}</b>
            {o.k === 'Express' ? <span className="bdg">Fastest</span> : o.price === cheapest ? <span className="bdg">Best value</span> : null}
            <br />
            <span className="mu">
              {o.off
                ? 'Only when pickup and delivery are in the same city'
                : `${o.desc} · ${o.days ? `by ${formatDay(Date.now() + o.days * 864e5)} (${o.days} ${o.days > 1 ? 'days' : 'day'})` : 'today if booked before 4 PM'}`}
            </span>
          </span>
          <b style={{ fontSize: 18 }}>{inr(o.price)}</b>
        </button>
      ))}
    </>
  );
}

// ───────────────────────────── Charges card ─────────────────────────────

export function useCharges(): Charges | null {
  const { data } = useParcelQuote();
  const { svc, details, coupon } = useParcelStore();
  return computeCharges(data, svc, details, coupon);
}

export function ChargesCard({ action, label, disabled }: { action: () => void; label: ReactNode; disabled?: boolean }) {
  const { route, details } = useParcelStore();
  const { status } = useParcelQuote();
  const m = useCharges();
  const total = useCountUp(m ? m.tot : null);
  return (
    <aside className="c sticky" id="sum" aria-label="Charges">
      <b>{route.from} → {route.to}</b>
      <div className="mu">{PARCEL_TYPES[details.type]} · {route.w} kg · {details.l}×{details.wd}×{details.hh} cm</div>
      <hr style={{ border: 0, borderTop: '1px solid var(--bd)' }} />
      <h3 style={{ fontSize: 18, marginBottom: 6 }}>Charges</h3>
      {m ? (
        <>
          <div className="row"><span className="mu">{m.o.k} delivery</span>{inr(m.o.price)}</div>
          {m.h.map((f) => <div className="row" key={f[0]}><span className="mu">{f[0]}</span>{inr(f[1])}</div>)}
          <div className="row"><span className="mu">GST (18%)</span>{inr(m.gst)}</div>
          {/* A coupon from the admin panel is applied in the "Offers & coupons" card (review and payment steps); here it only shows as a deduction. */}
          {m.coupon && m.d > 0 && (
            <div className="row">
              <span className="mu">Coupon {m.coupon}</span>
              <span style={{ color: 'var(--ok)' }}>-{inr(m.d)}</span>
            </div>
          )}
          <div className="row"><b>Total</b><span className="pr" aria-live="polite">{inr(total ?? m.tot)}</span></div>
          <span className="tag">SAMPLE VALUES</span>
        </>
      ) : (
        <div className="mu" style={{ padding: '8px 0' }}>{status === 'err' ? 'Rates unavailable. Retry to see charges.' : 'Fetching rates…'}</div>
      )}
      <button type="button" className="btn" style={{ width: '100%', marginTop: 10 }} disabled={!m || disabled} onClick={action}>{label}</button>
    </aside>
  );
}

// ───────────────────────────── Tracking ─────────────────────────────

export function TrackBar({ b }: { b: ParcelBooking }) {
  return (
    <div className="trk">
      <div className="trl">
        <i style={{ width: `${b.prog * 25}%` }} />
        <span className="trt" style={{ left: `${b.prog * 25}%` }}><TruckMark /></span>
      </div>
      <div className="trs">
        {TRACK_STEPS.map((x, i) => <span key={x} className={i <= b.prog ? 'd' : ''}>{x}</span>)}
      </div>
    </div>
  );
}

export function StatusTag({ b }: { b: ParcelBooking }) {
  return <span className={`tag ${b.st !== 'Cancelled' ? 'gr' : ''}`}>{b.st === 'Booked' ? TRACK_STEPS[b.prog] : b.st}</span>;
}

// ───────────────────────────── Confetti ─────────────────────────────

export function Confetti() {
  const rm = useReducedMotion();
  const [pieces] = useState(() => {
    const wide = typeof innerWidth !== 'undefined' && innerWidth > 700;
    return Array.from({ length: 46 }, (_, i) => ({
      left: 46 + (Math.random() - 0.5) * 14,
      x: (Math.random() - 0.5) * (wide ? 1000 : 420),
      y: -180 - Math.random() * 320,
      r: Math.random() * 720,
      bg: ['#e31118', '#ff6b6b', '#f5a300', '#fff', '#16813d'][i % 5]!,
      delay: Math.random() * 0.25,
    }));
  });
  const [gone, setGone] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGone(true), 2800); return () => clearTimeout(t); }, []);
  if (rm || gone) return null;
  return (
    <div className="cf" aria-hidden="true">
      {pieces.map((p, i) => (
        <i key={i} style={{ left: `${p.left}%`, ['--x' as string]: `${p.x}px`, ['--y' as string]: `${p.y}px`, ['--r' as string]: `${p.r}deg`, background: p.bg, animationDelay: `${p.delay}s` }} />
      ))}
    </div>
  );
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link to={to} className="btn o">{children}</Link>;
}
