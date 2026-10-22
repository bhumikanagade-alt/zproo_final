import { Button, Skeleton } from '@zproo/ui';
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { BikeCouponCard } from '@/features/bikes/components/BikeCouponCard';
import { useBikeCoupon } from '@/features/bikes/useBikeCoupon';
import { BikeBookingSteps } from '@/features/bikes/components/BikeBookingSteps';
import { PriceBreakdown } from '@/features/bikes/components/PriceBreakdown';
import { BikeMiniCard, RentalSummary, RiderDetails } from '@/features/bikes/components/RentalSummary';
import { Card, DemoNote, ErrorState, SectionTitle } from '@/features/bikes/components/ui';
import { useBike, useLocations } from '@/features/bikes/hooks';
import { bikeLinks } from '@/features/bikes/links';
import { computeQuote, rupees } from '@/features/bikes/pricing';
import { EXTRAS, REQUIRED_DOCUMENTS, RULES } from '@/features/bikes/rules';
import { useBikeStore } from '@/features/bikes/store';
import { BikeApiError } from '@/features/bikes/types';
import { validateCustomer, validateSchedule } from '@/features/bikes/validation';

/** Checkout step 2: booking summary and terms. Payment comes next. */
export default function BikeReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { search } = useLocation();
  const bikeQuery = useBike(id);
  const locationsQuery = useLocations();
  const { schedule, customer, extraIds, acceptedTerms, notes, setAcceptedTerms } = useBikeStore();
  const [termsError, setTermsError] = useState(false);
  const bike = bikeQuery.data;
  const locations = locationsQuery.data ?? [];

  const extras = useMemo(() => EXTRAS.filter((x) => extraIds.includes(x.id)), [extraIds]);
  const plainQuote = useMemo(() => (bike ? computeQuote({ bike, schedule, extras }) : null), [bike, schedule, extras]);
  const { coupon, problem: couponProblem } = useBikeCoupon(plainQuote?.total ?? 0);
  const quote = useMemo(() => (bike ? computeQuote({ bike, schedule, extras, coupon }) : null), [bike, schedule, extras, coupon]);

  if (bikeQuery.isPending) return <ReviewSkeleton />;
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

  // Reached without valid details (new tab, reload, edited URL): send the rider back to fill them in.
  const incomplete =
    !quote ||
    bike.availability.status === 'unavailable' ||
    Object.keys(validateSchedule(schedule, bike.pricing.minHours)).length > 0 ||
    Object.keys(validateCustomer(customer, true)).length > 0;
  if (incomplete) return <Navigate to={{ pathname: bikeLinks.book(bike.id), search }} replace />;

  const pickup = locations.find((l) => l.id === schedule.pickupLocationId);
  const returnLocation = locations.find((l) => l.id === schedule.returnLocationId);

  const continueToPayment = () => {
    if (!acceptedTerms) {
      setTermsError(true);
      window.setTimeout(() => document.getElementById('bike-terms')?.focus(), 0);
      return;
    }
    setTermsError(false);
    void navigate({ pathname: bikeLinks.payment(bike.id), search });
  };

  return (
    <div className="bg-background pb-28 lg:pb-16">
      <Seo title="Review your bike booking" noIndex />
      <div className="mx-auto max-w-[1200px] px-4 py-6">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
          <Link to={bikeLinks.home()} className="hover:text-foreground">Bikes</Link> <span aria-hidden>/</span>{' '}
          <Link to={bikeLinks.details(bike.id)} className="hover:text-foreground">{bike.name}</Link> <span aria-hidden>/</span>{' '}
          <span aria-current="page" className="text-foreground">Review</span>
        </nav>
        <BikeBookingSteps current={2} />
        <h1 className="mt-5 text-[28px] font-bold leading-9">Review your booking</h1>
        <p className="mt-1 text-sm text-muted">Check everything below, then continue to payment. This is a demo: nothing is reserved.</p>

        <div className="mt-6 lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-8">
          <div className="min-w-0 space-y-8">
            <section aria-labelledby="rental-h">
              <div className="mb-3 flex items-center justify-between gap-3">
                <SectionTitle id="rental-h">Your rental</SectionTitle>
                <Link to={{ pathname: bikeLinks.book(bike.id), search }} className="-mt-3 text-sm font-semibold text-primary hover:underline">Edit</Link>
              </div>
              <Card className="space-y-4">
                <BikeMiniCard bike={bike} />
                <RentalSummary schedule={schedule} pickup={pickup} returnLocation={returnLocation} extras={extras} />
              </Card>
            </section>

            <section aria-labelledby="rider-h">
              <div className="mb-3 flex items-center justify-between gap-3">
                <SectionTitle id="rider-h">Rider details</SectionTitle>
                <Link to={{ pathname: bikeLinks.book(bike.id), search }} className="-mt-3 text-sm font-semibold text-primary hover:underline">Edit</Link>
              </div>
              <Card className="space-y-3">
                <RiderDetails customer={customer} />
                {notes.trim() && (
                  <p className="border-t border-border pt-3 text-sm"><span className="font-semibold">Notes: </span><span className="text-muted">{notes.trim()}</span></p>
                )}
              </Card>
            </section>

            <section aria-labelledby="policy-h" className="grid gap-4 md:grid-cols-2">
              <h2 id="policy-h" className="sr-only">Policies and documents</h2>
              <Card>
                <h3 className="flex items-center gap-2 font-bold"><ShieldCheck aria-hidden className="size-4 text-primary" />Deposit &amp; policies</h3>
                <ul className="mt-2 space-y-2 text-sm text-muted">
                  <li><strong className="text-foreground">{rupees(bike.securityDeposit)}</strong> refundable security deposit, collected at pickup.</li>
                  <li>{bike.fuelPolicy}</li>
                  <li>{RULES.cancellation}</li>
                </ul>
              </Card>
              <Card>
                <h3 className="font-bold">Carry at pickup</h3>
                <ul className="mt-2 space-y-2 text-sm text-muted">
                  {REQUIRED_DOCUMENTS.map((d) => <li key={d}>• {d}</li>)}
                </ul>
              </Card>
            </section>
          </div>

          <aside aria-label="Price summary" className="mt-8 lg:sticky lg:top-24 lg:mt-0">
            <Card className="space-y-4 shadow-lg">
              <h2 className="text-lg font-bold">Price summary</h2>
              {quote && <BikeCouponCard grossTotal={plainQuote?.total ?? 0} discount={quote.couponDiscount ?? 0} problem={couponProblem} idPrefix="review-cpn" />}
              {quote && <PriceBreakdown quote={quote} />}

              <div>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    id="bike-terms"
                    type="checkbox"
                    checked={acceptedTerms}
                    aria-invalid={termsError && !acceptedTerms ? true : undefined}
                    onChange={(e) => { setAcceptedTerms(e.target.checked); if (e.target.checked) setTermsError(false); }}
                    className="mt-0.5 size-4 shrink-0 accent-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
                  />
                  <span>I confirm the details above are correct and agree to the rental terms, fuel policy and cancellation policy.</span>
                </label>
                {termsError && !acceptedTerms && <p role="alert" className="mt-1 text-xs text-danger">Please accept the rental terms to continue.</p>}
              </div>

              <Button size="lg" className="w-full" onClick={continueToPayment}>
                Continue to payment <ArrowRight aria-hidden />
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to={{ pathname: bikeLinks.book(bike.id), search }}><ArrowLeft aria-hidden /> Back to details</Link>
              </Button>
              <DemoNote />
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <div role="status" aria-label="Loading booking summary" className="mx-auto max-w-[1200px] px-4 py-6">
      <span className="sr-only">Loading…</span>
      <Skeleton className="mb-4 h-4 w-40" />
      <Skeleton className="mb-6 h-8 w-64" />
      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8">
        <div className="space-y-4">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="mt-6 h-96 w-full lg:mt-0" />
      </div>
    </div>
  );
}
