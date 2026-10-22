import { Button, Skeleton } from '@zproo/ui';
import { ArrowRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { BikeBookingSteps } from '@/features/bikes/components/BikeBookingSteps';
import { CustomerForm } from '@/features/bikes/components/CustomerForm';
import { ExtrasPicker } from '@/features/bikes/components/ExtrasPicker';
import { PriceBreakdown } from '@/features/bikes/components/PriceBreakdown';
import { BikeMiniCard } from '@/features/bikes/components/RentalSummary';
import { ScheduleFields } from '@/features/bikes/components/ScheduleFields';
import { Card, DemoNote, ErrorState, SectionTitle } from '@/features/bikes/components/ui';
import { useBike, useLocations } from '@/features/bikes/hooks';
import { bikeLinks } from '@/features/bikes/links';
import { computeQuote, rupees } from '@/features/bikes/pricing';
import { EXTRAS } from '@/features/bikes/rules';
import { useBikeStore } from '@/features/bikes/store';
import { BikeApiError } from '@/features/bikes/types';
import { validateCustomer, validateSchedule, type Errors, type ScheduleKey } from '@/features/bikes/validation';

/** Checkout step 1: rental dates and hubs, optional add-ons and rider details. */
export default function BikeBookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { search } = useLocation(); // kept across steps so ?mockError=… keeps working
  const bikeQuery = useBike(id);
  const locationsQuery = useLocations();
  const { schedule, patchSchedule, customer, patchCustomer, extraIds, toggleExtra, notes, setNotes, ensureFreshSchedule } = useBikeStore();
  const [submitted, setSubmitted] = useState(false);
  const bike = bikeQuery.data;
  const locations = locationsQuery.data ?? [];

  useEffect(() => {
    ensureFreshSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The city comes from the search step; the area is chosen here. Drop an area this bike is not stocked at.
  useEffect(() => {
    if (!bike || !schedule.pickupLocationId) return;
    if (!bike.availability.locationIds.includes(schedule.pickupLocationId)) {
      patchSchedule({ pickupLocationId: '', returnLocationId: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bike?.id]);

  const extras = useMemo(() => EXTRAS.filter((x) => extraIds.includes(x.id)), [extraIds]);
  const quote = useMemo(() => (bike ? computeQuote({ bike, schedule, extras }) : null), [bike, schedule, extras]);

  const scheduleErrors = useMemo<Errors<ScheduleKey>>(() => (bike && submitted ? validateSchedule(schedule, bike.pricing.minHours) : {}), [bike, schedule, submitted]);
  const customerErrors = useMemo(() => (submitted ? validateCustomer(customer, true) : {}), [customer, submitted]);
  const hasErrors = Object.keys(scheduleErrors).length > 0 || Object.keys(customerErrors).length > 0;

  if (bikeQuery.isPending) return <BookingSkeleton />;
  if (bikeQuery.isError || !bike) {
    const notFound = bikeQuery.error instanceof BikeApiError && bikeQuery.error.code === 'NOT_FOUND';
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-16">
        <Seo title="Bike not found" noIndex />
        <ErrorState
          title={notFound ? 'Bike not found' : "We couldn't load this bike"}
          message={bikeQuery.error instanceof Error ? bikeQuery.error.message : 'Please try again.'}
          {...(notFound ? {} : { onRetry: () => void bikeQuery.refetch() })}
          backTo={{ to: bikeLinks.results(), label: 'Browse all bikes' }}
        />
      </div>
    );
  }
  if (bike.availability.status === 'unavailable') {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-16">
        <Seo title="Bike not available" noIndex />
        <ErrorState title="This bike is not available" message="It cannot be booked right now. Please choose another bike." backTo={{ to: bikeLinks.results(), label: 'See other bikes' }} />
      </div>
    );
  }

  const continueToReview = () => {
    setSubmitted(true);
    const sErr = validateSchedule(schedule, bike.pricing.minHours);
    const cErr = validateCustomer(customer, true);
    if (Object.keys(sErr).length || Object.keys(cErr).length) {
      window.setTimeout(() => (document.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus(), 0);
      return;
    }
    void navigate({ pathname: bikeLinks.review(bike.id), search });
  };

  return (
    <div className="bg-background pb-28 lg:pb-16">
      <Seo title={`Book ${bike.name}`} noIndex />
      <div className="mx-auto max-w-[1200px] px-4 py-6">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
          <Link to={bikeLinks.home()} className="hover:text-foreground">Bikes</Link> <span aria-hidden>/</span>{' '}
          <Link to={bikeLinks.details(bike.id)} className="hover:text-foreground">{bike.name}</Link> <span aria-hidden>/</span>{' '}
          <span aria-current="page" className="text-foreground">Book</span>
        </nav>
        <BikeBookingSteps current={1} />
        <h1 className="mt-5 text-[28px] font-bold leading-9">Rental details</h1>
        <p className="mt-1 text-sm text-muted">Choose your pickup area in your city and your times, add any extras, then tell us who is riding.</p>

        {submitted && hasErrors && (
          <div role="alert" className="mt-5 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            Please fix the highlighted fields to continue.
          </div>
        )}

        <div className="mt-6 lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-8">
          <div className="min-w-0 space-y-8">
            <section aria-labelledby="when-h">
              <SectionTitle id="when-h">Pickup city, area &amp; time</SectionTitle>
              <Card>
                <ScheduleFields mode="areas" schedule={schedule} locations={locations} onChange={patchSchedule} errors={scheduleErrors} allowedPickupIds={bike.availability.locationIds} />
              </Card>
            </section>

            <section aria-labelledby="extras-h">
              <SectionTitle id="extras-h">Add-ons <span className="text-sm font-normal text-muted">(optional)</span></SectionTitle>
              <ExtrasPicker selectedIds={extraIds} onToggle={toggleExtra} />
            </section>

            <section aria-labelledby="rider-h">
              <SectionTitle id="rider-h">Rider details</SectionTitle>
              <Card className="space-y-4">
                <CustomerForm customer={customer} errors={customerErrors} onChange={patchCustomer} />
                <div>
                  <label htmlFor="bike-notes" className="mb-1 block text-xs font-medium text-muted">Notes for the hub <span className="font-normal">(optional)</span></label>
                  <textarea
                    id="bike-notes"
                    value={notes}
                    maxLength={300}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Arriving by the 9:40 am train"
                    className="min-h-[72px] w-full resize-y rounded-lg border border-border bg-card px-3 py-2.5 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
                  />
                  <p className="mt-1 text-right text-xs text-muted">{notes.length}/300</p>
                </div>
              </Card>
              <p className="mt-3 text-xs text-muted">Your details stay in this browser session only and are not sent anywhere.</p>
            </section>
          </div>

          <aside aria-label="Booking summary" className="mt-8 lg:sticky lg:top-24 lg:mt-0">
            <Card className="space-y-4 shadow-lg">
              <BikeMiniCard bike={bike} />
              {quote ? (
                <PriceBreakdown quote={quote} />
              ) : (
                <p role="status" className="rounded-lg bg-neutral-100 px-3 py-2 text-sm text-muted">Choose valid pickup and return times to see your estimated charges.</p>
              )}
              <Button size="lg" className="hidden w-full lg:inline-flex" onClick={continueToReview}>
                Continue to review <ArrowRight aria-hidden />
              </Button>
              <DemoNote />
            </Card>
          </aside>
        </div>
      </div>

      {/* Mobile: keep the call to action reachable while scrolling the long form. */}
      <div className="fixed inset-x-0 bottom-[var(--bottom-nav-height)] z-30 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
        <div>
          <p className="text-xs text-muted">Estimated total</p>
          <p className="text-lg font-bold leading-5">{quote ? rupees(quote.total) : '—'}</p>
        </div>
        <Button onClick={continueToReview}>Continue <ArrowRight aria-hidden /></Button>
      </div>
    </div>
  );
}

function BookingSkeleton() {
  return (
    <div role="status" aria-label="Loading booking form" className="mx-auto max-w-[1200px] px-4 py-6">
      <span className="sr-only">Loading…</span>
      <Skeleton className="mb-4 h-4 w-40" />
      <Skeleton className="mb-6 h-8 w-64" />
      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8">
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="mt-6 h-96 w-full lg:mt-0" />
      </div>
    </div>
  );
}
