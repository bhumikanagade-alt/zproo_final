import { useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { CheckMark } from '@/features/parcels/components/Art';
import { Confetti, ParcelShell, Stepper, StatusTag, toast } from '@/features/parcels/components/ui';
import { formatDay, inr } from '@/features/parcels/logic';
import { copyTrackingLink, downloadReceipt } from '@/features/parcels/share';
import { useParcelQuote, useParcelStore } from '@/features/parcels/store';

export default function ParcelConfirmationPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const b = useParcelStore((s) => s.bookings.find((x) => x.id === id));
  useEffect(() => { useParcelQuote.getState().reset(); }, []);
  if (!b) return <Navigate to="/parcel/bookings" replace />;
  return (
    <ParcelShell>
      <Seo title="Parcel booked" noIndex />
      <Confetti />
      <div className="wrap" style={{ maxWidth: 640 }}>
        <Stepper index={4} />
        <div className="c pop tkt" style={{ textAlign: 'center' }}>
          <CheckMark />
          <h1 style={{ margin: '10px 0 4px' }}>Parcel booked!</h1>
          <p className="mu">Pickup details sent by SMS to {b.senderMobile || 'the sender'}.</p>
          <div className="c" style={{ textAlign: 'left', borderStyle: 'dashed', background: 'var(--w)', marginTop: 14 }}>
            <div className="row"><b>{b.title}</b><StatusTag b={b} /></div>
            <div className="g g2" style={{ marginTop: 8 }}>
              <div><span className="mu">Booking ID</span><br /><b>{b.id}</b></div>
              <div><span className="mu">Parcel</span><br /><b>{b.sub}</b></div>
              <div><span className="mu">Service</span><br /><b>{b.svc}</b></div>
              <div><span className="mu">Paid (sample)</span><br /><b>{inr(b.amt)}</b></div>
              {b.slot && <div><span className="mu">Pickup</span><br /><b>{formatDay(b.slot.d)} · {b.slot.t}</b></div>}
              {b.otp && <div><span className="mu">Delivery OTP</span><br /><b style={{ letterSpacing: 3, color: 'var(--b)' }}>{b.otp}</b></div>}
            </div>
          </div>
          <div className="fl noprint" style={{ justifyContent: 'center' }}>
            <Link to={`/parcel/track/${b.id}`} className="btn">Track parcel</Link>
            <button type="button" className="btn o" onClick={() => downloadReceipt(b)}>Download receipt</button>
            <button type="button" className="btn o" onClick={() => window.print()}>Print</button>
            <button type="button" className="btn o" onClick={() => void copyTrackingLink(b.id).then((m) => toast(m))}>Copy tracking link</button>
            <button type="button" className="btn t" onClick={() => navigate('/parcel')}>Send another parcel</button>
          </div>
        </div>
      </div>
    </ParcelShell>
  );
}
