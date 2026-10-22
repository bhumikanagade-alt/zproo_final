import { Button, Skeleton } from '@zproo/ui';
import { ArrowLeft, Loader2, Lock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { BikeCouponCard } from '@/features/bikes/components/BikeCouponCard';
import { useBikeCoupon } from '@/features/bikes/useBikeCoupon';
import { BikeBookingSteps } from '@/features/bikes/components/BikeBookingSteps';
import { PaymentDetailsForm, PaymentMethodPicker } from '@/features/bikes/components/PaymentFields';
import { PriceBreakdown } from '@/features/bikes/components/PriceBreakdown';
import { BikeMiniCard } from '@/features/bikes/components/RentalSummary';
import { Card, DemoNote, ErrorState, SectionTitle } from '@/features/bikes/components/ui';
import { useBike, useCreateBooking, useLocations } from '@/features/bikes/hooks';
import { bikeLinks } from '@/features/bikes/links';
import { amountDueNow, computeQuote, rupees } from '@/features/bikes/pricing';
import { EXTRAS } from '@/features/bikes/rules';
import { useBikeStore } from '@/features/bikes/store';
import { BikeApiError } from '@/features/bikes/types';
import { emptyPayment, isDemoDecline, validateCustomer, validatePayment, validateSchedule, type PaymentFields } from '@/features/bikes/validation';

/** Checkout step 3: demo payment. No real payment is processed; entered details never leave this page. */
export default function BikePaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { search } = useLocation();
  const bikeQuery = useBike(id);
  useLocations(); // warms the cache used by the confirmation page
  const { schedule, customer, extraIds, notes, acceptedTerms, paymentMethod, setPaymentMethod, saveBooking, setCoupon } = useBikeStore();
  const booking = useCreateBooking();
  const [fields, setFields] = useState<PaymentFields>({ ...emptyPayment });
  const [submitted, setSubmitted] = useState(false);
  const bike = bikeQuery.data;

  const extras = useMemo(() => EXTRAS.filter((x) => extraIds.includes(x.id)), [extraIds]);
  const plainQuote = useMemo(() => (bike ? computeQuote({ bike, schedule, extras }) : null), [bike, schedule, extras]);
  const { coupon, problem: couponProblem } = useBikeCoupon(plainQuote?.total ?? 0);
  const quote = useMemo(() => (bike ? computeQuote({ bike, schedule, extras, coupon }) : null), [bike, schedule, extras, coupon]);
  const errors = useMemo(() => (submitted ? validatePayment(paymentMethod, fields) : {}), [submitted, paymentMethod, fields]);

  if (bikeQuery.isPending) return <PaymentSkeleton />;
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

  // Direct visits (reload, new tab) go back to whichever earlier step is missing.
  const detailsIncomplete =
    !quote ||
    bike.availability.status === 'unavailable' ||
    Object.keys(validateSchedule(schedule, bike.pricing.minHours)).length > 0 ||
    Object.keys(validateCustomer(customer, true)).length > 0;
  if (detailsIncomplete) return <Navigate to={{ pathname: bikeLinks.book(bike.id), search }} replace />;
  if (!acceptedTerms) return <Navigate to={{ pathname: bikeLinks.review(bike.id), search }} replace />;

  const due = amountDueNow(paymentMethod, quote);
  const payLabel = due > 0 ? `Pay ${rupees(due)} (demo)` : 'Confirm booking (demo)';

  const pay = () => {
    setSubmitted(true);
    if (Object.keys(validatePayment(paymentMethod, fields)).length) {
      window.setTimeout(() => (document.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus(), 0);
      return;
    }
    booking.mutate(
      { bikeId: bike.id, schedule, extraIds, customer, notes, acceptedTerms, payment: { method: paymentMethod, simulateDecline: isDemoDecline(paymentMethod, fields) }, coupon: coupon ? { code: coupon.code } : null },
      {
        onSuccess: (b) => {
          saveBooking(b);
          void navigate(bikeLinks.confirmation(b.reference), { replace: true });
        },
        // Expired, used up, switched off… The coupon is dropped and the rider sees the new total before paying again.
        onError: (e) => {
          if (e instanceof BikeApiError && e.code === 'COUPON_INVALID') setCoupon(null);
        },
      },
    );
  };

  const declined = booking.error instanceof BikeApiError && booking.error.code === 'PAYMENT_DECLINED';
  const couponRefused = booking.error instanceof BikeApiError && booking.error.code === 'COUPON_INVALID';
  const failedMessage = booking.error instanceof Error
    ? couponRefused ? `${booking.error.message} The coupon was removed, so the total has changed. Please check it and pay again.` : booking.error.message
    : 'Something went wrong while processing your payment.';

  return (
    <div className="bg-background pb-28 lg:pb-16">
      <Seo title="Bike booking payment" noIndex />
      <div className="mx-auto max-w-[1200px] px-4 py-6">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
          <Link to={bikeLinks.home()} className="hover:text-foreground">Bikes</Link> <span aria-hidden>/</span>{' '}
          <Link to={bikeLinks.details(bike.id)} className="hover:text-foreground">{bike.name}</Link> <span aria-hidden>/</span>{' '}
          <span aria-current="page" className="text-foreground">Payment</span>
        </nav>
        <BikeBookingSteps current={3} />
        <h1 className="mt-5 text-[28px] font-bold leading-9">Payment</h1>
        <p className="mt-1 text-sm text-muted">Choose how you would like to pay. This is a demo: no real payment is processed.</p>

        <div className="mt-6 lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-8">
          <div className="min-w-0 space-y-8">
            <section aria-labelledby="method-h">
              <SectionTitle id="method-h">Payment method</SectionTitle>
              <PaymentMethodPicker value={paymentMethod} onChange={(m) => { setPaymentMethod(m); setSubmitted(false); booking.reset(); }} />
            </section>

            <section aria-labelledby="details-h">
              <SectionTitle id="details-h">Payment details</SectionTitle>
              <Card className="space-y-4">
                <PaymentDetailsForm method={paymentMethod} fields={fields} errors={errors} onChange={(p) => setFields((f) => ({ ...f, ...p }))} />
                <p className="flex items-center gap-2 text-xs text-muted"><Lock aria-hidden className="size-3.5" />Details you enter are checked in your browser only. They are never saved or sent anywhere.</p>
              </Card>
            </section>
          </div>

          <aside aria-label="Payment summary" className="mt-8 lg:sticky lg:top-24 lg:mt-0">
            <Card className="space-y-4 shadow-lg">
              <BikeMiniCard bike={bike} />
              <BikeCouponCard grossTotal={plainQuote?.total ?? 0} discount={quote?.couponDiscount ?? 0} problem={couponProblem} idPrefix="pay-cpn" />
              <PriceBreakdown quote={quote} />
              <div className="flex justify-between gap-4 border-t border-border pt-3 text-base font-bold">
                <span>Payable now</span>
                <span className="text-[22px] leading-7" data-testid="bike-pay-now">{rupees(due)}</span>
              </div>

              {booking.isError && (
                <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                  <p className="font-semibold">{declined ? 'Payment declined' : couponRefused ? 'Coupon no longer valid' : 'Payment could not be completed'}</p>
                  <p className="mt-0.5 text-xs">{failedMessage}</p>
                </div>
              )}

              <Button size="lg" className="hidden w-full lg:inline-flex" onClick={pay} disabled={booking.isPending}>
                {booking.isPending ? <><Loader2 aria-hidden className="animate-spin" /> Processing…</> : booking.isError ? `Try again · ${payLabel}` : payLabel}
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to={{ pathname: bikeLinks.review(bike.id), search }}><ArrowLeft aria-hidden /> Back to review</Link>
              </Button>
              <DemoNote><strong>Demo payment.</strong> No real money is charged and no bike is reserved. The refundable deposit is shown for information only and is collected at the hub.</DemoNote>
            </Card>
          </aside>
        </div>
      </div>

      {/* Mobile: keep the pay button reachable. */}
      <div className="fixed inset-x-0 bottom-[var(--bottom-nav-height)] z-30 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
        <div>
          <p className="text-xs text-muted">Payable now</p>
          <p className="text-lg font-bold leading-5">{rupees(due)}</p>
        </div>
        <Button onClick={pay} disabled={booking.isPending}>
          {booking.isPending ? <><Loader2 aria-hidden className="animate-spin" /> Processing…</> : booking.isError ? 'Try again' : due > 0 ? 'Pay (demo)' : 'Confirm (demo)'}
        </Button>
      </div>
    </div>
  );
}

function PaymentSkeleton() {
  return (
    <div role="status" aria-label="Loading payment" className="mx-auto max-w-[1200px] px-4 py-6">
      <span className="sr-only">Loading…</span>
      <Skeleton className="mb-4 h-4 w-40" />
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
        <Skeleton className="mt-6 h-96 w-full lg:mt-0" />
      </div>
    </div>
  );
}
