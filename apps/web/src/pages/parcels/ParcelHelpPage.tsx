import { useState } from 'react';
import { Seo } from '@/components/seo/Seo';
import { Field, focusFirstError, ParcelShell, toast } from '@/features/parcels/components/ui';
import { HELP_FAQ } from '@/features/parcels/data';
import { isMobile, isName, MOBILE_ERROR, sanitizeMobile, sanitizeName, type FieldErrors } from '@/features/parcels/logic';

export default function ParcelHelpPage() {
  const [f, setF] = useState({ hn: '', hm: '', hq: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const send = () => {
    const e: FieldErrors = {};
    if (!isName(f.hn.trim())) e.hn = 'Enter your name (letters only)';
    if (!isMobile(f.hm.trim())) e.hm = MOBILE_ERROR;
    if (f.hq.trim().length < 10) e.hq = 'Tell us a little more (10+ characters)';
    setErrors(e);
    if (Object.keys(e).length) { focusFirstError(e, ['hn', 'hm', 'hq']); return; }
    toast(`Request ZPG-HLP-${Math.floor(1e4 + Math.random() * 9e4)} created. We will call you soon.`);
    setF({ hn: '', hm: '', hq: '' });
  };
  return (
    <ParcelShell>
      <Seo title="Parcel help & support" description="Answers about sending parcels with ZPROO GO: what you can send, pricing, pickup, cancellations and delivery OTP." />
      <div className="wrap" style={{ maxWidth: 760 }}>
        <h1 style={{ marginBottom: 12 }}>Help &amp; support</h1>
        {HELP_FAQ.map((q) => (
          <details className="c" key={q[0]}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{q[0]}</summary>
            <p className="mu" style={{ fontSize: 13, marginTop: 8 }}>{q[1]}</p>
          </details>
        ))}
        <div className="c">
          <h3>Contact support</h3>
          <div className="g g2">
            <Field id="hn" label="Your name" value={f.hn} error={errors.hn} onChange={(e) => setF({ ...f, hn: sanitizeName(e.target.value) })} />
            <Field id="hm" label="Mobile number" type="tel" prefix="+91" placeholder="98765 43210" maxLength={16} inputMode="numeric" value={f.hm} error={errors.hm} onChange={(e) => setF({ ...f, hm: sanitizeMobile(e.target.value) })} />
          </div>
          <label className="lb">
            How can we help?
            <textarea id="hq" rows={3} value={f.hq} className={errors.hq ? 'bad' : ''} aria-invalid={!!errors.hq} onChange={(e) => setF({ ...f, hq: e.target.value })} />
            <small className="er" id="e_hq" role={errors.hq ? 'alert' : undefined}>{errors.hq}</small>
          </label>
          <button type="button" className="btn" onClick={send}>Send message</button>
        </div>
      </div>
    </ParcelShell>
  );
}
