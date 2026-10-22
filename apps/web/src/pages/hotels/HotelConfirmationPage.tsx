import { Button } from '@zproo/ui';
import { Download, Home, Mail, MapPin, Printer } from 'lucide-react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { Logo } from '@/components/brand/Logo';
import { BundleCard, VoucherActions } from '@/features/hotels/components/VoucherActions';
import { Seo } from '@/components/seo/Seo';
import { usePointerCursor } from '@/hooks/usePointerCursor';
import { buildConfirmationText } from '@/features/hotels/booking';
import { MEAL_PLAN_LABEL } from '@/features/hotels/data';
import { formatDate } from '@/features/hotels/dates';
import { guestsLabel } from '@/features/hotels/occupancy';
import { useBookingHistory } from '@/features/hotels/bookingHistory';
import { useHotelBooking } from '@/features/hotels/store';
import { SPECIAL_REQUEST_DISCLAIMER, specialRequestLabel } from '@/features/hotels/validation';

export default function HotelConfirmationPage() {
  usePointerCursor();
  const [params] = useSearchParams();
  const current = useHotelBooking((s) => s.booking);
  const history = useBookingHistory((s) => s.items);
  const ref = params.get('ref');
  // The booking just made lives in the session; older ones are reopened from My Hotel Bookings.
  const booking =
    (ref ? [current, ...history.map((h) => h.booking)].find((b) => b?.reference === ref) : current) ?? null;

  if (!booking) return <Navigate to="/hotels" replace />;

  const download = () => {
    const url = URL.createObjectURL(
      new Blob([buildConfirmationText(booking)], { type: 'text/plain;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `${booking.reference}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="min-h-screen bg-background py-6 print:bg-white print:py-0">
      <Seo title={`Hotel E-Voucher ${booking.reference}`} noIndex />

      <div className="mx-auto mb-4 flex max-w-3xl justify-end px-4 print:hidden">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => window.print()}>
            <Printer aria-hidden /> Print / Save as PDF
          </Button>
          <Button variant="outline" onClick={download}>
            <Download aria-hidden /> Download confirmation
          </Button>
        </div>
      </div>

      <div className="mx-auto mb-4 max-w-3xl px-4 print:hidden">
        <VoucherActions booking={booking} showPrint={false} />
      </div>

      <article className="relative mx-auto max-w-3xl overflow-hidden bg-white px-8 py-8 shadow-card print:shadow-none">
        <p
          aria-hidden
          className="pointer-events-none absolute inset-0 grid -rotate-[30deg] place-items-center text-5xl font-black tracking-widest text-primary/10"
        >
          ZPROO-GO
        </p>

        <header className="flex items-start justify-between border-b-2 border-primary pb-4">
          <div>
            <Logo height={34} priority />
          </div>
          <div className="text-right">
            <p className="text-xl font-extrabold">HOTEL E-VOUCHER</p>
            <p className="text-sm text-muted">Booking {booking.reference}</p>
          </div>
        </header>

        <div className="mt-4 rounded-lg bg-success/10 px-3 py-2 text-xs font-semibold text-success">
          HOTEL BOOKING CONFIRMED
        </div>

        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted">STATUS</dt>
            <dd className="font-bold">Confirmed</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">BOOKED ON</dt>
            <dd className="font-bold">{new Date(booking.paidAt).toLocaleDateString('en-IN')}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">CONTACT</dt>
            <dd className="font-bold">{booking.contact.phone}</dd>
            <dd className="text-xs text-muted">{booking.contact.email}</dd>
          </div>
        </dl>

        <section className="mt-6 rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xl font-extrabold">{booking.hotelName}</p>
              <p className="mt-1 text-sm text-muted">
                {booking.stars}-star · {booking.city}
              </p>
            </div>
            <p className="font-bold text-primary">CONFIRMATION {booking.reference}</p>
          </div>

          <p className="mt-3 flex items-start gap-1.5 text-sm text-muted">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
            {booking.hotelAddress}
          </p>

          <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted">CHECK-IN</p>
              <p className="text-xl font-extrabold">{formatDate(booking.checkIn)}</p>
              <p className="text-sm text-muted">From {booking.checkInTime}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs text-muted">CHECK-OUT</p>
              <p className="text-xl font-extrabold">{formatDate(booking.checkOut)}</p>
              <p className="text-sm text-muted">Until {booking.checkOutTime}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted">STAY</p>
              <p className="font-bold">{booking.nights} night{booking.nights === 1 ? '' : 's'}</p>
            </div>
            <div>
              <p className="text-xs text-muted">ROOMS</p>
              <p className="font-bold">{booking.rooms} room{booking.rooms === 1 ? '' : 's'}</p>
            </div>
            <div>
              <p className="text-xs text-muted">GUESTS</p>
              <p className="font-bold">{guestsLabel(booking.adults, booking.children)}</p>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-extrabold uppercase text-primary">Room details</h2>
          <div className="mt-2 rounded-xl border border-border p-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <p className="font-bold">{booking.roomName}</p>
              <p className="font-semibold">{booking.rooms} room{booking.rooms === 1 ? '' : 's'}</p>
            </div>
            <p className="mt-1 text-muted">{booking.beds} · {MEAL_PLAN_LABEL[booking.mealPlan]}</p>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-extrabold uppercase text-primary">Guests</h2>
          <table className="mt-2 w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-1 font-semibold">Name</th>
                <th className="py-1 font-semibold">Type</th>
                <th className="py-1 text-right font-semibold">Age</th>
              </tr>
            </thead>
            <tbody>
              {booking.guests.map((guest, index) => (
                <tr key={`${guest.firstName}-${guest.lastName}-${index}`} className="border-t border-border">
                  <td className="py-1.5 font-medium">{guest.firstName} {guest.lastName}</td>
                  <td className="py-1.5">{guest.type === 'ADULT' ? 'Adult' : 'Child'}</td>
                  <td className="py-1.5 text-right font-semibold">{guest.age}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {(booking.specialRequests.length > 0 || booking.specialNote) && (
          <section className="mt-6">
            <h2 className="text-sm font-extrabold uppercase text-primary">Special requests</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted">
              {booking.specialRequests.map((id) => <li key={id}>{specialRequestLabel(id)}</li>)}
              {booking.specialNote && <li>{booking.specialNote}</li>}
            </ul>
            <p className="mt-2 text-xs text-muted">{SPECIAL_REQUEST_DISCLAIMER}</p>
          </section>
        )}

        <section className="mt-6">
          <h2 className="text-sm font-extrabold uppercase text-primary">Fare summary</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt>Room price</dt>
              <dd>₹{(booking.price.roomSubtotalPaise / 100).toLocaleString('en-IN')}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Taxes &amp; fees</dt>
              <dd>₹{(booking.price.taxesPaise / 100).toLocaleString('en-IN')}</dd>
            </div>
            {booking.price.couponDiscountPaise > 0 && (
              <div className="flex justify-between text-success">
                <dt>Promotion discount</dt>
                <dd>−₹{(booking.price.couponDiscountPaise / 100).toLocaleString('en-IN')}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-2 text-base font-extrabold">
              <dt>{booking.payAtProperty ? 'Total payable at property' : 'Total paid'}</dt>
              <dd>₹{(booking.price.totalPaise / 100).toLocaleString('en-IN')}</dd>
            </div>
          </dl>
        </section>

        <section className="mt-6 text-xs text-muted">
          <h2 className="text-sm font-extrabold uppercase text-primary">Cancellation policy</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {booking.cancellationRules.map((rule) => <li key={rule}>{rule}</li>)}
          </ul>
        </section>

        <section className="mt-6 text-xs text-muted">
          <h2 className="text-sm font-extrabold uppercase text-primary">Important information</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Carry a valid government photo ID. Guest names should match the ID used at check-in.</li>
            <li>Check-in and check-out times are shown above and are subject to the property's policies.</li>
            <li>Special requests are subject to hotel availability.</li>
          </ul>
        </section>

        <div className="mt-6 flex items-center gap-1.5 border-t border-border pt-4 text-xs text-muted">
          <Mail aria-hidden className="size-3.5" /> Confirmation sent to {booking.contact.email}
        </div>

        <p className="mt-8 text-center text-xs text-muted">
          ZPROO GO — Travel Smarter. Go Further.
        </p>

        <div className="mt-6"><BundleCard city={booking.city} /></div>

        <div className="mt-5 flex flex-wrap justify-center gap-5 print:hidden">
          <Link to={`/hotels/bookings/${encodeURIComponent(booking.reference)}`} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            Manage booking
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            <Home aria-hidden className="size-4" /> Back to home
          </Link>
        </div>
      </article>
    </div>
  );
}
