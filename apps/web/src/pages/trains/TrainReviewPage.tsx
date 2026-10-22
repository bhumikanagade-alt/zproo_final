import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@zproo/ui';
import { AlertTriangle, Lock, Pencil } from 'lucide-react';
import { useMemo } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { errorMessage } from '@/features/auth/errors';
import { CheckoutShell, NothingSelected } from '@/features/checkout/CheckoutShell';
import { DemoBanner } from '@/features/checkout/DemoBanner';
import { paymentUrl } from '@/features/checkout/links';
import { PriceSummary } from '@/features/checkout/PriceSummary';
import { inr, travelDate } from '@/features/flights/format';
import { trainKeys, trainsApi, useTrainQuote } from '@/features/trains/api';
import { AvailabilityBadge } from '@/features/trains/components/AvailabilityBadge';
import { TrainCouponCard } from '@/features/trains/components/TrainCouponCard';
import { TrainJourneySummary } from '@/features/trains/components/TrainJourneySummary';
import { useTrainDraft } from '@/features/trains/draft';
import { berthLabel, classLabel, quotaLabel } from '@/features/trains/format';
import { ApiClientError } from '@/services/http';
import { useTrainCoupon } from '@/features/trains/useTrainCoupon';
import { useTrainCursor } from '@/features/trains/useTrainCursor';

const GENDER = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Transgender / other' } as const;

/** Review: live server quote, warnings, passengers; creates the booking and goes to payment. */
export default function TrainReviewPage() {
  useTrainCursor();
  const draft = useTrainDraft();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selection, passengers, contact, confirmOnly } = draft;
  const input = useMemo(
    () =>
      selection && passengers
        ? {
            offerId: selection.offerId,
            travelClass: selection.travelClass,
            quota: selection.quota,
            passengers: passengers.length,
          }
        : null,
    [selection, passengers],
  );
  const quote = useTrainQuote(input);
  // A coupon made in the admin panel comes off the server's fare; it is re-checked against the current quote.
  const grossPaise = quote.data?.price.totalPaise ?? 0;
  const coupon = useTrainCoupon(grossPaise);
  const payable = grossPaise - coupon.discountPaise;

  const book = useMutation({
    mutationFn: () => {
      if (!selection || !passengers || !contact || !quote.data) throw new Error('Nothing to book');
      return trainsApi.book(
        {
          offerId: selection.offerId,
          travelClass: selection.travelClass,
          quota: selection.quota,
          passengers,
          contact,
          confirmOnly,
          ...(coupon.promoCode ? { promoCode: coupon.promoCode } : {}),
          expectedTotalPaise: payable,
        },
        draft.idempotencyKey,
      );
    },
    onSuccess: (booking) => {
      draft.setReference(booking.reference);
      void navigate(paymentUrl('train', booking.reference));
    },
    onError: async (err) => {
      if (
        err instanceof ApiClientError &&
        (err.errorCode === 'PRICE_CHANGED' || err.errorCode === 'SOLD_OUT')
      ) {
        // A new attempt after seeing the new fare/availability is a new request.
        draft.renewKey();
        if (input) await queryClient.invalidateQueries({ queryKey: trainKeys.quote(input) });
      }
      // The server refused the coupon (expired, used up…): drop it so the next try is at the plain fare.
      if (err instanceof ApiClientError && err.details.some((d) => d.path === 'body.promoCode')) draft.setPromo(null);
    },
  });

  if (!selection) return <NothingSelected service="train" />;
  if (!passengers || !contact) return <Navigate to="/trains/booking" replace />;
  // Already booked in this tab: continue to payment rather than booking twice.
  if (draft.reference) return <Navigate to={paymentUrl('train', draft.reference)} replace />;

  const q = quote.data;
  return (
    <CheckoutShell
      step={2}
      service="train"
      title="Review your booking"
      back={{ to: '/trains/booking', label: 'Edit passengers' }}
      aside={
        q ? (
          <>
            <PriceSummary price={{ ...q.price, discountPaise: coupon.discountPaise, totalPaise: payable }} />
            <TrainJourneySummary
              train={selection.train}
              travelClass={selection.travelClass}
              quota={selection.quota}
            />
          </>
        ) : (
          <Skeleton className="h-64 rounded-2xl" />
        )
      }
    >
      {q?.demo && <DemoBanner service="train" />}
      {quote.error ? (
        <div className="space-y-3">
          <FormAlert>{errorMessage(quote.error)}</FormAlert>
          <Button asChild variant="outline">
            <Link to={selection.resultsUrl}>Back to results</Link>
          </Button>
        </div>
      ) : !q ? (
        <Skeleton className="h-72 rounded-2xl" />
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {selection.train.trainNumber} {selection.train.trainName}
              </CardTitle>
              <p className="text-sm text-muted">
                {travelDate(selection.train.date)} · {classLabel(q.travelClass)} ·{' '}
                {quotaLabel(q.quota)} quota
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="flex flex-wrap items-center gap-2">
                Current availability: <AvailabilityBadge availability={q.availability} />
              </p>
              {confirmOnly && (
                <p className="font-semibold">
                  Book only if confirmed berths are available: if not, nothing is booked and you are
                  refunded in full.
                </p>
              )}
              {!q.availability.bookable && (
                <FormAlert>
                  {q.availability.note ??
                    `${q.availability.label}: this class can't be booked now.`}
                </FormAlert>
              )}
              {q.warnings.length > 0 && (
                <div
                  role="alert"
                  className="space-y-1 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-amber-900"
                >
                  <p className="flex items-center gap-2 font-bold">
                    <AlertTriangle aria-hidden className="size-4" /> Please read before paying
                  </p>
                  <ul className="list-disc space-y-1 pl-5">
                    {q.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Passengers</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/trains/booking">
                  <Pencil aria-hidden /> Edit
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ol className="divide-y divide-border text-sm">
                {passengers.map((p, i) => (
                  <li
                    key={`${p.firstName}-${i}`}
                    className="flex flex-wrap justify-between gap-2 py-2"
                  >
                    <span className="font-semibold">
                      {i + 1}. {p.firstName} {p.lastName}
                    </span>
                    <span className="text-muted">
                      {p.age} yrs · {GENDER[p.gender]}
                      {p.berthPreference !== 'NO_PREFERENCE' &&
                        ` · ${berthLabel(p.berthPreference)}`}
                      {p.foodChoice &&
                        ` · ${p.foodChoice === 'NON_VEG' ? 'Non-veg' : p.foodChoice === 'VEG' ? 'Veg' : 'No food'}`}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-sm text-muted">
                Contact: {contact.email} · {contact.phone}
              </p>
            </CardContent>
          </Card>

          <TrainCouponCard grossPaise={grossPaise} discountPaise={coupon.discountPaise} problem={coupon.problem} />

          {book.error && (
            <FormAlert>
              {errorMessage(book.error)}
              {book.error instanceof ApiClientError &&
                book.error.errorCode === 'PRICE_CHANGED' &&
                ' The total above has been updated.'}
            </FormAlert>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-md text-xs text-muted">
              The fare is calculated by our server from the railway's quote. Your ticket is
              confirmed only when the railway issues a PNR after payment.
            </p>
            <Button
              size="lg"
              disabled={book.isPending || quote.isFetching || !q.availability.bookable}
              onClick={() => book.mutate()}
            >
              <Lock aria-hidden />{' '}
              {book.isPending ? 'Creating booking…' : `Continue to pay ${inr(payable)}`}
            </Button>
          </div>
        </>
      )}
    </CheckoutShell>
  );
}
