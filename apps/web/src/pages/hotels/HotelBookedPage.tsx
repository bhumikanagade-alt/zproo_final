import { Badge, Button, Card, CardContent, CardHeader, CardTitle, cn } from '@zproo/ui';
import { Check, CircleCheck, Download, Home, Mail, MapPin } from 'lucide-react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { useBookingHistory } from '@/features/hotels/bookingHistory';
import { HOTEL_STEPS } from '@/features/hotels/components/HotelSteps';
import { PriceBox } from '@/features/hotels/components/PriceBox';
import { MEAL_PLAN_LABEL } from '@/features/hotels/data';
import { formatDate } from '@/features/hotels/dates';
import { hotelConfirmationUrl } from '@/features/hotels/links';
import { guestsLabel } from '@/features/hotels/occupancy';
import { useHotelBooking } from '@/features/hotels/store';

/** "Booking confirmed" page shown right after a hotel payment, laid out like the bus one. */
export default function HotelBookedPage() {
  const [params] = useSearchParams();
  const current = useHotelBooking((s) => s.booking);
  const history = useBookingHistory((s) => s.items);
  const ref = params.get('ref');
  const booking =
    (ref ? [current, ...history.map((h) => h.booking)].find((b) => b?.reference === ref) : current) ?? null;

  if (!booking) return <Navigate to="/hotels" replace />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <Seo title="Booking confirmed" noIndex />
      <ol
        aria-label="Booking progress"
        className="flex items-center gap-1 overflow-x-auto text-xs sm:gap-2 sm:text-sm"
      >
        {HOTEL_STEPS.map((step, i) => {
          const isFinal = i === HOTEL_STEPS.length - 1;
          return (
            <li key={step} className="flex shrink-0 items-center gap-1 sm:gap-2">
              <span className="grid size-6 place-items-center rounded-full border border-success bg-success text-[11px] font-bold text-white">
                <Check aria-hidden className="size-3.5" />
              </span>
              <span className={cn('font-semibold', isFinal ? 'text-success' : 'hidden text-muted sm:inline')}>
                {step}
              </span>
              {!isFinal && <span aria-hidden className="mx-1 h-px w-4 bg-border sm:w-8" />}
            </li>
          );
        })}
      </ol>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Booking confirmed</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          <div className="flex items-start gap-4 rounded-2xl border border-success/30 bg-success/10 p-5">
            <CircleCheck aria-hidden className="size-8 shrink-0 text-success" />
            <div className="min-w-0 space-y-1">
              <p className="text-lg font-bold">Your stay is booked!</p>
              <p className="text-sm">
                Booking reference <strong className="tracking-wide">{booking.reference}</strong>
              </p>
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <Mail aria-hidden className="size-4" /> Details are saved in your account and linked to{' '}
                {booking.contact.email}.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to={hotelConfirmationUrl(booking.reference)}>
                <Download aria-hidden /> Download e-ticket
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Hotel confirmation number</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <div className="rounded-xl border border-border px-4 py-2">
                <p className="text-xs text-muted">
                  {booking.hotelName} · {booking.city}
                </p>
                <p className="font-mono text-lg font-bold tracking-widest">{booking.reference}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Hotel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-lg font-extrabold">{booking.hotelName}</p>
                <p className="text-muted">
                  {booking.stars}-star · {booking.city}
                </p>
                <p className="mt-2 flex items-start gap-1.5 text-muted">
                  <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
                  {booking.hotelAddress}
                </p>
              </div>
              <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted">CHECK-IN</p>
                  <p className="font-bold">{formatDate(booking.checkIn)}</p>
                  <p className="text-muted">From {booking.checkInTime}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">CHECK-OUT</p>
                  <p className="font-bold">{formatDate(booking.checkOut)}</p>
                  <p className="text-muted">Until {booking.checkOutTime}</p>
                </div>
              </div>
              <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted">STAY</p>
                  <p className="font-bold">
                    {booking.nights} night{booking.nights === 1 ? '' : 's'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">ROOMS</p>
                  <p className="font-bold">
                    {booking.rooms} room{booking.rooms === 1 ? '' : 's'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">GUESTS</p>
                  <p className="font-bold">{guestsLabel(booking.adults, booking.children)}</p>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted">ROOM</p>
                <p className="font-bold">{booking.roomName}</p>
                <p className="text-muted">
                  {booking.beds} · {MEAL_PLAN_LABEL[booking.mealPlan]}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Guests</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="divide-y divide-border text-sm">
                {booking.guests.map((g, i) => (
                  <li key={`${g.firstName}-${g.lastName}-${i}`} className="flex flex-wrap justify-between gap-2 py-2">
                    <span className="font-semibold">
                      {g.firstName} {g.lastName}{' '}
                      <Badge variant="outline" className="ml-1">
                        {g.age} yrs
                      </Badge>
                    </span>
                    <span className="font-mono text-xs text-muted">
                      {g.type === 'CHILD' ? 'Child' : 'Adult'}
                    </span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-[calc(var(--header-height)+1rem)] lg:self-start">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {booking.payAtProperty ? 'Pay at property' : 'Amount paid'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PriceBox price={booking.price} payAtProperty={booking.payAtProperty} />
            </CardContent>
          </Card>
          <Button asChild variant="outline" className="w-full">
            <Link to="/">
              <Home aria-hidden /> Back to home
            </Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
