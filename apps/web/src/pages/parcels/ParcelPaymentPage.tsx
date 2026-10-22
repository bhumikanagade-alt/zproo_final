import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { detectCardBrand, sanitizeCardNumber, sanitizeCvv, sanitizeExpiry, validateCard } from '@/features/cabs/validation';
import { couponErrorMessage, couponsApi } from '@/features/coupons/api';
import { ParcelCouponCard } from '@/features/parcels/components/CouponCard';
import { ChargesCard, Field, focusFirstError, ParcelShell, Select, Stepper, toast, useCharges } from '@/features/parcels/components/ui';
import { inr, isUpi, newBookingId, toPaise, type FieldErrors } from '@/features/parcels/logic';
import { useParcelQuote, useParcelStore } from '@/features/parcels/store';
import { ApiClientError } from '@/services/http';
import { useWallet } from '@/store/wallet';

const BANKS = ['HDFC Bank', 'SBI', 'ICICI Bank', 'Axis Bank'];
const PAY_DELAY_MS = 1000;

export default function ParcelPaymentPage() {
  const { pm, setPm, details, confirm, coupon, setCoupon, bookings } = useParcelStore();
  const quote = useParcelQuote();
  const m = useCharges();
  const { balance, debit } = useWallet();
  const navigate = useNavigate();
  const [f, setF] = useState({ upi: 'amit@okicici', cn: '', cx: '', cv: '', bk: BANKS[0]! });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  // One booking ID per payment attempt: the coupon use is recorded against it, so a retry counts once.
  const bookingRef = useRef<string | null>(null);
  if (!details.sn) return <Navigate to="/parcel/sender" replace />;
  if (!m || quote.status !== 'ok') return <Navigate to="/parcel/details" replace />;

  const walletRupees = balance / 100;
  const options: [id: string, title: string, sub: string][] = [
    ['UPI', 'UPI', 'Google Pay, PhonePe, Paytm, BHIM'],
    ['Card', 'Credit / debit card', 'Visa, Mastercard, RuPay'],
    ['Wallet', 'ZPROO Wallet', `Balance ${inr(walletRupees)}${walletRupees < m.tot ? ' · add money to use this option' : ''}`],
    ['Net banking', 'Net banking', 'All major banks'],
    ['Pay later', 'Pay later', 'Pay within 15 days'],
  ];
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  const validate = (): FieldErrors => {
    const e: FieldErrors = {};
    if (pm === 'UPI' && !isUpi(f.upi.trim())) e.upi = 'Enter a valid UPI ID';
    if (pm === 'Card') {
      // Network, length, Luhn checksum, unexpired MM/YY and brand-aware CVV.
      const c = validateCard({ number: f.cn, expiry: f.cx, cvv: f.cv });
      if (c.number) e.cn = c.number;
      if (c.expiry) e.cx = c.expiry;
      if (c.cvv) e.cv = c.cvv;
    }
    return e;
  };

  const pay = async () => {
    if (busy) return;
    if (pm === 'Wallet' && walletRupees < m.tot) { toast('Wallet balance is too low. Add money first.'); return; }
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) { focusFirstError(e, ['upi', 'cn', 'cx', 'cv']); return; }
    setBusy(true);
    bookingRef.current ??= newBookingId(new Set(bookings.map((b) => b.id)));
    const ref = bookingRef.current;
    // Give the coupon use back when this attempt does not end in a booking (best effort; the booking ID makes it safe to repeat).
    const giveBack = async (): Promise<boolean> => {
      if (!coupon) return false;
      try { return (await couponsApi.release({ code: coupon.code, bookingRef: ref })).released; } catch { return false; /* the use stays tied to this booking ID, so paying again counts once */ }
    };
    if (coupon) {
      // The server checks the coupon once more and records its use, so the admin panel's "Used" column moves and the limits hold.
      try {
        const result = await couponsApi.redeem({ code: coupon.code, service: 'PARCEL', orderPaise: m.gross * 100, bookingRef: ref });
        const discount = Math.floor(result.discountPaise / 100);
        if (discount !== coupon.discount) {
          await giveBack();
          setCoupon({ code: result.code, discount });
          setBusy(false);
          toast(`The coupon amount changed to ${inr(discount)}. Check the new total and pay again.`);
          return;
        }
      } catch (err) {
        setBusy(false);
        if (err instanceof ApiClientError && (err.status === 400 || err.status === 401 || err.status === 409)) {
          setCoupon(null);
          toast(err.status === 401 ? 'Please sign in again to use this coupon. It was removed.' : `${couponErrorMessage(err)} The coupon was removed. Check the new total.`);
        } else {
          toast('Could not check your coupon. Please try again.');
        }
        return;
      }
    }
    // Simulated gateway: the booking is only created after the "payment" succeeds.
    setTimeout(() => {
      void (async () => {
        if (pm === 'Wallet' && !debit(toPaise(m.tot), 'Parcel booking')) {
          // The wallet refused after the coupon was used: give the use back so the customer does not lose the coupon.
          const back = await giveBack();
          setBusy(false);
          toast(back ? 'Wallet balance is too low. Add money first. Your coupon was not used.' : 'Wallet balance is too low. Add money first.');
          return;
        }
        const b = confirm(ref);
        if (!b) { await giveBack(); setBusy(false); navigate('/parcel/details'); return; }
        navigate(`/parcel/confirmation/${b.id}`);
      })();
    }, PAY_DELAY_MS);
  };

  return (
    <ParcelShell>
      <Seo title="Payment" noIndex />
      <div className="wrap">
        <Stepper index={3} />
        <div className="lay">
          <div>
          <ParcelCouponCard idPrefix="pcl-pay-cpn" />
          <div className="c">
            <h1>Payment options</h1>
            <div role="radiogroup" aria-label="Payment method">
              {options.map((o) => (
                <label key={o[0]} className="opt" style={pm === o[0] ? { borderColor: 'var(--b)', background: 'var(--bl)' } : undefined}>
                  <input type="radio" name="pm" style={{ width: 'auto', margin: 0 }} checked={pm === o[0]} onChange={() => { setPm(o[0]); setErrors({}); }} />
                  <span><b>{o[1]}</b>{o[0] === 'UPI' && <small style={{ color: 'var(--bs)' }}> Recommended</small>}<br /><span className="mu">{o[2]}</span></span>
                </label>
              ))}
            </div>
            {pm === 'UPI' && (
              <div className="row" style={{ alignItems: 'end', gap: 12 }}>
                <Field id="upi" label="UPI ID" value={f.upi} onChange={set('upi')} error={errors.upi} autoComplete="off" />
                <button type="button" className="btn o" style={{ marginBottom: 16 }} onClick={() => (isUpi(f.upi.trim()) ? (setErrors({}), toast('UPI ID verified')) : setErrors({ upi: 'Enter a valid UPI ID' }))}>Verify</button>
              </div>
            )}
            {pm === 'Card' && (
              <div className="g g2">
                <Field id="cn" label="Card number" value={f.cn} onChange={(e) => { const cn = sanitizeCardNumber(e.target.value); setF((x) => ({ ...x, cn, cv: sanitizeCvv(x.cv, cn) })); }} error={errors.cn} hint={detectCardBrand(f.cn)?.name ?? ''} maxLength={23} inputMode="numeric" autoComplete="cc-number" placeholder="1234 5678 9012 3456" />
                <Field id="cx" label="Expiry (MM/YY)" value={f.cx} onChange={(e) => setF((x) => ({ ...x, cx: sanitizeExpiry(e.target.value) }))} error={errors.cx} maxLength={5} inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" />
                <Field id="cv" label="CVV" type="password" value={f.cv} onChange={(e) => setF((x) => ({ ...x, cv: sanitizeCvv(e.target.value, x.cn) }))} error={errors.cv} maxLength={4} inputMode="numeric" autoComplete="cc-csc" placeholder="•••" />
              </div>
            )}
            {pm === 'Net banking' && <Select id="bk" label="Choose bank" options={BANKS} value={f.bk} onChange={(bk) => setF((x) => ({ ...x, bk }))} />}
            {pm === 'Wallet' && walletRupees < m.tot && <div className="wn" style={{ margin: '8px 0' }}>Your wallet balance is low. <Link to="/wallet" className="linkbtn">Add money</Link></div>}
            <div className="mu">Demo payment: no real money is charged.</div>
            <div className="fl" style={{ marginTop: 10 }}><Link to="/parcel/review" className="btn o">Back</Link></div>
          </div>
          </div>
          <ChargesCard
            label={busy ? <><span className="spin" />Processing payment…</> : 'Pay now'}
            action={() => void pay()}
            disabled={busy}
          />
        </div>
      </div>
    </ParcelShell>
  );
}
