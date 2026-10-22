import { useMutation } from '@tanstack/react-query';
import type { FlightOffer } from '@zproo/types';
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@zproo/ui';
import type { FlightAddOnsSelection } from '@zproo/types';
import type { PassengerInput } from '@zproo/validation';
import { flightPriceBreakdown } from '@zproo/utils';
import {
  addOnKey,
  addOnsTotals,
  findBaggage,
  findMeal,
  flightSectors,
  validateAddOns,
} from '@zproo/utils';
import { ArrowRight, Lock, Mail, Phone } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { errorMessage } from '@/features/auth/errors';
import { couponErrorMessage } from '@/features/coupons/api';
import { flightsApi, useItineraryOffers } from '@/features/flights/api';
import { FlightCouponCard } from '@/features/flights/components/FlightCouponCard';
import { useFlightCoupon } from '@/features/flights/useFlightCoupon';
import { CheckoutShell, NothingSelected } from '@/features/checkout/CheckoutShell';
import { DemoBanner } from '@/features/checkout/DemoBanner';
import { ItinerarySummary } from '@/features/flights/components/ItinerarySummary';
import { PriceSummary } from '@/features/checkout/PriceSummary';
import { useFlightDraft } from '@/features/flights/draft';
import { inr } from '@/features/flights/format';
import { paymentUrl } from '@/features/checkout/links';
import { CHECKOUT_STEP } from '@/features/checkout/steps';
import { ApiClientError } from '@/services/http';

const TITLE = { MR: 'Mr', MRS: 'Mrs', MS: 'Ms', MSTR: 'Master', MISS: 'Miss' } as const;

export default function FlightReviewPage() {
  const draft = useFlightDraft();
  if (!draft.itinerary) return <NothingSelected />;
  if (!draft.passengers || !draft.contact) return <Navigate to="/flights/booking" replace />;
  return <Review />;
}

function Review() {
  const navigate = useNavigate();
  const draft = useFlightDraft();
  const itinerary = draft.itinerary as NonNullable<typeof draft.itinerary>;
  const passengers = draft.passengers ?? [];
  const contact = draft.contact as NonNullable<typeof draft.contact>;
  const {
    offers,
    isPending,
    error: offersError,
    refetch,
  } = useItineraryOffers(itinerary.offerIds, itinerary.pax);
  const [unavailable, setUnavailable] = useState(false);
  // Paid extras (seats, meals, baggage) sit on top of the fare the customer first saw.
  const extras = offers ? addOnsTotals(offers, draft.addOns).totalPaise : 0;
  const addOnIssues = offers ? validateAddOns(offers, passengers, draft.addOns) : [];
  // A coupon made in the admin panel comes off the whole total (extras included); the server re-checks it
  // against the current total, so one that expired or was switched off stops applying and says why.
  const breakdown = offers ? flightPriceBreakdown(offers, itinerary.pax, draft.addOns) : null;
  const grossPaise = breakdown?.totalPaise ?? 0;
  const coupon = useFlightCoupon(grossPaise);

  const book = useMutation({
    mutationFn: () =>
      flightsApi.book(
        {
          offerIds: itinerary.offerIds,
          passengers,
          contact,
          addOns: draft.addOns,
          ...(coupon.promoCode ? { promoCode: coupon.promoCode } : {}),
          expectedTotalPaise: itinerary.expectedTotalPaise + extras - coupon.discountPaise,
        },
        draft.idempotencyKey,
      ),
    onSuccess: (booking) => {
      draft.setReference(booking.reference);
      void navigate(paymentUrl('flight', booking.reference));
    },
    onError: (err) => {
      // The server refused the coupon (expired, used up…): drop it so the next try is at the plain fare.
      if (err instanceof ApiClientError && err.details.some((d) => d.path === 'body.promoCode')) draft.setPromo(null);
      if (err instanceof ApiClientError && err.errorCode === 'PRICE_CHANGED') void refetch();
      if (
        err instanceof ApiClientError &&
        (err.errorCode === 'SOLD_OUT' || err.errorCode === 'OFFER_EXPIRED')
      ) {
        setUnavailable(true);
      }
    },
  });

  const currentTotal = offers?.reduce((sum, o) => sum + o.totalPaise, 0);
  const priceMoved = currentTotal !== undefined && currentTotal !== itinerary.expectedTotalPaise;
  const couponRefused =
    book.error instanceof ApiClientError && book.error.details.some((d) => d.path === 'body.promoCode')
      ? couponErrorMessage(book.error)
      : null;
  const bookingError =
    couponRefused || (book.error instanceof ApiClientError && book.error.errorCode === 'PRICE_CHANGED')
      ? null
      : book.error;

  const continueToPayment = () => {
    // Already booked from this draft (e.g. came back from payment): don't book again.
    if (draft.reference) return void navigate(paymentUrl('flight', draft.reference));
    book.mutate();
  };

  return (
    <CheckoutShell
      step={CHECKOUT_STEP.flight.review}
      title="Review your booking"
      back={{ to: '/flights/baggage', label: 'Back to baggage' }}
      aside={
        offers && breakdown ? (
          <>
            <PriceSummary
              price={{
                ...breakdown,
                discountPaise: coupon.discountPaise,
                totalPaise: breakdown.totalPaise - coupon.discountPaise,
              }}
            />
            {priceMoved ? (
              <PriceChanged
                from={itinerary.expectedTotalPaise}
                to={currentTotal}
                onAccept={() => {
                  draft.acceptPrice(currentTotal);
                  book.reset();
                }}
              />
            ) : (
              <Button
                size="lg"
                className="w-full"
                disabled={book.isPending || unavailable || addOnIssues.length > 0}
                onClick={continueToPayment}
              >
                <Lock aria-hidden />{' '}
                {book.isPending ? 'Holding your seats…' : 'Continue to payment'}
                {!book.isPending && <ArrowRight aria-hidden />}
              </Button>
            )}
            <p className="text-center text-xs text-muted">
              By continuing you agree to the fare rules, our{' '}
              <Link to="/terms" className="underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link to="/refund-policy" className="underline">
                Refund Policy
              </Link>
              .
            </p>
          </>
        ) : (
          <Skeleton className="h-64 rounded-2xl" />
        )
      }
    >
      {offers?.some((o) => o.provider === 'mock') && <DemoBanner />}
      {unavailable && (
        <FormAlert>
          {errorMessage(book.error)}{' '}
          <Link to={itinerary.searchUrl} className="underline">
            Choose another flight
          </Link>
        </FormAlert>
      )}
      {addOnIssues.length > 0 && (
        <FormAlert>
          {addOnIssues[0]?.message}.{' '}
          <Link to="/flights/seats" className="underline">
            Update your seats, meals or baggage
          </Link>
        </FormAlert>
      )}
      {couponRefused && !unavailable && (
        <FormAlert>{couponRefused} The total shown is without the coupon.</FormAlert>
      )}
      {bookingError && !unavailable && <FormAlert>{errorMessage(bookingError)}</FormAlert>}
      {offersError && !unavailable && (
        <FormAlert>
          {errorMessage(offersError)}{' '}
          <Link to={itinerary.searchUrl} className="underline">
            Choose another flight
          </Link>
        </FormAlert>
      )}

      <section aria-labelledby="itinerary-heading" className="space-y-3">
        <h2 id="itinerary-heading" className="text-lg font-bold">
          Itinerary
        </h2>
        {isPending || !offers ? (
          <Skeleton className="h-48 rounded-2xl" />
        ) : (
          <ItinerarySummary offers={offers as FlightOffer[]} detailed />
        )}
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Travellers</CardTitle>
          <Link
            to="/flights/booking"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Edit
          </Link>
        </CardHeader>
        <CardContent>
          <ol className="divide-y divide-border text-sm">
            {passengers.map((p, i) => (
              <li key={i} className="flex justify-between gap-3 py-2">
                <span className="font-semibold">
                  {TITLE[p.title]} {p.firstName} {p.lastName}
                </span>
                <span className="text-muted">
                  {p.type.charAt(0) + p.type.slice(1).toLowerCase()}
                  {p.dateOfBirth && ` · born ${p.dateOfBirth}`}
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-4 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Mail aria-hidden className="size-4" /> {contact.email}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Phone aria-hidden className="size-4" /> +91 {contact.phone.replace(/^\+91/, '')}
            </span>
          </div>
        </CardContent>
      </Card>

      {offers && <AddOnsReview offers={offers} passengers={passengers} addOns={draft.addOns} />}

      {offers && (
        <FlightCouponCard
          grossPaise={grossPaise}
          discountPaise={coupon.discountPaise}
          problem={coupon.problem}
        />
      )}
    </CheckoutShell>
  );
}

/** What was added on the seat, meal and baggage pages, per traveller. */
function AddOnsReview({
  offers,
  passengers,
  addOns,
}: {
  offers: FlightOffer[];
  passengers: PassengerInput[];
  addOns: FlightAddOnsSelection;
}) {
  const sectors = flightSectors(offers);
  const totals = addOnsTotals(offers, addOns);
  const any = totals.seatCount + totals.mealCount + totals.baggageCount > 0;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Seats, meals &amp; baggage</CardTitle>
        <Link to="/flights/seats" className="text-sm font-semibold text-primary hover:underline">
          {any ? 'Edit' : 'Add'}
        </Link>
      </CardHeader>
      <CardContent>
        {!any ? (
          <p className="text-sm text-muted">
            Nothing added. You can still pick seats, meals or extra baggage — it&apos;s cheaper than
            at the airport.
          </p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {passengers.map((p, i) => {
              if (p.type === 'INFANT') return null;
              const rows: [string, string][] = [];
              for (const sector of sectors) {
                const seat = addOns.seats[addOnKey(sector.key, i)];
                const meal = findMeal(addOns.meals[addOnKey(sector.key, i)] ?? '');
                const parts = [seat && `Seat ${seat}`, meal?.name].filter(Boolean);
                if (parts.length > 0)
                  rows.push([`${sector.from.code} → ${sector.to.code}`, parts.join(' · ')]);
              }
              offers.forEach((o, leg) => {
                const bag = findBaggage(addOns.baggage[addOnKey(leg, i)] ?? '');
                if (bag) rows.push([`${o.from.code} → ${o.to.code}`, `Extra baggage +${bag.kg} kg`]);
              });
              if (rows.length === 0) return null;
              return (
                <li key={i} className="py-3 first:pt-0 last:pb-0">
                  <p className="font-semibold">
                    {TITLE[p.title]} {p.firstName} {p.lastName}
                  </p>
                  <dl className="mt-1.5 space-y-1 text-muted">
                    {rows.map(([route, what], k) => (
                      <div key={k} className="flex flex-wrap gap-x-3">
                        <dt className="font-medium text-foreground/70">{route}</dt>
                        <dd>{what}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PriceChanged({ from, to, onAccept }: { from: number; to: number; onAccept: () => void }) {
  return (
    <div
      role="alert"
      className="space-y-3 rounded-2xl border border-warning/50 bg-warning/10 p-4 text-sm"
    >
      <p>
        <strong>The fare has changed</strong> from {inr(from)} to {inr(to)} since you selected it.
      </p>
      <Button className="w-full" onClick={onAccept}>
        Continue with {inr(to)}
      </Button>
    </div>
  );
}
