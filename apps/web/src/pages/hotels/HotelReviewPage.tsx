import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription, DialogTitle, Input, Skeleton } from '@zproo/ui';
import { ArrowRight, CheckCircle2, Lock, Tag } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { HoldBanner } from '@/features/hotels/components/HoldBanner';
import { HotelSteps } from '@/features/hotels/components/HotelSteps';
import { PriceBox } from '@/features/hotels/components/PriceBox';
import { couponCondition, couponErrorMessage, couponHeadline, couponsApi, useLiveCoupons } from '@/features/coupons/api';
import { HOTEL_COUPONS, MEAL_PLAN_LABEL, formatINR, nightsBetween } from '@/features/hotels/data';
import { describeCancellation } from '@/features/hotels/cancellation';
import { formatDate } from '@/features/hotels/dates';
import { hotelPaymentUrl, hotelRoomsUrl } from '@/features/hotels/links';
import { guestsLabel } from '@/features/hotels/occupancy';
import { checkCoupon, priceStay } from '@/features/hotels/pricing';
import { useHotelBooking } from '@/features/hotels/store';
import { useStayCoupon } from '@/features/hotels/useStayPrice';
import { ApiClientError } from '@/services/http';
import { SPECIAL_REQUEST_DISCLAIMER, specialRequestLabel } from '@/features/hotels/validation';

export default function HotelReviewPage() {
  const navigate = useNavigate();
  const state = useHotelBooking();
  const { hotel, room, checkIn, checkOut, rooms, adults, children, guests, contact, coupon, specialRequests, specialNote } = state;
  const [couponInput, setCouponInput] = useState(coupon ?? '');
  const [couponError, setCouponError] = useState('');
  const [applying, setApplying] = useState(false);
  const [offersOpen, setOffersOpen] = useState(false);
  const liveCoupons = useLiveCoupons('HOTEL');
  const subtotalPaise = room ? room.pricePerNightPaise * Math.max(1, nightsBetween(checkIn, checkOut)) * Math.max(1, rooms) : 0;
  const { selection, problem } = useStayCoupon(subtotalPaise);
  if (!hotel || !room || !contact || guests.length === 0) return <Navigate to="/hotels/booking" replace />;

  const nights = nightsBetween(checkIn, checkOut);
  const price = priceStay(room, nights, rooms, selection);
  const cancellation = describeCancellation(room.cancellation, checkIn, hotel.checkInTime);

  /**
   * Coupons made in the admin panel (Marketing → Coupons) are checked by the server: dates, "valid on hotels",
   * minimum order and usage limits. The built-in codes (ZPROO10, STAY15) still work when no admin coupon has that code.
   */
  const applyCoupon = async (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code) {
      setCouponError('Enter a coupon code.');
      return;
    }
    setApplying(true);
    setCouponError('');
    try {
      const result = await couponsApi.check({ code, service: 'HOTEL', orderPaise: price.roomSubtotalPaise });
      state.setCoupon(result.code, result.discountPaise);
      setCouponInput(result.code);
    } catch (error) {
      const refusedByServer =
        error instanceof ApiClientError && error.status === 400 && error.details[0]?.message !== 'Invalid or expired coupon code';
      const builtIn = checkCoupon(code);
      if (refusedByServer) {
        state.setCoupon(null);
        setCouponError(couponErrorMessage(error));
      } else if (builtIn.ok) {
        state.setCoupon(builtIn.code, null);
        setCouponInput(builtIn.code);
      } else {
        state.setCoupon(null);
        setCouponError(builtIn.message);
      }
    } finally {
      setApplying(false);
    }
  };
  const removeCoupon = () => {
    state.setCoupon(null);
    setCouponInput('');
    setCouponError('');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Seo title="Review hotel booking" noIndex />
      <HotelSteps current={2} />
      <HoldBanner holdKey={`${hotel.id}:${room.id}:${checkIn}:${checkOut}:${rooms}`} roomsUrl={hotelRoomsUrl(hotel.id)} />
      <div className="mb-5"><h1 className="text-3xl font-extrabold">Review your stay</h1><p className="mt-1 text-sm text-muted">Check dates, guests, cancellation terms and the final price before payment.</p></div>
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <main className="space-y-5">
          <Card><CardHeader><CardTitle>{hotel.name}</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
            <p className="text-muted">{hotel.address} · {hotel.stars}-star · {hotel.rating.toFixed(1)}/5</p>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div><dt className="text-xs text-muted">Check-in</dt><dd className="font-bold">{formatDate(checkIn)}</dd><dd className="text-xs text-muted">from {hotel.checkInTime}</dd></div>
              <div><dt className="text-xs text-muted">Check-out</dt><dd className="font-bold">{formatDate(checkOut)}</dd><dd className="text-xs text-muted">until {hotel.checkOutTime}</dd></div>
              <div><dt className="text-xs text-muted">Stay</dt><dd className="font-bold">{nights} night{nights === 1 ? '' : 's'}</dd></div>
              <div><dt className="text-xs text-muted">Rooms</dt><dd className="font-bold">{rooms}</dd></div>
              <div><dt className="text-xs text-muted">Guests</dt><dd className="font-bold">{guestsLabel(adults, children)}</dd></div>
            </dl>
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base">Room &amp; policies</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
            <p className="flex flex-wrap items-center gap-2"><Badge variant="soft">{room.name}</Badge><span>{rooms} × {room.beds}</span></p>
            <p><strong>Meal plan:</strong> {MEAL_PLAN_LABEL[room.mealPlan]}</p>
            <div className="rounded-xl bg-primary-light p-3"><CheckCircle2 aria-hidden className="mr-2 inline size-4 text-primary" /><strong>{cancellation.headline}</strong>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-xs text-muted">{cancellation.rules.map((r) => <li key={r}>{r}</li>)}</ul></div>
            <p className="text-muted">{room.payAtProperty ? 'Pay at property: nothing is charged now.' : 'Prepaid: you pay now to confirm.'}</p>
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base">Guests &amp; contact</CardTitle></CardHeader><CardContent className="text-sm">
            <ul className="divide-y divide-border">{guests.map((g, i) => <li key={i} className="py-1.5">{g.firstName} {g.lastName} · {g.type === 'ADULT' ? 'Adult' : 'Child'} · {g.age} yrs</li>)}</ul>
            <p className="mt-3 text-muted">{contact.name ? `${contact.name} · ` : ''}{contact.email} · {contact.phone}</p>
            {(specialRequests.length > 0 || specialNote) && (
              <div className="mt-3"><p className="font-semibold">Special requests</p>
                <ul className="mt-1 list-disc pl-5 text-muted">{specialRequests.map((id) => <li key={id}>{specialRequestLabel(id)}</li>)}{specialNote && <li>{specialNote}</li>}</ul>
                <p className="mt-1 text-xs text-muted">{SPECIAL_REQUEST_DISCLAIMER}</p></div>
            )}
            <Link to="/hotels/booking" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">Edit guest details</Link>
          </CardContent></Card>

          <Card><CardHeader className="flex-row items-center justify-between pb-3"><div><CardTitle className="flex items-center gap-2 text-base"><Tag aria-hidden className="size-4" /> Coupon / offer</CardTitle><p className="mt-1 text-sm text-muted">Enter a code or pick one of the offers available for hotel stays.</p></div><Button type="button" variant="outline" size="sm" onClick={() => setOffersOpen(true)}><Tag aria-hidden /> View offers</Button></CardHeader><CardContent>
            <div className="flex gap-2"><Input aria-label="Hotel coupon" value={couponInput} maxLength={20} onChange={(e) => { setCouponInput(e.target.value.trim().toUpperCase().slice(0, 20)); setCouponError(''); }} placeholder="Enter coupon code" /><Button type="button" variant="outline" disabled={applying} onClick={() => void applyCoupon(couponInput)}>{applying ? 'Checking…' : 'Apply'}</Button>{coupon && <Button type="button" variant="ghost" onClick={removeCoupon}>Remove</Button>}</div>
            {price.couponCode && <p role="status" className="mt-2 text-sm text-primary">{price.couponCode} applied — you save {formatINR(price.couponDiscountPaise)} on the room price.</p>}
            {problem && <p role="alert" className="mt-2 text-sm text-danger">{problem} The price below is without the coupon.</p>}
            {couponError && <p role="alert" className="mt-2 text-sm text-danger">{couponError}</p>}
          </CardContent></Card>

          <Dialog open={offersOpen} onOpenChange={setOffersOpen}>
            <DialogContent className="max-w-md">
              <DialogTitle>Available offers</DialogTitle>
              <DialogDescription>Choose an offer and apply it to this stay.</DialogDescription>
              <div className="mt-5 space-y-3">
                {liveCoupons.isPending && <Skeleton className="h-16 rounded-xl" />}
                {(liveCoupons.data ?? []).map((c) => (
                  <button key={c.code} type="button" className="w-full rounded-xl border border-border p-4 text-left hover:border-primary" onClick={() => { setOffersOpen(false); setCouponInput(c.code); void applyCoupon(c.code); }}>
                    <strong className="font-mono">{c.code}</strong> — {couponHeadline(c)}
                    <p className="mt-1 text-xs text-muted">{c.description}{couponCondition(c) ? ` · ${couponCondition(c)}` : ''}</p>
                  </button>
                ))}
                {/* Built-in promotions that exist besides the admin-made coupons. */}
                {Object.entries(HOTEL_COUPONS).filter(([code]) => !(liveCoupons.data ?? []).some((c) => c.code === code)).map(([code, percent]) => (
                  <button key={code} type="button" className="w-full rounded-xl border border-border p-4 text-left hover:border-primary" onClick={() => { setOffersOpen(false); setCouponInput(code); void applyCoupon(code); }}>
                    <strong className="font-mono">{code}</strong> — {percent}% off
                    <p className="mt-1 text-xs text-muted">Hotel promotion on the room price.</p>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </main>
        <aside className="h-fit rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24">
          <h2 className="mb-4 font-extrabold">Price summary</h2>
          <PriceBox price={price} payAtProperty={room.payAtProperty} />
          <Button size="lg" className="mt-5 w-full" onClick={() => void navigate(hotelPaymentUrl)}><Lock aria-hidden /> {room.payAtProperty ? 'Continue to confirm' : 'Continue to payment'} <ArrowRight aria-hidden /></Button>
          <p className="mt-3 text-center text-xs text-muted">You will review your payment method before confirmation.</p>
        </aside>
      </div>
    </div>
  );
}
