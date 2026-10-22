import { cn } from '@zproo/ui';
import { Banknote, Building2, CreditCard, Lock, Smartphone, Wallet } from 'lucide-react';
import { useRef, useState } from 'react';
import { detectCardBrand, sanitizeCardNumber, sanitizeCvv, sanitizeExpiry, validateCard, type CardErrors } from '@/features/cabs/validation';
import { Navigate, useNavigate } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { simulatePayment } from '@/features/cabs/bookingLogic';
import { CabCouponCard } from '@/features/cabs/components/CabCouponCard';
import { UpiQr } from '@/features/cabs/components/UpiQr';
import { Card, DemoNote, FareTable, FlowHeader, focusRing, TextField, useRequireRide, VehicleIcon } from '@/features/cabs/components/ui';
import { useCabCoupon } from '@/features/cabs/useCabCoupon';
import { couponErrorMessage, couponsApi } from '@/features/coupons/api';
import { ApiClientError } from '@/services/http';
import { calcFare, routeFor, getVehicle, rupees } from '@/features/cabs/fare';
import { useCabStore } from '@/features/cabs/store';
import type { PaymentMethod, PaymentOutcome } from '@/features/cabs/types';

const METHODS: { id: PaymentMethod; label: string; sub: string; icon: typeof Smartphone }[] = [
  { id: 'upi', label: 'UPI', sub: 'Pay using UPI apps', icon: Smartphone },
  { id: 'card', label: 'Credit / Debit Card', sub: 'Visa, Mastercard, RuPay', icon: CreditCard },
  { id: 'netbanking', label: 'Net Banking', sub: 'All major banks', icon: Building2 },
  { id: 'wallet', label: 'Wallet', sub: 'Paytm, PhonePe, Google Pay', icon: Wallet },
  { id: 'cash', label: 'Cash', sub: 'Pay in cash to driver', icon: Banknote },
];

export default function CabPaymentPage() {
  const { draft, redirect } = useRequireRide();
  const { patch, confirmBooking, newReference } = useCabStore();
  const navigate = useNavigate();
  const { adminDiscount, problem } = useCabCoupon();
  /** One reference per payment attempt, so a coupon use is counted once even if the guest retries. */
  const bookingRef = useRef<string | null>(null);
  const [couponError, setCouponError] = useState('');
  const [cardForm, setCardForm] = useState({ number: '', expiry: '', cvv: '' });
  const [cardErrors, setCardErrors] = useState<CardErrors>({});
  const [outcome, setOutcome] = useState<PaymentOutcome>('success');
  const [state, setState] = useState<'idle' | 'processing' | 'failed' | 'cancelled'>('idle');
  if (redirect) return redirect;
  if (!draft.passenger.name || !draft.passenger.mobile) return <Navigate to="/cabs/passenger" replace />;
  const v = getVehicle(draft.vehicleId!);
  const route = routeFor(draft);
  const fare = calcFare(v, route, draft.couponCode, adminDiscount);

  const pay = async () => {
    if (draft.paymentMethod === 'card') {
      const errs = validateCard(cardForm);
      setCardErrors(errs);
      if (Object.keys(errs).length) {
        window.setTimeout(() => (document.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus(), 0);
        return;
      }
    }
    setState('processing');
    const result = await simulatePayment(outcome);
    if (result !== 'success') {
      setState(result);
      return;
    }
    bookingRef.current ??= newReference();
    const reference = bookingRef.current;
    // A coupon made in the admin panel: record its use with the server so the admin "Used" column moves and the limits hold.
    if (draft.couponCode && draft.couponDiscount != null) {
      try {
        const subtotalOrder = calcFare(v, route).total * 100;
        await couponsApi.redeem({ code: draft.couponCode, service: 'CAB', orderPaise: subtotalOrder, bookingRef: reference });
      } catch (e) {
        setState('idle');
        if (e instanceof ApiClientError && e.status === 400) {
          // Expired, used up, switched off… The coupon is dropped and the guest sees the new total before paying again.
          patch({ couponCode: null, couponDiscount: null });
          setCouponError(`${couponErrorMessage(e)} The coupon was removed, so the total has changed. Please check it and pay again.`);
        } else {
          setCouponError('We could not confirm your coupon right now. Please try again in a moment.');
        }
        return;
      }
    }
    setCouponError('');
    const b = confirmBooking(reference);
    navigate(`/cabs/finding/${b.reference}`);
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6">
      <Seo title="Payment" noIndex />
      <FlowHeader title="Payment" back="/cabs/passenger" step={5} />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 text-xl font-semibold">Payment method</h2>
            <ul role="radiogroup" aria-label="Payment method" className="space-y-2">
              {METHODS.map((m) => { const on = draft.paymentMethod === m.id; const I = m.icon; return (
                <li key={m.id}><button type="button" role="radio" aria-checked={on} onClick={() => patch({ paymentMethod: m.id })} className={cn('flex w-full items-center gap-3 rounded-xl border p-3 text-left', focusRing, on ? 'border-primary bg-primary-light' : 'border-border')}>
                  <span aria-hidden className={cn('size-5 shrink-0 rounded-full border-2', on ? 'border-primary bg-primary ring-2 ring-inset ring-white' : 'border-[#8f8688]')} />
                  <I aria-hidden className="size-5 text-primary" /><span><span className="block text-sm font-semibold">{m.label}</span><span className="text-xs text-muted">{m.sub}</span></span>
                  {on && <span className="ml-auto text-xs font-semibold text-primary">Selected</span>}</button></li>); })}
            </ul>
            {draft.paymentMethod === 'card' && (
              <div className="mt-4 space-y-3 rounded-xl border border-border p-4">
                <TextField label="Card number" inputMode="numeric" autoComplete="off" maxLength={19} placeholder="1234 5678 9012 3456" value={cardForm.number}
                  onChange={(e) => { setCardForm((f) => ({ ...f, number: sanitizeCardNumber(e.target.value) })); setCardErrors((x) => ({ ...x, number: undefined })); }} error={cardErrors.number} hint={detectCardBrand(cardForm.number)?.name ?? ''} />
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="Expiry (MM/YY)" inputMode="numeric" autoComplete="off" maxLength={5} placeholder="MM/YY" value={cardForm.expiry}
                    onChange={(e) => { setCardForm((f) => ({ ...f, expiry: sanitizeExpiry(e.target.value) })); setCardErrors((x) => ({ ...x, expiry: undefined })); }} error={cardErrors.expiry} />
                  <TextField label="CVV" type="password" inputMode="numeric" autoComplete="off" maxLength={4} placeholder={detectCardBrand(cardForm.number)?.cvv === 4 ? '1234' : '123'} value={cardForm.cvv}
                    onChange={(e) => { setCardForm((f) => ({ ...f, cvv: sanitizeCvv(e.target.value, f.number) })); setCardErrors((x) => ({ ...x, cvv: undefined })); }} error={cardErrors.cvv} />
                </div>
                <p className="text-xs text-muted">Demo tip: 4111 1111 1111 1111 (Visa) is a valid test card. Nothing is charged.</p>
              </div>
            )}
            {draft.paymentMethod === 'upi' && <UpiQr amount={fare.total} note={`Zproo Go cab ride`} />}
          </Card>
          <CabCouponCard vehicle={v} route={route} discount={fare.discount} problem={problem} idPrefix="pay-cpn" />
          {couponError && <p role="alert" className="rounded-lg bg-primary-light p-3 text-sm text-primary">{couponError}</p>}
          <DemoNote><strong>Demo payment.</strong> Nothing is sent to a payment provider. Card details are only checked on this page and never stored.</DemoNote>
          <Card>
            <label htmlFor="out" className="mb-1 block text-xs font-medium text-muted">Demo outcome (for testing)</label>
            <select id="out" value={outcome} onChange={(e) => setOutcome(e.target.value as PaymentOutcome)} className={cn('h-11 w-full rounded-lg border border-border bg-card px-3', focusRing)}>
              <option value="success">Payment succeeds</option><option value="failed">Payment fails</option><option value="cancelled">Payment is cancelled</option></select>
          </Card>
        </div>
        <aside aria-label="Booking summary" className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <Card>
            <h2 className="mb-3 text-xl font-semibold">Booking summary</h2>
            <div className="mb-3 flex items-center gap-3"><VehicleIcon id={v.id} size="sm" /><div><p className="font-semibold">{v.label}</p><p className="text-xs text-muted">{draft.mode === 'rental' ? `${draft.pickup} · ${draft.rentalHours ?? 4} hr rental` : `${draft.pickup} → ${draft.drop}${draft.mode === 'round-trip' ? ' (round trip)' : ''}`}</p></div></div>
            <FareTable fare={fare} />
            <p className="mt-3 flex items-center gap-2 text-xs text-success"><Lock aria-hidden className="size-3" />Secure checkout (simulated)</p>
            {state === 'failed' && <p role="alert" className="mt-3 rounded-lg bg-primary-light p-2 text-sm text-primary">Payment failed (demo). You have not been charged. Try again or choose another method.</p>}
            {state === 'cancelled' && <p role="alert" className="mt-3 rounded-lg bg-neutral-100 p-2 text-sm">Payment cancelled. Your ride is not booked.</p>}
            <button type="button" onClick={pay} disabled={state === 'processing'} className={cn('cab-btn mt-4 w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60', focusRing)}>
              {state === 'processing' ? 'Processing (demo)…' : state === 'idle' ? `Pay & confirm · ${rupees(fare.total)}` : `Try again · ${rupees(fare.total)}`}</button>
            {state === 'cancelled' && <button type="button" onClick={() => navigate('/cabs')} className={cn('mt-2 w-full rounded-xl border border-border py-2.5 text-sm font-semibold', focusRing)}>Return to search</button>}
          </Card>
        </aside>
      </div>
    </div>
  );
}
