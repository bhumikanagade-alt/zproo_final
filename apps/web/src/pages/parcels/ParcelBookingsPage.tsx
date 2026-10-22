import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { couponsApi } from '@/features/coupons/api';
import { PageNote, ParcelShell, Select, StatusTag, toast } from '@/features/parcels/components/ui';
import { CANCEL_REASONS } from '@/features/parcels/data';
import { canCancel, filterBookings, inr, toPaise, type ParcelBooking } from '@/features/parcels/logic';
import { useParcelStore } from '@/features/parcels/store';
import { useWallet } from '@/store/wallet';

const TABS = ['Active', 'Delivered', 'Cancelled'] as const;
type Tab = (typeof TABS)[number];

function CancelDialog({ b, onClose }: { b: ParcelBooking; onClose: () => void }) {
  const cancel = useParcelStore((s) => s.cancel);
  const credit = useWallet((s) => s.credit);
  const [reason, setReason] = useState<string>(CANCEL_REASONS[0]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, [onClose]);
  const confirm = () => {
    if (!cancel(b.id, reason)) return;
    credit(toPaise(b.amt), `Refund · ${b.id}`);
    if (b.coupon) {
      // Give the coupon use back (the booking ID is what it was recorded against), so the customer can use it again.
      couponsApi.release({ code: b.coupon, bookingRef: b.id }).then(
        (r) => toast(r.released ? `${inr(b.amt)} refunded to wallet. Coupon ${b.coupon} can be used again.` : `${inr(b.amt)} refunded to wallet`),
        () => toast(`${inr(b.amt)} refunded to wallet. Coupon ${b.coupon} could not be given back right now.`),
      );
    } else {
      toast(`${inr(b.amt)} refunded to wallet`);
    }
    onClose();
  };
  return (
    <div className="ov" role="dialog" aria-modal="true" aria-labelledby="cx-t">
      <div className="c pop" style={{ width: 'min(420px,92vw)' }}>
        <h3 id="cx-t">Cancel this parcel?</h3>
        <p className="mu" style={{ margin: '6px 0 10px' }}>{inr(b.amt)} will be refunded to your ZPROO Wallet instantly.{b.coupon ? ` Coupon ${b.coupon} will be given back.` : ''}</p>
        <Select id="cr" label="Reason" options={CANCEL_REASONS} value={reason} onChange={setReason} />
        <div className="fl" style={{ marginTop: 12 }}>
          <button type="button" className="btn" onClick={confirm}>Cancel parcel</button>
          <button type="button" className="btn o" onClick={onClose} autoFocus>Keep parcel</button>
        </div>
      </div>
    </div>
  );
}

export default function ParcelBookingsPage() {
  const { bookings, bookAgain } = useParcelStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('Active');
  const [q, setQ] = useState('');
  const [cancelling, setCancelling] = useState<ParcelBooking | null>(null);
  const list = filterBookings(bookings, tab, q);
  const active = bookings.filter((b) => b.st === 'Booked').length;
  const spent = bookings.filter((b) => b.st !== 'Cancelled').reduce((a, b) => a + b.amt, 0);

  const again = (id: string) => {
    if (bookAgain(id)) { toast('Details copied. Review and continue.'); navigate('/parcel/sender'); }
  };

  return (
    <ParcelShell>
      <Seo title="My parcels" noIndex />
      <div className="wrap">
        <h1>My parcels</h1>
        <div className="g" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', margin: '12px 0' }}>
          {([['Total parcels', bookings.length], ['Active', active], ['Spent (sample)', inr(spent)]] as const).map((x) => (
            <div className="c lift" key={x[0]} style={{ margin: 0 }}>
              <div className="mu">{x[0]}</div>
              <div style={{ font: '700 24px var(--pf)', color: 'var(--b)' }}>{x[1]}</div>
            </div>
          ))}
        </div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <div className="fl" role="tablist" aria-label="Parcel status">
            {TABS.map((x) => <button type="button" key={x} role="tab" aria-selected={tab === x} className={`chip ${tab === x ? 'on' : ''}`} onClick={() => setTab(x)}>{x}</button>)}
          </div>
          <input type="search" placeholder="Search by ID, city or name" aria-label="Search parcels" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 280, margin: 0 }} />
        </div>
        <div>
          {list.length ? list.map((b) => (
            <div className="c row lift" key={b.id} style={{ flexWrap: 'wrap' }}>
              <div><b>{b.title}</b><div className="mu">{b.sub} · {b.id}</div></div>
              <div className="fl">
                <StatusTag b={b} />
                <Link to={`/parcel/track/${b.id}`} className="btn o sm">Track</Link>
                {b.snap && <button type="button" className="btn o sm" onClick={() => again(b.id)}>Book again</button>}
                {canCancel(b) && <button type="button" className="btn t sm" onClick={() => setCancelling(b)}>Cancel</button>}
              </div>
            </div>
          )) : (
            <div className="c">
              <b>{q ? 'No parcels match your search' : `No ${tab.toLowerCase()} parcels`}</b>
              <div className="mu">{q ? 'Try a different ID, city or name.' : 'Parcels you book appear here.'}</div>
              <Link to="/parcel" className="btn sm" style={{ marginTop: 8, display: 'inline-block' }}>Book a parcel</Link>
            </div>
          )}
        </div>
      </div>
      {cancelling && <CancelDialog b={cancelling} onClose={() => setCancelling(null)} />}
      <PageNote />
    </ParcelShell>
  );
}
