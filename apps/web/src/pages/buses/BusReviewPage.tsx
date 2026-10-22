import { useMutation, useQuery } from '@tanstack/react-query';
import { couponErrorMessage, couponKeys, couponsApi } from '@/features/coupons/api';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@zproo/ui';

import {
  ArrowRight,
  Lock,
  Mail,
  Phone,
} from 'lucide-react';

import {
  Link,
  Navigate,
  useNavigate,
} from 'react-router';

import { FormAlert } from '@/features/auth/components/FormAlert';
import { errorMessage } from '@/features/auth/errors';

import {
  busesApi,
  useBusTrip,
  useSeatMap,
} from '@/features/buses/api';

import { BusTripSummary } from '@/features/buses/components/BusTripSummary';

import {
  useBusDraft,
  type BusSelection,
} from '@/features/buses/draft';

import { busPriceBreakdown } from '@/features/buses/price';

import {
  CheckoutShell,
  NothingSelected,
} from '@/features/checkout/CheckoutShell';

import { DemoBanner } from '@/features/checkout/DemoBanner';

import { paymentUrl } from '@/features/checkout/links';

import { PriceSummary } from '@/features/checkout/PriceSummary';



import { ApiClientError } from '@/services/http';

import { useBookingSession } from '@/features/checkout/bookingSession';

const GENDER = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
} as const;

/*
 * Convert the server error:
 *
 * "The new total is ₹369"
 *
 * into:
 *
 * 36900 paise
 */
function extractServerTotal(
  error: ApiClientError,
): number | null {
  const issue = error.details?.find(
    (item) =>
      item.path ===
        'body.expectedTotalPaise' ||
      item.message
        .toLowerCase()
        .includes('new total'),
  );

  if (!issue) {
    return null;
  }

  const match =
    issue.message.match(
      /₹\s*([\d,]+(?:\.\d+)?)/,
    );

  if (!match) {
    return null;
  }

  const rupees = Number(
    match[1]?.replace(/,/g, ''),
  );

  if (!Number.isFinite(rupees)) {
    return null;
  }

  return Math.round(rupees * 100);
}

export default function BusReviewPage() {
  const draft = useBusDraft();

  if (!draft.selection) {
    return (
      <NothingSelected service="bus" />
    );
  }

  if (
    !draft.passengers ||
    !draft.contact
  ) {
    return (
      <Navigate
        to="/buses/booking"
        replace
      />
    );
  }

  return (
    <Review
      selection={draft.selection}
    />
  );
}

function Review({
  selection,
}: {
  selection: BusSelection;
}) {
  const navigate = useNavigate();

  const draft = useBusDraft();

  const passengers =
    draft.passengers ?? [];

  const bookingSession =
    useBookingSession();

  const contact =
    draft.contact as NonNullable<
      typeof draft.contact
    >;

  const trip = useBusTrip(
    selection.tripId,
  );

  const map = useSeatMap(
    selection.tripId,
  );

  /*
   * Live seat map.
   */
  const live = new Map(
    map.data?.decks
      .flatMap(
        (deck) => deck.seats,
      )
      .map((seat) => [
        seat.number,
        seat,
      ]) ?? [],
  );

  /*
   * Seats that became unavailable.
   */
  const taken = map.data
    ? selection.seats.filter(
        (seat) =>
          !live.get(
            seat.number,
          )?.available &&
          !draft.reference,
      )
    : [];

  /*
   * Current live prices.
   */
  const liveSeats =
    selection.seats.map(
      (seat) => ({
        ...seat,

        pricePaise:
          live.get(
            seat.number,
          )?.pricePaise ??
          seat.pricePaise,
      }),
    );

  /*
   * Gross fare before coupon.
   */
  const grossTotal =
    liveSeats.reduce(
      (sum, seat) =>
        sum + seat.pricePaise,
      0,
    );

  /*
   * Recalculate the coupon from the CURRENT live fare.
   *
   * This is important when the seat fare is refreshed after the traveller
   * applied a coupon. The server also calculates the coupon from its current
   * fare, so both sides must use the same gross amount.
   */
  const promoCode = draft.promoCode?.trim().toUpperCase();
  const builtInDiscount =
    promoCode === 'ZPROO10'
      ? Math.floor(grossTotal * 0.10)
      : promoCode === 'BUS100'
        ? Math.min(10_000, grossTotal)
        : 0;

  /*
   * Coupons made in the admin panel are checked by the server against the CURRENT fare
   * (dates, usage limits, minimum order…). Built-in codes fall back to the local amount.
   */
  const couponCheck = useQuery({
    queryKey: couponKeys.check(promoCode ?? '', 'BUS', grossTotal),
    queryFn: () =>
      couponsApi.check({
        code: promoCode as string,
        service: 'BUS',
        orderPaise: grossTotal,
      }),
    enabled: Boolean(promoCode) && !draft.reference,
    retry: false,
    staleTime: 15_000,
  });
  const discount = !promoCode
    ? 0
    : couponCheck.data
      ? couponCheck.data.discountPaise
      : couponCheck.isError
        ? builtInDiscount
        : Math.min(draft.discountPaise, grossTotal);
  /* A coupon the server now refuses (expired, used up…) shows why instead of silently charging full price. */
  const couponProblem =
    promoCode && couponCheck.isError && builtInDiscount === 0
      ? couponErrorMessage(couponCheck.error)
      : null;

  /*
   * Final displayed amount.
   *
   * Example:
   *
   * ₹410
   * - ₹41
   * = ₹369
   */
  const currentTotal =
    Math.max(
      1,
      grossTotal - discount,
    );

  /*
   * Booking mutation.
   */
  const book = useMutation({
    mutationFn: async () => {
      console.log(
        'ZPROO: sending booking request',
      );

      console.log(
        'ZPROO: booking values',
        {
          tripId:
            selection.tripId,

          boardingPointId:
            selection.boardingPointId,

          droppingPointId:
            selection.droppingPointId,

          passengers,

          contact,

          promoCode:
            draft.promoCode,

          currentTotal,

          expectedTotalPaise:
            selection.expectedTotalPaise,

          discountPaise:
            draft.discountPaise,
        },
      );

      /*
       * IMPORTANT:
       *
       * The server calculates the final amount
       * using the current seat prices + coupon.
       *
       * Start with the amount currently shown
       * by the review page.
       */
      try {
        return await busesApi.book(
          {
            tripId:
              selection.tripId,

            boardingPointId:
              selection.boardingPointId,

            droppingPointId:
              selection.droppingPointId,

            passengers,

            contact,

            promoCode:
              couponProblem
                ? undefined
                : draft.promoCode,

            expectedTotalPaise:
              currentTotal,
          },

          draft.idempotencyKey,
        );
      } catch (error) {
        /*
         * The server has authoritative pricing.
         *
         * If the server tells us its actual
         * total, update the draft and retry
         * exactly once.
         */
        if (
          error instanceof
            ApiClientError &&
          error.errorCode ===
            'PRICE_CHANGED'
        ) {
          console.warn(
            'ZPROO: server reported PRICE_CHANGED',
          );

          console.warn(
            'ZPROO: server details',
            error.details,
          );

          const serverTotal =
            extractServerTotal(
              error,
            );

          console.log(
            'ZPROO: server total',
            serverTotal,
          );

          if (
            serverTotal !== null &&
            serverTotal > 0
          ) {
            /*
             * Update the Zustand draft.
             *
             * acceptPrice also generates a
             * fresh idempotency key.
             */
            draft.acceptPrice(
              serverTotal,
            );

            /*
             * Read the NEW draft state.
             *
             * We must not use the old
             * selection/idempotency key here.
             */
            const latest =
              useBusDraft.getState();

            console.log(
              'ZPROO: retrying with server total',
              {
                expectedTotalPaise:
                  latest.selection
                    ?.expectedTotalPaise,

                promoCode:
                  latest.promoCode,

                idempotencyKey:
                  latest.idempotencyKey,
              },
            );

            if (
              !latest.selection
            ) {
              throw error;
            }

            /*
             * Retry with the server's
             * authoritative amount.
             */
            return await busesApi.book(
              {
                tripId:
                  latest.selection
                    .tripId,

                boardingPointId:
                  latest.selection
                    .boardingPointId,

                droppingPointId:
                  latest.selection
                    .droppingPointId,

                passengers,

                contact,

                promoCode:
                  latest.promoCode,

                expectedTotalPaise:
                  latest.selection
                    .expectedTotalPaise,
              },

              latest.idempotencyKey,
            );
          }
        }

        throw error;
      }
    },

    onSuccess: (booking) => {
      console.log(
        'ZPROO: BOOKING SUCCESS',
        booking,
      );

      /*
       * Save booking reference.
       */
      draft.setReference(
        booking.reference,
      );

      console.log(
        'ZPROO: navigating to payment',
        booking.reference,
      );

      /*
       * Go to payment.
       */
      void navigate(
        paymentUrl(
          'bus',
          booking.reference,
        ),
      );
    },

    onError: (error) => {
      console.error(
        'ZPROO: FINAL BOOKING ERROR',
        error,
      );

      if (
        error instanceof
          ApiClientError &&
        [
          'PRICE_CHANGED',
          'SEAT_UNAVAILABLE',
        ].includes(
          error.errorCode,
        )
      ) {
        void map.refetch();
      }
    },
  });

  /*
   * Continue to payment.
   */
  const continueToPayment = () => {
    console.log(
      'ZPROO: Continue to payment clicked',
    );

    /*
     * Don't allow double clicks.
     */
    if (book.isPending) {
      console.log(
        'ZPROO: booking already running',
      );

      return;
    }

    /*
     * If booking already exists,
     * go directly to payment.
     */
    if (draft.reference) {
      console.log(
        'ZPROO: existing booking',
        draft.reference,
      );

      void navigate(
        paymentUrl(
          'bus',
          draft.reference,
        ),
      );

      return;
    }

    /*
     * Check booking timer.
     */
    if (
      bookingSession.expiresAt !==
        null &&
      bookingSession.expiresAt <=
        Date.now()
    ) {
      console.warn(
        'ZPROO: booking session expired',
      );

      book.reset();

      return;
    }

    /*
     * Don't submit if a seat has
     * disappeared.
     */
    if (taken.length > 0) {
      console.warn(
        'ZPROO: seat unavailable',
        taken.map(
          (seat) => seat.number,
        ),
      );

      return;
    }

    /*
     * Create booking.
     */
    console.log(
      'ZPROO: calling book.mutate()',
    );

    book.mutate();
  };

  /*
   * A price conflict must never leave the user with a button that appears to
   * work but silently fails. Show the authoritative amount and let the user
   * accept it before retrying.
   */
  const priceChanged =
    book.error instanceof ApiClientError &&
    book.error.errorCode === 'PRICE_CHANGED';

  const serverTotal = priceChanged
    ? extractServerTotal(book.error as ApiClientError)
    : null;

  const resolvedPrice =
    serverTotal !== null && serverTotal > 0
      ? serverTotal
      : currentTotal;

  const seatError =
    priceChanged ? null : book.error;

  return (
    <CheckoutShell
      step={3}
      service="bus"
      title="Review your booking"
      back={{
        to: '/buses/booking',
        label: 'Edit travellers',
      }}
      aside={
        <>
          <PriceSummary
            price={busPriceBreakdown({
              seats: liveSeats,
              discountPaise: discount,
            })}
            seatNumbers={liveSeats.map(
              (seat) => seat.number,
            )}
          />

          {couponProblem && (
            <FormAlert>
              {couponProblem}. This booking will go ahead without the coupon.
            </FormAlert>
          )}

          {priceChanged ? (
            <div
              role="alert"
              className="space-y-3 rounded-2xl border border-warning/50 bg-warning/10 p-4 text-sm"
            >
              <p>
                <strong>The fare has changed.</strong>{' '}
                The current total is <strong>₹{(resolvedPrice / 100).toLocaleString('en-IN')}</strong>.
              </p>
              <Button
                type="button"
                className="w-full"
                disabled={book.isPending}
                onClick={() => {
                  draft.acceptPrice(resolvedPrice);
                  book.reset();
                }}
              >
                Continue with ₹{(resolvedPrice / 100).toLocaleString('en-IN')}
              </Button>
            </div>
          ) : taken.length > 0 ? (
            <div
              role="alert"
              className="space-y-3 rounded-2xl border border-danger/40 bg-danger/5 p-4 text-sm"
            >
              <p>
                Seat
                {taken.length === 1
                  ? ''
                  : 's'}{' '}
                {taken
                  .map(
                    (seat) =>
                      seat.number,
                  )
                  .join(', ')}{' '}
                {taken.length === 1
                  ? 'was'
                  : 'were'}{' '}
                just booked by
                someone else.
              </p>

              <Button
                asChild
                className="w-full"
              >
                <Link
                  to={
                    selection.seatsUrl
                  }
                >
                  Choose other seats
                </Link>
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={
                book.isPending ||
                map.isPending
              }
              onClick={
                continueToPayment
              }
            >
              {book.isPending ? (
                <>
                  <span
                    className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                    aria-hidden="true"
                  />

                  Holding your
                  seats…
                </>
              ) : (
                <>
                  <Lock
                    aria-hidden
                  />

                  Continue to payment

                  <ArrowRight
                    aria-hidden
                  />
                </>
              )}
            </Button>
          )}

          <p className="text-center text-xs text-muted">
            By continuing you
            agree to the
            operator's cancellation
            policy, our{' '}
            <Link
              to="/terms"
              className="underline"
            >
              Terms
            </Link>{' '}
            and{' '}
            <Link
              to="/refund-policy"
              className="underline"
            >
              Refund Policy
            </Link>
            .
          </p>
        </>
      }
    >
      {trip.data?.provider ===
        'mock' && (
        <DemoBanner service="bus" />
      )}

      {seatError && (
        <FormAlert>
          {errorMessage(seatError)}
        </FormAlert>
      )}

      {trip.error && (
        <FormAlert>
          {errorMessage(
            trip.error,
          )}
        </FormAlert>
      )}

      <section
        aria-labelledby="journey-heading"
        className="space-y-3"
      >
        <h2
          id="journey-heading"
          className="text-lg font-bold"
        >
          Journey
        </h2>

        {trip.data ? (
          <BusTripSummary
            trip={trip.data}
            boarding={trip.data.boardingPoints.find(
              (point) =>
                point.id ===
                selection.boardingPointId,
            )}
            dropping={trip.data.droppingPoints.find(
              (point) =>
                point.id ===
                selection.droppingPointId,
            )}
            seatNumbers={selection.seats.map(
              (seat) => seat.number,
            )}
          />
        ) : (
          <Skeleton className="h-48 rounded-2xl" />
        )}
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">
            Travellers
          </CardTitle>

          <Link
            to="/buses/booking"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Edit
          </Link>
        </CardHeader>

        <CardContent>
          <ol className="divide-y divide-border text-sm">
            {passengers.map(
              (passenger) => (
                <li
                  key={
                    passenger.seatNumber
                  }
                  className="flex justify-between gap-3 py-2"
                >
                  <span className="font-semibold">
                    {
                      passenger.firstName
                    }{' '}
                    {
                      passenger.lastName
                    }
                  </span>

                  <span className="text-muted">
                    {passenger.age} yrs ·{' '}
                    {
                      GENDER[
                        passenger.gender
                      ]
                    }{' '}
                    · Seat{' '}
                    {
                      passenger.seatNumber
                    }
                  </span>
                </li>
              ),
            )}
          </ol>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-4 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Mail
                aria-hidden
                className="size-4"
              />

              {contact.email}
            </span>

            <span className="inline-flex items-center gap-1.5">
              <Phone
                aria-hidden
                className="size-4"
              />

              +91{' '}
              {contact.phone.replace(
                /^\+91/,
                '',
              )}
            </span>
          </div>
        </CardContent>
      </Card>
    </CheckoutShell>
  );
}