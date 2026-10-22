import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { Icon } from '@/features/parcels/components/Icon';
import { useReveal, useReducedMotion } from '@/features/parcels/components/motion';
import { PageNote, ParcelShell, Select } from '@/features/parcels/components/ui';
import { CITIES, POPULAR_ROUTES, TRUST } from '@/features/parcels/data';
import { cityFromPin, estimateFrom, inr, isPin } from '@/features/parcels/logic';
import { useParcelStore } from '@/features/parcels/store';

const HOW = [
  ['edit', 'Add details', 'Sender, receiver and what you are sending'],
  ['truck', 'Choose a speed', 'Standard, Express or Same-day pickup and delivery'],
  ['wallet', 'Pay securely', 'UPI, card, wallet, net banking or pay later'],
  ['pin', 'Track it live', 'Follow your parcel until the OTP delivery'],
] as const;

const clampWeight = (n: number) => Math.max(0.5, Math.min(50, +n.toFixed(1)));

export default function ParcelsPage() {
  const { route, setRoute, swapRoute, patchDetails, begin } = useParcelStore();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const rm = useReducedMotion();
  const [weightErr, setWeightErr] = useState('');
  const [weight, setWeight] = useState(route.w);
  const cardRef = useRef<HTMLDivElement>(null);
  useReveal();

  // Prefill from the home-page parcel widget (?from=411001&to=400001&weight=2). Accepts PIN codes or city names.
  useEffect(() => {
    const f = params.get('from'), t = params.get('to'), w = params.get('weight');
    if (!f && !t && !w) return;
    const city = (v: string | null) => (v ? (CITIES.find((c) => c.toLowerCase() === v.toLowerCase()) ?? cityFromPin(v)) : null);
    const fc = city(f), tc = city(t);
    const patch: Partial<typeof route> = {};
    if (fc) patch.from = fc;
    if (tc) patch.to = tc;
    if (w && Number(w) > 0 && Number(w) <= 50) { patch.w = String(Number(w)); setWeight(String(Number(w))); }
    if (Object.keys(patch).length) setRoute(patch);
    const d: Record<string, string> = {};
    if (f && isPin(f)) d.sp = f;
    if (t && isPin(t)) d.rp = t;
    if (Object.keys(d).length) patchDetails(d);
    setParams({}, { replace: true });
    cardRef.current?.scrollIntoView({ behavior: rm ? 'auto' : 'smooth', block: 'center' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const est = estimateFrom(route.from, route.to, Number(weight));
  const setW = (v: string) => { setWeight(v); setWeightErr(''); if (Number(v) > 0 && Number(v) <= 50) setRoute({ w: v }); };
  const bump = (d: number) => setW(String(clampWeight((Number(weight) || 0) + d)));

  const start = () => {
    if (!(Number(weight) > 0 && Number(weight) <= 50)) { setWeightErr('Enter a weight between 0.1 and 50 kg'); return; }
    setRoute({ w: String(Number(weight)) });
    begin();
    navigate('/parcel/sender');
  };
  const pickRoute = (a: string, b: string) => { setRoute({ from: a, to: b }); cardRef.current?.scrollIntoView({ behavior: rm ? 'auto' : 'smooth', block: 'center' }); };
  const chips = (prefix: string) => POPULAR_ROUTES.map((r) => (
    <button type="button" className="chip" key={prefix + r.join()} onClick={() => pickRoute(r[0], r[1])} tabIndex={prefix ? -1 : 0} aria-hidden={prefix ? true : undefined}>
      {r[0]} → {r[1]}
    </button>
  ));

  return (
    <ParcelShell>
      <Seo title="Parcel delivery" description="Send parcels across India from your doorstep. Pick Standard, Express or Same-day delivery, pay securely and track every step." />
      <section className="bnr" aria-labelledby="pcl-h1">
        <h1 id="pcl-h1" className="sr">Parcel Service: your package, our priority</h1>
        <picture>
          <source media="(max-width: 700px)" srcSet="/assets/parcel/parcel-banner-1024.webp" />
          <img
            src="/assets/parcel/parcel-banner-1920.webp"
            srcSet="/assets/parcel/parcel-banner-1024.webp 1024w, /assets/parcel/parcel-banner-1920.webp 1920w"
            sizes="(max-width: 1232px) 100vw, 1200px"
            width={1962}
            height={801}
            alt="ZPROO GO Parcel Service. Send parcels with ease, safety and trust, anytime, anywhere. Safe and secure delivery, fast processing, real-time tracking, all types of parcels."
            fetchPriority="high"
            decoding="async"
          />
        </picture>
      </section>

      <div className="wrap">
        <div className="c sc" id="bk" ref={cardRef}>
          <div className="fl" style={{ gap: 12, marginBottom: 14 }}>
            <Icon name="box" />
            <div>
              <h2>Book a parcel</h2>
              <div className="mu">Delivery options and sample charges in seconds</div>
            </div>
          </div>
          <div className="bkr">
            <div><Select id="from" label="From" options={CITIES} value={route.from} onChange={(v) => setRoute({ from: v })} /></div>
            <button type="button" className="swb" aria-label="Swap From and To" onClick={swapRoute}>⇄</button>
            <div><Select id="to" label="To" options={CITIES} value={route.to} onChange={(v) => setRoute({ to: v })} /></div>
          </div>
          <div className="bkr2">
            <label className="lb">
              Weight (kg)
              <div className="stp">
                <button type="button" aria-label="Decrease weight" onClick={() => bump(-0.5)}>−</button>
                <input id="w" type="number" min={0.1} max={50} step={0.1} value={weight} onChange={(e) => setW(e.target.value)} aria-invalid={!!weightErr} />
                <button type="button" aria-label="Increase weight" onClick={() => bump(0.5)}>+</button>
              </div>
              <small className="er" id="e_w">{weightErr}</small>
            </label>
            <div className="fl" style={{ marginTop: 24 }}>
              {[0.5, 1, 2, 5, 10].map((x) => <button type="button" className="chip" key={x} onClick={() => setW(String(x))}>{x} kg</button>)}
            </div>
          </div>
          <div className="row qrow">
            <div className="qe" id="qe">
              {est
                ? <><b>From {inr(est.price)}</b> · Standard delivery in {est.days} {est.days > 1 ? 'days' : 'day'} <span className="tag">SAMPLE</span></>
                : 'Enter a weight between 0.1 and 50 kg'}
            </div>
            <button type="button" className="btn" onClick={start}>Check parcel options</button>
          </div>
        </div>

        <div className="rv" style={{ minWidth: 0, marginTop: 26 }}>
          <h2 style={{ marginBottom: 10 }}>Popular routes</h2>
          <div className="mq"><div className="mqt">{chips('')}{chips('dup-')}</div></div>
        </div>

        <h2 className="rv" style={{ margin: '30px 0 14px' }}>How it works</h2>
        <div className="hw rv">
          {HOW.map((x, i) => (
            <div className="c lift" key={x[1]}>
              <span className="n">{i + 1}</span>
              <Icon name={x[0]} />
              <h3 style={{ margin: '12px 0 2px' }}>{x[1]}</h3>
              <div className="mu" style={{ fontSize: 13 }}>{x[2]}</div>
            </div>
          ))}
        </div>

        <div className="g rv" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', marginTop: 26 }}>
          {TRUST.map((x) => (
            <div className="fl" key={x[1]} style={{ flexWrap: 'nowrap', gap: 12 }}>
              <Icon name={x[0]} />
              <div><b>{x[1]}</b><div className="mu">{x[2]}</div></div>
            </div>
          ))}
        </div>
      </div>
      <PageNote />
    </ParcelShell>
  );
}
