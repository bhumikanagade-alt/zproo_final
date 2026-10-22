import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@zproo/ui';
import { ArrowLeft, Ban, CalendarClock, ReceiptText, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { useAuthStore } from '@/features/auth/store';
import { describeCancellation, refundAmount } from '@/features/hotels/cancellation';
import { earliestChangeDate, tabOfBooking, useBookingHistory } from '@/features/hotels/bookingHistory';
import { BundleCard, VoucherActions } from '@/features/hotels/components/VoucherActions';
import { MEAL_PLAN_LABEL, findHotel, formatINR } from '@/features/hotels/data';
import { addDays, diffNights, formatDate, isIsoDate, todayIso } from '@/features/hotels/dates';
import { TRAVELLER_TYPES, type TravellerType } from '@/features/hotels/extras';
import { useOwnReviews } from '@/features/hotels/ownReviews';
import { priceStay } from '@/features/hotels/pricing';
import { hotelConfirmationUrl, hotelDetailsUrl } from '@/features/hotels/links';

/** One booking: voucher, refund-aware cancellation, date change, and the after-stay review. */
export default function HotelManagePage() {
  const { reference = '' } = useParams();
  const user = useAuthStore((s) => s.user);
  const item = useBookingHistory((s) => s.items.find((i) => i.booking.reference === reference));
  const cancel = useBookingHistory((s) => s.cancel);
  const changeDates = useBookingHistory((s) => s.changeDates);
  const markReviewed = useBookingHistory((s) => s.markReviewed);
  const addReview = useOwnReviews((s) => s.add);

  const today = todayIso();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newIn, setNewIn] = useState(item?.booking.checkIn ?? '');
  const [newOut, setNewOut] = useState(item?.booking.checkOut ?? '');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [rating, setRating] = useState(5);
  const [travellerType, setTravellerType] = useState<TravellerType>('Couple');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');

  const hotel = item ? findHotel(item.booking.hotelId) : undefined;
  const room = hotel?.rooms.find((r) => r.name === item?.booking.roomName);

  const refund = useMemo(() => {
    if (!item) return 0;
    const b = item.booking;
    if (b.payAtProperty) return 0; // nothing was charged
    return refundAmount(room?.cancellation ?? {}, b.price.totalPaise, b.checkIn, b.checkInTime);
  }, [item, room]);

  if (!item || (user && item.userId !== String(user.id))) return <Navigate to="/hotels/bookings" replace />;

  const b = item.booking;
  const tab = tabOfBooking(item, today);
  const cancellation = describeCancellation(room?.cancellation ?? {}, b.checkIn, b.checkInTime);

  const quote = (() => {
    if (!isIsoDate(newIn) || !isIsoDate(newOut) || newOut <= newIn) return null;
    const nights = Math.max(1, diffNights(newIn, newOut));
    return priceStay(room ?? { pricePerNightPaise: b.price.perNightPaise }, nights, b.rooms, null);
  })();

  const doCancel = () => {
    cancel(b.reference, refund);
    setConfirmCancel(false);
    setNotice(refund > 0 ? `Booking cancelled. ${formatINR(refund)} will be refunded to your original payment method.` : 'Booking cancelled. No refund applies to this booking.');
  };

  const saveDates = () => {
    setError('');
    if (!isIsoDate(newIn) || !isIsoDate(newOut)) return setError('Choose both dates.');
    if (newIn < earliestChangeDate(today)) return setError('Check-in must be tomorrow or later.');
    if (newOut <= newIn) return setError('Check-out must be after check-in.');
    if (diffNights(newIn, newOut) > 30) return setError('A stay can be at most 30 nights.');
    if (changeDates(b.reference, newIn, newOut)) {
      setEditing(false);
      setNotice('Your dates were updated and the price was re-quoted at the current room rate.');
    }
  };

  const submitReview = () => {
    setError('');
    if (title.trim().length < 3) return setError('Add a short title for your review.');
    if (text.trim().length < 10) return setError('Tell other guests a little more (at least 10 characters).');
    addReview({ hotelId: b.hotelId, author: b.contact.name || 'You', travellerType, rating, title: title.trim(), text: text.trim(), stayedOn: b.checkOut });
    markReviewed(b.reference);
    setNotice('Thanks! Your review now appears on the hotel page.');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6">
      <Seo title={`Manage booking ${b.reference}`} noIndex />
      <Link to="/hotels/bookings" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"><ArrowLeft aria-hidden className="size-4" /> My hotel bookings</Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{b.hotelName}</h1>
          <p className="text-sm text-muted">{b.hotelAddress}</p>
          <p className="mt-1 text-sm text-muted">Booking {b.reference}</p>
        </div>
        <Badge variant={item.status === 'CANCELLED' ? 'outline' : 'soft'}>{item.status === 'CANCELLED' ? 'Cancelled' : tab === 'past' ? 'Completed' : 'Confirmed'}</Badge>
      </div>

      {notice && <p role="status" className="rounded-xl border border-primary/20 bg-primary-light p-3 text-sm font-semibold text-primary">{notice}</p>}
      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>}

      <Card>
        <CardHeader><CardTitle className="text-base">Stay details</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-4">
            <div><dt className="text-xs text-muted">Check-in</dt><dd className="font-bold">{formatDate(b.checkIn)}</dd><dd className="text-xs text-muted">from {b.checkInTime}</dd></div>
            <div><dt className="text-xs text-muted">Check-out</dt><dd className="font-bold">{formatDate(b.checkOut)}</dd><dd className="text-xs text-muted">until {b.checkOutTime}</dd></div>
            <div><dt className="text-xs text-muted">Room</dt><dd className="font-bold">{b.rooms} × {b.roomName}</dd><dd className="text-xs text-muted">{MEAL_PLAN_LABEL[b.mealPlan]}</dd></div>
            <div><dt className="text-xs text-muted">{b.payAtProperty ? 'Payable at property' : 'Total paid'}</dt><dd className="font-bold">{formatINR(b.price.totalPaise)}</dd><dd className="text-xs text-muted">{b.nights} night{b.nights === 1 ? '' : 's'}</dd></div>
          </dl>
          {item.modifiedAt && <p className="mt-3 text-xs text-muted">Dates were changed on {new Date(item.modifiedAt).toLocaleDateString('en-IN')}.</p>}
        </CardContent>
      </Card>

      {item.status === 'CONFIRMED' && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ReceiptText aria-hidden className="size-4" /> Voucher</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <VoucherActions booking={b} showPrint={false} />
            <Button asChild><Link to={hotelConfirmationUrl(b.reference)}>Open printable voucher (PDF)</Link></Button>
          </CardContent>
        </Card>
      )}

      {item.status === 'CONFIRMED' && tab === 'upcoming' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Change or cancel</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-xl bg-primary-light p-3">
              <p className="font-bold">{cancellation.headline}</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted">{cancellation.rules.map((r) => <li key={r}>{r}</li>)}</ul>
            </div>

            {editing ? (
              <div className="space-y-3 rounded-xl border border-border p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label htmlFor="new-in">New check-in</Label><Input id="new-in" type="date" min={earliestChangeDate(today)} max={addDays(today, 365)} value={newIn} onChange={(e) => { setNewIn(e.target.value); if (isIsoDate(e.target.value) && (!isIsoDate(newOut) || newOut <= e.target.value)) setNewOut(addDays(e.target.value, Math.max(1, b.nights))); }} className="mt-1" /></div>
                  <div><Label htmlFor="new-out">New check-out</Label><Input id="new-out" type="date" min={isIsoDate(newIn) ? addDays(newIn, 1) : earliestChangeDate(today)} value={newOut} onChange={(e) => setNewOut(e.target.value)} className="mt-1" /></div>
                </div>
                {quote ? (
                  <p className="text-xs text-muted">
                    {quote.nights} night{quote.nights === 1 ? '' : 's'} at the current rate: <strong className="text-foreground">{formatINR(quote.totalPaise)}</strong>{' '}
                    ({quote.totalPaise === b.price.totalPaise ? 'no change in price' : quote.totalPaise > b.price.totalPaise ? `${formatINR(quote.totalPaise - b.price.totalPaise)} more` : `${formatINR(b.price.totalPaise - quote.totalPaise)} less`}). Availability is confirmed when you save.
                  </p>
                ) : <p className="text-xs text-muted">Pick valid dates to see the new price.</p>}
                <div className="flex gap-2">
                  <Button type="button" onClick={saveDates}>Save new dates</Button>
                  <Button type="button" variant="ghost" onClick={() => { setEditing(false); setError(''); setNewIn(b.checkIn); setNewOut(b.checkOut); }}>Keep current dates</Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => { setEditing(true); setNotice(''); }}><CalendarClock aria-hidden /> Change dates</Button>
            )}

            {confirmCancel ? (
              <div role="alertdialog" aria-label="Confirm cancellation" className="space-y-3 rounded-xl border border-danger/30 bg-danger/5 p-4">
                <p className="font-bold">Cancel this booking?</p>
                <p>{b.payAtProperty ? 'You have not paid anything, so there is nothing to refund.' : refund > 0 ? <>You will get <strong>{formatINR(refund)}</strong> back out of {formatINR(b.price.totalPaise)}.</> : 'This booking is non-refundable now: you will get no refund.'}</p>
                <div className="flex gap-2">
                  <Button type="button" variant="destructive" onClick={doCancel}>Yes, cancel booking</Button>
                  <Button type="button" variant="ghost" onClick={() => setConfirmCancel(false)}>Keep booking</Button>
                </div>
              </div>
            ) : (
              <div>
                <Button type="button" variant="outline" onClick={() => setConfirmCancel(true)}><Ban aria-hidden /> Cancel booking</Button>
                <p className="mt-1 text-xs text-muted">{b.payAtProperty ? 'Pay at property: nothing was charged.' : `If you cancel now you get ${refund > 0 ? formatINR(refund) : 'no refund'}.`}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {item.status === 'CANCELLED' && (
        <Card><CardContent className="p-5 text-sm">
          <p className="font-bold">This booking was cancelled{item.cancelledAt ? ` on ${new Date(item.cancelledAt).toLocaleDateString('en-IN')}` : ''}.</p>
          <p className="mt-1 text-muted">{(item.refundPaise ?? 0) > 0 ? `${formatINR(item.refundPaise ?? 0)} refund is on its way to your original payment method.` : 'No refund applied.'}</p>
          <Button asChild variant="outline" className="mt-3"><Link to={hotelDetailsUrl(b.hotelId)}>Book this hotel again</Link></Button>
        </CardContent></Card>
      )}

      {item.status === 'CONFIRMED' && tab === 'past' && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Star aria-hidden className="size-4" /> How was your stay?</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {item.reviewed ? <p className="font-semibold text-primary">You reviewed this stay. Thank you!</p> : (
              <>
                <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Your rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n === 1 ? '' : 's'}`} onClick={() => setRating(n)}>
                      <Star aria-hidden className={`size-7 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                    </button>
                  ))}
                </div>
                <div>
                  <Label htmlFor="traveller-type">Travelling as</Label>
                  <select id="traveller-type" value={travellerType} onChange={(e) => setTravellerType(e.target.value as TravellerType)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm">
                    {TRAVELLER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><Label htmlFor="review-title">Title</Label><Input id="review-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className="mt-1" /></div>
                <div><Label htmlFor="review-text">Your review</Label><textarea id="review-text" value={text} onChange={(e) => setText(e.target.value)} maxLength={600} rows={4} className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm" /></div>
                <Button type="button" onClick={submitReview}>Submit review</Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <BundleCard city={b.city} />
    </div>
  );
}
