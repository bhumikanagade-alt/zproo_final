import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@zproo/ui';
import { CheckCircle2, CreditCard, Landmark, Loader2, Lock, ShieldCheck, Smartphone } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import zprooUpiQr from '../../../assets-src/images/zproo-upi-qr.png';
import { Seo } from '@/components/seo/Seo';
import { useAuthStore } from '@/features/auth/store';
import { couponErrorMessage, couponsApi } from '@/features/coupons/api';
import { buildBooking, generateReference, verifyPayment } from '@/features/hotels/booking';
import { HoldBanner } from '@/features/hotels/components/HoldBanner';
import { HotelSteps } from '@/features/hotels/components/HotelSteps';
import { PriceBox } from '@/features/hotels/components/PriceBox';
import { formatINR, nightsBetween } from '@/features/hotels/data';
import { useBookingHistory } from '@/features/hotels/bookingHistory';
import { clearHold, useHold } from '@/features/hotels/hold';
import { hotelBookedUrl, hotelRoomsUrl } from '@/features/hotels/links';
import { useHotelNotifications } from '@/features/hotels/notifications';
import { priceStay, type CouponSelection } from '@/features/hotels/pricing';
import { useHotelBooking } from '@/features/hotels/store';
import { useStayCoupon } from '@/features/hotels/useStayPrice';
import { ApiClientError } from '@/services/http';
import { detectCardBrand, sanitizeCardNumber, sanitizeCvv, sanitizeExpiry, validateCard } from '@/features/cabs/validation';
import { BANKS, validatePayment, type PaymentInput, type PaymentMethod } from '@/features/hotels/validation';

const MERCHANT_UPI_ID: string = import.meta.env.VITE_UPI_ID || 'zproobus@upi';

const METHODS = [
  ['upi', 'UPI', Smartphone],
  ['card', 'Card', CreditCard],
  ['netbanking', 'Net banking', Landmark],
] as const;

export default function HotelPaymentPage() {
  const navigate = useNavigate();
  const state = useHotelBooking();
  const user = useAuthStore((s) => s.user);
  const { hotel, room, contact, checkIn, checkOut, rooms, adults, children, childAges, guests } = state;
  const [method, setMethod] = useState<PaymentMethod>(state.paymentMethod);
  const [upi, setUpi] = useState('');
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '' });
  const [bank, setBank] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<'idle' | 'verifying'>('idle');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const holdKey = `${hotel?.id ?? ''}:${room?.id ?? ''}:${checkIn}:${checkOut}:${rooms}`;
  const hold = useHold(holdKey);
  const subtotalPaise = room ? room.pricePerNightPaise * Math.max(1, nightsBetween(checkIn, checkOut)) * Math.max(1, rooms) : 0;
  const { selection, problem: couponProblem } = useStayCoupon(subtotalPaise);
  if (!hotel || !room || !contact) return <Navigate to="/hotels" replace />;
  if (guests.length === 0) return <Navigate to="/hotels/booking" replace />;

  const nights = nightsBetween(checkIn, checkOut);
  const price = priceStay(room, nights, rooms, selection);
  const payLater = room.payAtProperty;
  // Card errors show under each field once the guest has tried to pay, then update as they type.
  const cardErrors = submitted && method === 'card' && !payLater ? validateCard(card) : {};

  const pay = (e: FormEvent) => {
    e.preventDefault();
    if (phase === 'verifying') return;
    if (hold.expired) return setError('Your 15-minute price hold has ended. Tap “Hold again” above to continue.');
    setError('');
    setSubmitted(true);
    const input: PaymentInput = { method, upi, card, bank };
    if (!payLater) {
      const problem = validatePayment(input);
      if (problem) return setError(method === 'card' ? 'Please correct the highlighted card details.' : problem);
    }
    setPhase('verifying');
    state.setPaymentMethod(method);
    // Simulated gateway round-trip, then server-side style verification of the result.
    timer.current = window.setTimeout(() => void finish(input), 600);
  };

  const finish = async (input: PaymentInput) => {
    const outcome = payLater ? ({ status: 'SUCCESS', transactionId: 'PAY-AT-PROPERTY' } as const) : verifyPayment(input, price.totalPaise);
    if (outcome.status === 'FAILED') {
      setPhase('idle');
      setError(outcome.message);
      return;
    }
    const reference = generateReference();
    // A coupon made in the admin panel is recorded with the server now, so its "Used" count and limits stay true.
    let applied: CouponSelection = selection;
    if (selection && typeof selection === 'object') {
      try {
        const used = await couponsApi.redeem({ code: selection.code, service: 'HOTEL', orderPaise: price.roomSubtotalPaise, bookingRef: reference });
        applied = { code: used.code, discountPaise: used.discountPaise };
      } catch (redeemError) {
        setPhase('idle');
        if (redeemError instanceof ApiClientError && redeemError.status === 400) {
          // Expired, used up, switched off… The coupon is dropped and the guest sees the new price before paying again.
          state.setCoupon(null);
          setError(`${couponErrorMessage(redeemError)} The coupon was removed, so the price has changed. Please check the total and pay again.`);
        } else {
          setError('We could not confirm your coupon right now. Please try again in a moment.');
        }
        return;
      }
    }
    const booking = buildBooking(
      { hotel, room, checkIn, checkOut, nights, rooms, adults, children, childAges, guests, contact, specialRequests: state.specialRequests, specialNote: state.specialNote, coupon: applied, method },
      reference,
      outcome.transactionId,
    );
    state.complete(booking);
    clearHold();
    // Keep every confirmed stay on this device so My Hotel Bookings can list and manage it.
    useBookingHistory.getState().add(user ? String(user.id) : 'guest', booking);
    // Push the confirmed booking to the notification bell (same as bus and flight bookings).
    if (user) {
      useHotelNotifications.getState().add({
        reference: booking.reference,
        userId: String(user.id),
        hotelName: booking.hotelName,
        city: booking.city,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        createdAt: booking.paidAt,
      });
    }
    void navigate(hotelBookedUrl(booking.reference), { replace: true });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Seo title="Hotel payment" noIndex />
      <HotelSteps current={3} />
      <HoldBanner holdKey={holdKey} roomsUrl={hotelRoomsUrl(hotel.id)} />
      <form onSubmit={pay} noValidate className="grid gap-6 lg:grid-cols-[1fr_21rem]">
        <main className="space-y-5">
          <div><h1 className="text-3xl font-extrabold">Secure payment</h1><p className="mt-1 text-sm text-muted">Payment is simulated in this development environment. No real charge is made.</p></div>
          {payLater ? (
            <Card><CardContent className="flex gap-3 p-5 text-sm"><ShieldCheck aria-hidden className="size-5 shrink-0 text-primary" /><p><strong>Pay at property.</strong> Nothing is charged now. You will pay {formatINR(price.totalPaise)} at the hotel when you check in.</p></CardContent></Card>
          ) : (
            <Card><CardHeader><CardTitle className="text-base">Payment method</CardTitle></CardHeader><CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {METHODS.map(([id, label, Icon]) => (
                  <button type="button" key={id} onClick={() => { setMethod(id); setError(''); }} aria-pressed={method === id} className={`rounded-xl border p-4 text-left ${method === id ? 'border-primary bg-primary-light' : 'border-border'}`}>
                    <Icon aria-hidden className="size-5 text-primary" /><span className="mt-2 block text-sm font-bold">{label}</span>
                  </button>
                ))}
              </div>
              {method === 'upi' && (
                <div className="mt-5 flex flex-col items-center gap-2 rounded-2xl border border-border p-4 text-center">
                  <p className="text-sm font-semibold">Scan to pay with UPI</p>
                  <div className="rounded-2xl border border-border bg-white p-3 shadow-sm">
                    <img src={zprooUpiQr} alt="ZPROO UPI QR code" width={220} height={220} className="block rounded-xl" />
                  </div>
                  <p className="text-lg font-bold">Pay {formatINR(price.totalPaise)}</p>
                  <p className="text-xs text-muted">UPI ID: {MERCHANT_UPI_ID}</p>
                  <p className="max-w-sm text-xs leading-5 text-muted">Open your UPI app, scan the QR code and complete the payment. Or enter your UPI ID below.</p>
                </div>
              )}
              {method === 'upi' && <div className="mt-5"><Label htmlFor="upi">UPI ID</Label><Input id="upi" value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@upi" className="mt-1" autoComplete="off" /></div>}
              {method === 'card' && (
                <div className="mt-5 grid gap-3">
                  <div><Label htmlFor="card-number">Card number</Label><Input id="card-number" inputMode="numeric" autoComplete="off" value={card.number} maxLength={23} onChange={(e) => setCard({ ...card, number: sanitizeCardNumber(e.target.value), cvv: sanitizeCvv(card.cvv, e.target.value) })} placeholder="1234 5678 9012 3456" className="mt-1" aria-invalid={!!cardErrors.number} />{detectCardBrand(card.number) && <p className="mt-1 text-xs text-muted">{detectCardBrand(card.number)?.name}</p>}{cardErrors.number && <p role="alert" className="mt-1 text-xs text-danger">{cardErrors.number}</p>}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label htmlFor="expiry">Expiry</Label><Input id="expiry" value={card.expiry} inputMode="numeric" maxLength={5} onChange={(e) => setCard({ ...card, expiry: sanitizeExpiry(e.target.value) })} placeholder="MM/YY" className="mt-1" autoComplete="off" aria-invalid={!!cardErrors.expiry} />{cardErrors.expiry && <p role="alert" className="mt-1 text-xs text-danger">{cardErrors.expiry}</p>}</div>
                    <div><Label htmlFor="cvv">CVV</Label><Input id="cvv" type="password" inputMode="numeric" maxLength={4} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: sanitizeCvv(e.target.value, card.number) })} placeholder="123" className="mt-1" autoComplete="off" aria-invalid={!!cardErrors.cvv} />{cardErrors.cvv && <p role="alert" className="mt-1 text-xs text-danger">{cardErrors.cvv}</p>}</div>
                  </div>
                </div>
              )}
              {method === 'netbanking' && (
                <div className="mt-5"><Label htmlFor="bank">Select your bank</Label>
                  <select id="bank" value={bank} onChange={(e) => setBank(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm"><option value="">Choose bank</option>{BANKS.map((b) => <option key={b} value={b}>{b}</option>)}</select>
                  <p className="mt-2 text-xs text-muted">You will be redirected to your bank in a production payment gateway.</p></div>
              )}
            </CardContent></Card>
          )}
          {couponProblem && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{couponProblem} The total shown is without the coupon.</p>}
          {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
          {phase === 'verifying' && <p role="status" className="flex items-center gap-2 text-sm font-semibold text-primary"><Loader2 aria-hidden className="size-4 animate-spin" /> Verifying your payment. Please do not close this page.</p>}
          <p className="flex items-center gap-2 text-xs text-muted"><Lock aria-hidden className="size-3.5" /> Card details are validated here and never stored by this demo flow. Test tip: a card ending 0002 or UPI starting fail@ is declined.</p>
        </main>
        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24">
          <div><p className="text-sm text-muted">{hotel.name}</p><p className="mt-1 font-bold">{room.name}</p></div>
          <PriceBox price={price} payAtProperty={payLater} />
          <Button type="submit" size="lg" className="w-full" disabled={phase === 'verifying'}>
            {phase === 'verifying' ? 'Processing…' : payLater ? 'Confirm booking' : `Pay ${formatINR(price.totalPaise)}`} <CheckCircle2 aria-hidden />
          </Button>
        </aside>
      </form>
    </div>
  );
}
