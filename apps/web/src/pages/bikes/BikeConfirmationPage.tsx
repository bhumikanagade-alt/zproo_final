import { Button } from '@zproo/ui';
import { CalendarClock, ListChecks, MapPin, Printer } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { BikeBookingSteps } from '@/features/bikes/components/BikeBookingSteps';
import { PriceBreakdown } from '@/features/bikes/components/PriceBreakdown';
import { BikeMiniCard, RentalSummary, RiderDetails } from '@/features/bikes/components/RentalSummary';
import { SuccessCheck } from '@/features/bikes/components/SuccessCheck';
import { Card, ErrorState, SectionTitle } from '@/features/bikes/components/ui';
import { formatDateTime, parseLocal } from '@/features/bikes/dates';
import { bikeLinks } from '@/features/bikes/links';
import { rupees } from '@/features/bikes/pricing';
import { REQUIRED_DOCUMENTS, RULES } from '@/features/bikes/rules';
import { useBikeStore } from '@/features/bikes/store';

/** Checkout step 4: booking confirmation with an animated green check. */
export default function BikeConfirmationPage() {
  const { ref } = useParams();
  const booking = useBikeStore((s) => s.bookings.find((b) => b.reference === ref));
  const resetBookingDraft = useBikeStore((s) => s.resetBookingDraft);

  // The booking is saved, so the checkout form can be cleared for the next rental.
  useEffect(() => {
    if (booking) resetBookingDraft();
  }, [booking, resetBookingDraft]);

  if (!booking) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-16">
        <Seo title="Booking not found" noIndex />
        <ErrorState
          title="We couldn't find this booking"
          message="Bookings are only kept on the device they were made on. Start a new booking to try again."
          backTo={{ to: bikeLinks.results(), label: 'Browse bikes' }}
        />
      </div>
    );
  }

  const { bike, quote, request, pickup, returnLocation, extras, payment } = booking;
  const paidNow = payment?.status === 'demo-paid';
  const pickupAt = parseLocal(request.schedule.pickupDate, request.schedule.pickupTime);

  return (
    <div className="bg-background pb-16 print:bg-white">
      <Seo title={`Booking ${booking.reference}`} noIndex />
      <div className="mx-auto max-w-[900px] px-4 py-6">
        <div className="print:hidden"><BikeBookingSteps current={4} /></div>

        <header className="mt-6 overflow-hidden rounded-2xl border border-success/30 bg-gradient-to-b from-success/10 to-card text-center shadow-card">
          <div className="flex flex-col items-center px-6 pb-6 pt-9">
            <SuccessCheck />
            <h1 className="bike-rise mt-5 text-[28px] font-bold leading-9" style={{ animationDelay: '0.7s' }}>Booking confirmed!</h1>
            <p className="bike-rise mt-1 text-sm text-muted" style={{ animationDelay: '0.85s' }}>
              {paidNow ? `We received your payment of ${rupees(payment.amountPaid)}. ` : ''}Your {bike.name} is booked. See you at the hub!
            </p>
            <div className="bike-rise mt-5 rounded-xl border border-border bg-card px-6 py-3" style={{ animationDelay: '1s' }}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Booking reference</p>
              <p className="text-2xl font-bold tracking-widest" data-testid="bike-booking-ref">{booking.reference}</p>
            </div>
            <p className="mt-2 text-xs text-muted">Booked on {new Date(booking.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
          </div>
          <dl className="bike-rise grid divide-y divide-border border-t border-border bg-card text-left text-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0" style={{ animationDelay: '1.1s' }}>
            <div className="flex items-start gap-2 px-5 py-3">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
              <div>
                <dt className="text-xs font-medium text-muted">Pickup</dt>
                <dd className="font-semibold">{pickup.area}{pickup.city ? `, ${pickup.city}` : ''}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2 px-5 py-3">
              <CalendarClock aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
              <div>
                <dt className="text-xs font-medium text-muted">Pickup time</dt>
                <dd className="font-semibold">{pickupAt ? formatDateTime(pickupAt) : '—'}</dd>
              </div>
            </div>
            <div className="px-5 py-3">
              <dt className="text-xs font-medium text-muted">Estimated total</dt>
              <dd className="font-semibold">{rupees(quote.total)}</dd>
            </div>
          </dl>
        </header>

        <div className="mt-8 space-y-8">
          <section aria-labelledby="rental-h">
            <SectionTitle id="rental-h">Rental summary</SectionTitle>
            <Card className="space-y-4">
              <BikeMiniCard bike={bike} />
              <RentalSummary schedule={request.schedule} pickup={pickup} returnLocation={returnLocation} extras={extras} />
            </Card>
          </section>

          <section aria-labelledby="rider-h">
            <SectionTitle id="rider-h">Rider details</SectionTitle>
            <Card><RiderDetails customer={request.customer} maskId /></Card>
          </section>

          <section aria-labelledby="charges-h" className="grid gap-4 md:grid-cols-2">
            <div>
              <SectionTitle id="charges-h">Estimated charges</SectionTitle>
              <Card><PriceBreakdown quote={quote} /></Card>
            </div>
            <div>
              <SectionTitle>Payment &amp; pickup</SectionTitle>
              <Card className="space-y-3 text-sm">
                <p>
                  <span className="text-muted">Payment: </span>
                  <strong>{payment ? payment.label : '—'}</strong>
                  {payment && <span className="text-muted"> · {paidNow ? `${rupees(payment.amountPaid)} paid` : `${rupees(quote.total)} to pay at pickup`}</span>}
                </p>
                <p><strong>{rupees(bike.securityDeposit)}</strong> <span className="text-muted">refundable security deposit is collected at the hub.</span></p>
                <ul className="space-y-1.5 text-muted">
                  {REQUIRED_DOCUMENTS.map((d) => <li key={d}>• {d}</li>)}
                </ul>
                <p className="text-muted">{RULES.cancellation}</p>
              </Card>
            </div>
          </section>
          <div className="flex flex-wrap gap-3 print:hidden">
            <Button onClick={() => window.print()}><Printer aria-hidden /> Print / Save as PDF</Button>
            <Button asChild variant="outline"><Link to={bikeLinks.bookings()}><ListChecks aria-hidden /> My bike bookings</Link></Button>
            <Button asChild variant="outline"><Link to={bikeLinks.results()}>Browse more bikes</Link></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
