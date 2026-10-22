import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { Field, PageNote, ParcelShell, StatusTag, toast, TrackBar } from '@/features/parcels/components/ui';
import { canCancel } from '@/features/parcels/logic';
import { copyTrackingLink } from '@/features/parcels/share';
import { useParcelStore } from '@/features/parcels/store';

function Rating({ id }: { id: string }) {
  const rate = useParcelStore((s) => s.rate);
  const [stars, setStars] = useState(0);
  const [fb, setFb] = useState('');
  const submit = () => {
    if (!stars) { toast('Choose a star rating'); return; }
    rate(id, stars, fb.trim());
    toast('Thanks for your feedback');
  };
  return (
    <div className="c noprint">
      <h3>Rate your delivery</h3>
      <div className="fl" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} className={`stb ${n <= stars ? 'on' : ''}`} aria-label={`${n} star${n > 1 ? 's' : ''}`} role="radio" aria-checked={n === stars} onClick={() => setStars(n)}>★</button>
        ))}
      </div>
      <label className="lb">Comment (optional)<textarea rows={2} maxLength={200} value={fb} onChange={(e) => setFb(e.target.value)} /></label>
      <button type="button" className="btn sm" style={{ marginTop: 8 }} onClick={submit}>Submit feedback</button>
    </div>
  );
}

export default function ParcelTrackPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { bookings, advanceStatus } = useParcelStore();
  const [query, setQuery] = useState(id ?? '');
  const [err, setErr] = useState('');
  const b = id ? bookings.find((x) => x.id === id.toUpperCase()) : undefined;

  const find = () => {
    const v = query.trim().toUpperCase();
    if (bookings.some((x) => x.id === v)) { setErr(''); navigate(`/parcel/track/${v}`); }
    else setErr('No parcel found with this ID');
  };

  return (
    <ParcelShell>
      <Seo title="Track parcel" noIndex />
      <div className="wrap" style={{ maxWidth: 640 }}>
        <h1>Track parcel</h1>
        <div className="c">
          <div className="row" style={{ alignItems: 'end', gap: 12 }}>
            <Field id="ti" label="Booking ID" value={query} placeholder="ZPG-PRC-123456" error={err} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') find(); }} />
            <button type="button" className="btn" style={{ marginBottom: 16 }} onClick={find}>Track</button>
          </div>
        </div>
        {id && !b && <div className="c wn" role="alert">No parcel found with the ID {id}. Check the ID or open a parcel from <Link to="/parcel/bookings" className="linkbtn">My parcels</Link>.</div>}
        {b ? (
          <>
            <div className="c">
              <div className="row"><b>{b.title}</b><StatusTag b={b} /></div>
              <div className="mu">{b.id} · {b.svc}</div>
              {b.st === 'Cancelled' ? <div className="wn" style={{ marginTop: 10 }}>This parcel was cancelled{b.reason ? `: ${b.reason}` : ''}.</div> : <TrackBar b={b} />}
              {b.otp && b.prog < 4 && b.st !== 'Cancelled' && <div className="ok" style={{ margin: '8px 0' }}>Delivery OTP: <b>{b.otp}</b>. Share it only when you receive the parcel.</div>}
              <div className="fl noprint">
                {b.prog < 4 && b.st !== 'Cancelled' && <button type="button" className="btn o sm" onClick={() => advanceStatus(b.id)}>Demo: move to next status</button>}
                <button type="button" className="btn o sm" onClick={() => void copyTrackingLink(b.id).then((m) => toast(m))}>Copy tracking link</button>
                {canCancel(b) && <Link to="/parcel/bookings" className="btn t sm">Cancel from My parcels</Link>}
              </div>
            </div>
            {b.prog === 4 && b.st === 'Delivered' && (b.rate
              ? <div className="c ok">Thanks for rating this delivery {'★'.repeat(b.rate)}{b.fb ? ` · “${b.fb}”` : ''}</div>
              : <Rating id={b.id} />)}
          </>
        ) : !id && (
          <div className="c">Enter a booking ID, or open a parcel from <Link to="/parcel/bookings" className="linkbtn">My parcels</Link>.</div>
        )}
      </div>
      <PageNote />
    </ParcelShell>
  );
}
