import { useMutation } from '@tanstack/react-query';
import type { BookingDetails } from '@zproo/types';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@zproo/ui';
import { CircleCheck, Download, Home, Mail } from 'lucide-react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router';
import { useEffect } from 'react';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { errorMessage } from '@/features/auth/errors';
import { checkoutApi, useBooking } from '@/features/checkout/api';
import { CHECKOUT_STEP, type CheckoutService } from '@/features/checkout/steps';
import { paymentUrl, searchHome, serviceOf } from '@/features/checkout/links';
import { TripSummary } from '@/features/checkout/TripSummary';
import { useBookingSession } from '@/features/checkout/bookingSession';
import { CheckoutShell } from '@/features/checkout/CheckoutShell';
import { DemoBanner } from '@/features/checkout/DemoBanner';
import { PriceSummary } from '@/features/checkout/PriceSummary';

const TITLE = { MR: 'Mr', MRS: 'Mrs', MS: 'Ms', MSTR: 'Master', MISS: 'Miss' } as Record<
  string,
  string
>;

/** Confirmation for any booking (flights and buses), at /flights/… and /buses/confirmation. */
export default function ConfirmationPage() {
  const [params] = useSearchParams();
  const service: CheckoutService = useLocation().pathname.startsWith('/buses') ? 'bus' : 'flight';
  const step = CHECKOUT_STEP[service].done;
  const reference = params.get('ref');
  // Tickets are issued just after payment; poll briefly until the PNR appears.
  const { data: booking, isPending, error } = useBooking(reference, { poll: true });
  if (!reference) return <Navigate to={searchHome(service)} replace />;
  if (isPending) {
    return (
      <CheckoutShell step={step} service={service} title="Booking confirmed">
        <Skeleton className="h-72 rounded-2xl" />
      </CheckoutShell>
    );
  }
  if (error || !booking) {
    return (
      <CheckoutShell step={step} service={service} title="Booking">
        <FormAlert>{errorMessage(error)}</FormAlert>
      </CheckoutShell>
    );
  }
  if (booking.status === 'PENDING_PAYMENT')
    return <Navigate to={paymentUrl(serviceOf(booking), booking.reference)} replace />;
  if (booking.train) return <Navigate to={`/trains/confirmation?ref=${encodeURIComponent(booking.reference)}`} replace />;
  return <Confirmation booking={booking} />;
}

function Confirmation({ booking }: { booking: BookingDetails }) {
  const service = serviceOf(booking);
  useEffect(() => { if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') useBookingSession.getState().clear(); }, [booking.status]);
  const step = CHECKOUT_STEP[service].done;
  const download = useMutation({ mutationFn: () => checkoutApi.downloadTicket(booking.reference) });
  const confirmed = booking.status === 'CONFIRMED' || booking.status === 'COMPLETED';
  const ticketsIssued = booking.bus
    ? Boolean(booking.bus.pnr)
    : booking.flights.every((f) => f.pnr);
  const demo = booking.bus
    ? booking.bus.offer.provider === 'mock'
    : booking.flights.some((f) => f.offer.provider === 'mock');

  if (!confirmed) {
    return (
      <CheckoutShell step={step} service={service} title="Booking not confirmed">
        <FormAlert>
          Booking {booking.reference} is {booking.status.toLowerCase().replace('_', ' ')}. If money
          was debited, it will be refunded to the original payment method.
        </FormAlert>
        <Button asChild>
          <Link to={searchHome(service)}>Search again</Link>
        </Button>
      </CheckoutShell>
    );
  }

  return (
    <CheckoutShell
      step={step}
      service={service}
      title="Booking confirmed"
      aside={
        <>
          <PriceSummary price={booking.price} title="Amount paid" />
          <Button asChild variant="outline" className="w-full">
            <Link to="/">
              <Home aria-hidden /> Back to home
            </Link>
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4 rounded-2xl border border-success/30 bg-success/10 p-5">
        <CircleCheck aria-hidden className="size-8 shrink-0 text-success" />
        <div className="min-w-0 space-y-1">
          <p className="text-lg font-bold">Your trip is booked!</p>
          <p className="text-sm">
            Booking reference <strong className="tracking-wide">{booking.reference}</strong>
          </p>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <Mail aria-hidden className="size-4" /> Details are saved in your account and linked to{' '}
            {booking.contact.email}.
          </p>
        </div>
      </div>
      {demo && <DemoBanner service={service} />}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          disabled={!ticketsIssued || download.isPending}
          onClick={() => download.mutate()}
        >
          <Download aria-hidden /> {download.isPending ? 'Preparing…' : 'Download e-ticket'}
        </Button>
        {!ticketsIssued && (
          <span className="text-sm text-muted">
            Issuing tickets with the {service === 'bus' ? 'operator' : 'airline'}…
          </span>
        )}
        {booking.bus && confirmed && (
          <Button asChild size="lg" variant="outline">
            <Link to={`/buses/bookings/${encodeURIComponent(booking.reference)}/cancel`}>Cancel booking</Link>
          </Button>
        )}
      </div>
      {download.error && <FormAlert>{errorMessage(download.error)}</FormAlert>}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {booking.bus ? 'Operator PNR' : 'Airline PNR'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {booking.bus ? (
            <div className="rounded-xl border border-border px-4 py-2">
              <p className="text-xs text-muted">
                {booking.bus.offer.operator.name} · {booking.bus.offer.serviceNumber}
              </p>
              <p className="font-mono text-lg font-bold tracking-widest">
                {booking.bus.pnr ?? '·········'}
              </p>
            </div>
          ) : (
            booking.flights.map((f) => (
              <div key={f.sequence} className="rounded-xl border border-border px-4 py-2">
                <p className="text-xs text-muted">
                  {f.offer.from.code} → {f.offer.to.code} · {f.offer.flightNumber}
                </p>
                <p className="font-mono text-lg font-bold tracking-widest">{f.pnr ?? '······'}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <TripSummary booking={booking} detailed />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Travellers</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="divide-y divide-border text-sm">
            {booking.passengers.map((p) => {
              const tickets = p.seatNumber
                ? [`Seat ${p.seatNumber}`]
                : booking.flights
                    .map((f) => f.tickets.find((t) => t.passengerId === p.id)?.ticketNumber)
                    .filter(Boolean);
              return (
                <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span className="font-semibold">
                    {TITLE[p.title] ?? p.title} {p.firstName} {p.lastName}{' '}
                    <Badge variant="outline" className="ml-1">
                      {p.age !== null ? `${p.age} yrs` : p.type.toLowerCase()}
                    </Badge>
                  </span>
                  <span className="font-mono text-xs text-muted">
                    {tickets.join(' · ') || 'Ticket pending'}
                  </span>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </CheckoutShell>
  );
}
