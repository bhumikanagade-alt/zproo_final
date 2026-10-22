import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { Field, focusFirstError, ParcelShell, Select, Stepper, toast } from '@/features/parcels/components/ui';
import { CITIES } from '@/features/parcels/data';
import {
  cityFromPin, partyFieldError, sanitizeAddress, sanitizeMobile, sanitizeName, sanitizePin, validateParties,
  MOBILE_ERROR, type FieldErrors, type ParcelDetails, type PartyField,
} from '@/features/parcels/logic';
import { useParcelQuote, useParcelStore, type SavedAddress } from '@/features/parcels/store';

const ORDER = ['sn', 'sm', 'sa', 'sp', 'rn', 'rm', 'ra', 'rp'];

export default function ParcelSenderPage() {
  const store = useParcelStore();
  const navigate = useNavigate();
  const [p, setP] = useState<ParcelDetails>(store.details);
  const [from, setFrom] = useState(store.route.from);
  const [to, setTo] = useState(store.route.to);
  const [saveS, setSaveS] = useState(false);
  const [saveR, setSaveR] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [hints, setHints] = useState<Record<string, string>>({});

  const setErr = (k: PartyField, m: string) => setErrors((x) => { const n = { ...x }; if (m) n[k] = m; else delete n[k]; return n; });

  // Name: letters only. Numbers and symbols are dropped as you type, with a message.
  const onName = (k: 'sn' | 'rn') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const v = sanitizeName(raw);
    setP((x) => ({ ...x, [k]: v }));
    setErr(k, /[^\p{L} .'-]/u.test(raw) ? 'Name can contain letters only (no numbers or symbols)' : '');
  };
  // Address: any letters / digits and common punctuation, but not only digits.
  const onAddress = (k: 'sa' | 'ra') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = sanitizeAddress(e.target.value);
    setP((x) => ({ ...x, [k]: v }));
    if (errors[k]) setErr(k, partyFieldError(k, v));
  };
  // Mobile: digits only, max 10, must start with 7, 8 or 9. "+91" is fixed in front of the field.
  const onMobile = (k: 'sm' | 'rm') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const v = sanitizeMobile(raw);
    setP((x) => ({ ...x, [k]: v }));
    if (/\D/.test(raw.replace(/^\s*\+?91[\s-]?/, '').replace(/[\s-]/g, ''))) setErr(k, 'Mobile number can contain digits only');
    else if (v && !/^[789]/.test(v)) setErr(k, MOBILE_ERROR);
    else setErr(k, '');
  };
  const onPin = (k: 'sp' | 'rp', setCity: (c: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const v = sanitizePin(raw);
    setP((x) => ({ ...x, [k]: v }));
    setErr(k, /\D/.test(raw) ? 'Pincode can contain digits only' : v.startsWith('0') ? 'Enter correct pincode (cannot start with 0)' : '');
    const city = cityFromPin(v);
    if (city) { setCity(city); setHints((h) => ({ ...h, [k]: `Detected city: ${city}` })); }
    else setHints((h) => ({ ...h, [k]: '' }));
  };
  // Validate a field when the user leaves it (only if something was typed, so tabbing through stays quiet).
  const onBlur = (k: PartyField) => () => { if (p[k].trim()) setErr(k, partyFieldError(k, p[k])); };

  const fillAddress = (a: SavedAddress, side: 's' | 'r') => {
    setP((x) => side === 's' ? { ...x, sn: a.n, sm: a.m, sa: a.a, sp: a.p } : { ...x, rn: a.n, rm: a.m, ra: a.a, rp: a.p });
    (side === 's' ? setFrom : setTo)(a.c);
    toast('Address filled');
  };
  const book = (side: 's' | 'r') => store.addressBook.length > 0 && (
    <div className="fl" style={{ marginBottom: 8 }}>
      <span className="mu">Saved:</span>
      {store.addressBook.map((a, i) => <button type="button" key={i} className="chip" onClick={() => fillAddress(a, side)}>{a.n} · {a.c}</button>)}
    </div>
  );

  const next = () => {
    const trimmed: ParcelDetails = { ...p, sn: p.sn.trim(), sm: p.sm.trim(), sa: p.sa.trim(), sp: p.sp.trim(), rn: p.rn.trim(), rm: p.rm.trim(), ra: p.ra.trim(), rp: p.rp.trim() };
    const e = validateParties(trimmed);
    setErrors(e);
    if (Object.keys(e).length) { focusFirstError(e, ORDER); toast('Fix the highlighted fields'); return; }
    store.setRoute({ from, to });
    store.patchDetails(trimmed);
    if (saveS || saveR) {
      // saveAddress reads the committed store values, so run it after patching.
      if (saveS) store.saveAddress('s');
      if (saveR) store.saveAddress('r');
    }
    useParcelQuote.getState().reset();
    navigate('/parcel/details');
  };

  return (
    <ParcelShell>
      <Seo title="Sender & receiver" noIndex />
      <div className="wrap">
        <Stepper index={0} />
        <h1>Sender &amp; receiver</h1>
        <p className="mu">All fields are required. Mobile numbers start with 7, 8 or 9 (+91 is added for you).</p>
        <div className="g g2" style={{ marginTop: 12 }}>
          <div className="c">
            <h2>Sender details</h2>
            {book('s')}
            <Field id="sn" label="Full name *" value={p.sn} onChange={onName('sn')} onBlur={onBlur('sn')} error={errors.sn} autoComplete="name" maxLength={60} />
            <Field id="sm" label="Mobile number *" type="tel" prefix="+91" placeholder="98765 43210" value={p.sm} onChange={onMobile('sm')} onBlur={onBlur('sm')} error={errors.sm} maxLength={16} inputMode="numeric" autoComplete="tel-national" />
            <Field id="sa" label="Pickup address *" value={p.sa} onChange={onAddress('sa')} onBlur={onBlur('sa')} error={errors.sa} autoComplete="street-address" maxLength={150} />
            <div className="g" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <Select id="from" label="Pickup city" options={CITIES} value={from} onChange={setFrom} />
              <Field id="sp" label="Pincode *" value={p.sp} onChange={onPin('sp', setFrom)} onBlur={onBlur('sp')} error={errors.sp} hint={hints.sp} maxLength={6} inputMode="numeric" autoComplete="postal-code" />
            </div>
            <label style={{ display: 'block', marginTop: 4 }}>
              <input type="checkbox" checked={saveS} onChange={(e) => setSaveS(e.target.checked)} style={{ width: 'auto', marginRight: 8 }} />Save to address book
            </label>
          </div>
          <div className="c">
            <h2>Receiver details</h2>
            {book('r')}
            <Field id="rn" label="Full name *" value={p.rn} onChange={onName('rn')} onBlur={onBlur('rn')} error={errors.rn} maxLength={60} />
            <Field id="rm" label="Mobile number *" type="tel" prefix="+91" placeholder="98765 43210" value={p.rm} onChange={onMobile('rm')} onBlur={onBlur('rm')} error={errors.rm} maxLength={16} inputMode="numeric" autoComplete="off" />
            <Field id="ra" label="Delivery address *" value={p.ra} onChange={onAddress('ra')} onBlur={onBlur('ra')} error={errors.ra} maxLength={150} />
            <div className="g" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <Select id="to" label="Delivery city" options={CITIES} value={to} onChange={setTo} />
              <Field id="rp" label="Pincode *" value={p.rp} onChange={onPin('rp', setTo)} onBlur={onBlur('rp')} error={errors.rp} hint={hints.rp} maxLength={6} inputMode="numeric" />
            </div>
            <label style={{ display: 'block', marginTop: 4 }}>
              <input type="checkbox" checked={saveR} onChange={(e) => setSaveR(e.target.checked)} style={{ width: 'auto', marginRight: 8 }} />Save to address book
            </label>
          </div>
        </div>
        <div className="fl">
          <Link to="/parcel" className="btn o">Back</Link>
          <button type="button" className="btn" onClick={next}>Continue</button>
        </div>
      </div>
    </ParcelShell>
  );
}
