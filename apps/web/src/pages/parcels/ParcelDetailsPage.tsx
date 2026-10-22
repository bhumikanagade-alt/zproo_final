import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { Icon } from '@/features/parcels/components/Icon';
import { ChargesCard, DeliveryOptions, Field, focusFirstError, ParcelShell, Select, Stepper, toast } from '@/features/parcels/components/ui';
import { HANDLING, PARCEL_TYPES, SLOTS, TYPE_ICONS } from '@/features/parcels/data';
import { dayIso, inr, selectedOption, validateInfo, type FieldErrors } from '@/features/parcels/logic';
import { useParcelQuote, useParcelStore } from '@/features/parcels/store';

const ORDER = ['pw', 'pl', 'pwd', 'ph', 'pdt', 'pd'];

export default function ParcelDetailsPage() {
  const { route, details, slot, notify, svc, setRoute, patchDetails, setSlot, setNotify } = useParcelStore();
  const quote = useParcelQuote();
  const navigate = useNavigate();
  const [errors, setErrors] = useState<FieldErrors>({});
  const needsParties = !details.sn;

  // A saved pickup date can be in the past: fall back to tomorrow.
  const pickupDate = slot.d && slot.d >= dayIso(0) ? slot.d : dayIso(1);
  useEffect(() => { if (slot.d !== pickupDate) setSlot({ d: pickupDate }); }, [slot.d, pickupDate, setSlot]);
  useEffect(() => { if (!needsParties && useParcelQuote.getState().status === 'idle') void useParcelQuote.getState().load(); }, [needsParties]);

  if (needsParties) return <Navigate to="/parcel/sender" replace />;

  const edit = (patch: () => void) => { patch(); useParcelQuote.getState().refresh(); };

  const next = () => {
    const e = validateInfo(route, details, { ...slot, d: pickupDate });
    setErrors(e);
    if (Object.keys(e).length) { focusFirstError(e, ORDER); toast('Fix the highlighted fields'); return; }
    if (svc === 'Same-day' && pickupDate !== dayIso(0)) { toast('Same-day delivery needs a pickup date of today'); return; }
    if (quote.status !== 'ok') { toast('Wait for delivery rates to load'); return; }
    if (!selectedOption(quote.data, svc)) { toast('Choose an available delivery option'); return; }
    navigate('/parcel/review');
  };

  const num = (v: string) => v.replace(/[^\d.]/g, '');

  return (
    <ParcelShell>
      <Seo title="Parcel details" noIndex />
      <div className="wrap">
        <Stepper index={1} />
        <div className="lay">
          <div>
            <div className="c">
              <h1 style={{ marginBottom: 8 }}>Parcel information</h1>
              <div className="tps" role="group" aria-label="Parcel type">
                {PARCEL_TYPES.map((x, i) => (
                  <button type="button" key={x} className={`tp ${details.type === i ? 'on' : ''}`} aria-pressed={details.type === i} onClick={() => patchDetails({ type: i })}>
                    <Icon name={TYPE_ICONS[i]!} /><span>{x}</span>
                  </button>
                ))}
              </div>
              <div className="g g2">
                <Field id="pw" label="Weight (kg) *" type="number" min={0.1} max={50} step={0.1} value={route.w} error={errors.pw} onChange={(e) => edit(() => setRoute({ w: e.target.value }))} />
                <Field id="pv" label="Declared value (₹, optional)" type="number" min={0} value={details.val} onChange={(e) => edit(() => patchDetails({ val: e.target.value }))} />
                <Field id="pl" label="Length (cm)" type="number" min={1} value={details.l} error={errors.pl} onChange={(e) => edit(() => patchDetails({ l: num(e.target.value) }))} />
                <Field id="pwd" label="Width (cm)" type="number" min={1} value={details.wd} error={errors.pwd} onChange={(e) => edit(() => patchDetails({ wd: num(e.target.value) }))} />
                <Field id="ph" label="Height (cm)" type="number" min={1} value={details.hh} error={errors.ph} onChange={(e) => edit(() => patchDetails({ hh: num(e.target.value) }))} />
              </div>
              <label className="lb">
                Package description *
                <textarea id="pd" rows={2} maxLength={120} value={details.d} aria-invalid={!!errors.pd} className={errors.pd ? 'bad' : ''} onChange={(e) => patchDetails({ d: e.target.value })} />
                <small className="er" id="e_pd" role={errors.pd ? 'alert' : undefined}>{errors.pd}</small>
              </label>
              <h3 style={{ fontSize: 16 }}>Special handling</h3>
              {HANDLING.map((x, i) => (
                <label key={x[0]} style={{ display: 'block', margin: '4px 0' }}>
                  <input type="checkbox" style={{ width: 'auto', marginRight: 8 }} checked={!!details.h[i]}
                    onChange={(e) => patchDetails({ h: details.h.map((v, j) => (j === i ? +e.target.checked : v)) })} />
                  {x[0]}{x[1] ? ` (+${inr(x[1])})` : ''}
                </label>
              ))}
            </div>
            <div className="c">
              <h2>Delivery options</h2>
              <div id="opts"><DeliveryOptions /></div>
            </div>
            <div className="c">
              <h2 style={{ marginBottom: 8 }}>Pickup schedule</h2>
              <div className="g g2">
                <Field id="pdt" label="Pickup date *" type="date" value={pickupDate} min={dayIso(0)} max={dayIso(7)} error={errors.pdt} onChange={(e) => setSlot({ d: e.target.value })} />
                <Select id="pts" label="Time slot" options={SLOTS} value={slot.t} onChange={(t) => setSlot({ t })} />
              </div>
              <div className="mu" style={{ margin: '4px 0 6px' }}>Get updates by</div>
              {['SMS', 'WhatsApp'].map((x, i) => (
                <label key={x} style={{ display: 'inline-block', marginRight: 16 }}>
                  <input type="checkbox" style={{ width: 'auto', marginRight: 6 }} checked={!!notify[i]} onChange={(e) => setNotify(i, e.target.checked)} />{x}
                </label>
              ))}
            </div>
            <div className="fl"><Link to="/parcel/sender" className="btn o">Back</Link></div>
          </div>
          <ChargesCard label="Continue" action={next} />
        </div>
      </div>
    </ParcelShell>
  );
}
