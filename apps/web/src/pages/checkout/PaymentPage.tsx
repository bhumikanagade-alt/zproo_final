import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BookingDetails, PaymentOrder } from '@zproo/types';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
  Skeleton,
} from '@zproo/ui';
import {
  Building2,
  CreditCard,
  Lock,
  Smartphone,
  Timer,
  Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router';

import zprooUpiQr from '../../../assets-src/images/zproo-upi-qr.png';

import { FormAlert } from '@/features/auth/components/FormAlert';
import { errorMessage } from '@/features/auth/errors';
import { useBusDraft } from '@/features/buses/draft';
import { bookingKeys, checkoutApi, useBooking } from '@/features/checkout/api';
import {
  CHECKOUT_STEP,
  type CheckoutService,
} from '@/features/checkout/steps';
import {
  confirmationUrl,
  searchHome,
  serviceOf,
} from '@/features/checkout/links';
import { TripSummary } from '@/features/checkout/TripSummary';
import { CheckoutShell } from '@/features/checkout/CheckoutShell';
import { PriceSummary } from '@/features/checkout/PriceSummary';
import { useFlightDraft } from '@/features/flights/draft';
import { useTrainDraft } from '@/features/trains/draft';
import { inr } from '@/features/flights/format';
import { useCountdown } from '@/hooks/useCountdown';
import { useNotifications } from '@/components/feedback/Notifications';

const METHODS = [
  {
    id: 'upi',
    label: 'UPI',
    hint: 'Google Pay, PhonePe, Paytm & more',
    icon: Smartphone,
  },
  {
    id: 'card',
    label: 'Credit / debit card',
    hint: 'Visa, Mastercard, RuPay',
    icon: CreditCard,
  },
  {
    id: 'netbanking',
    label: 'Net banking',
    hint: 'All major banks',
    icon: Building2,
  },
  {
    id: 'wallet',
    label: 'Wallet',
    hint: 'ZPROO Wallet and others',
    icon: Wallet,
  },
] as const;

/**
 * Payment for any booking (flights and buses),
 * at /flights/payment and /buses/payment.
 */
export default function PaymentPage() {
  const [params] = useSearchParams();

  const pathname = useLocation().pathname;
  const service: CheckoutService = pathname.startsWith('/buses')
    ? 'bus'
    : pathname.startsWith('/trains')
      ? 'train'
      : 'flight';

  const flightReference = useFlightDraft((s) => s.reference);
  const busReference = useBusDraft((s) => s.reference);
  const trainReference = useTrainDraft((s) => s.reference);

  const reference =
    params.get('ref') ??
    (service === 'bus' ? busReference : service === 'train' ? trainReference : flightReference);

  const { data: booking, isPending, error } = useBooking(reference);

  const step = CHECKOUT_STEP[service].payment;

  if (!reference) {
    return <Navigate to={searchHome(service)} replace />;
  }

  if (isPending) {
    return (
      <CheckoutShell step={step} service={service} title="Payment">
        <Skeleton className="h-72 rounded-2xl" />
      </CheckoutShell>
    );
  }

  if (error || !booking) {
    return (
      <CheckoutShell step={step} service={service} title="Payment">
        <FormAlert>{errorMessage(error)}</FormAlert>
      </CheckoutShell>
    );
  }

  if (
    booking.status === 'CONFIRMED' ||
    booking.status === 'COMPLETED' ||
    // Trains: paid; the confirmation page follows the railway reservation.
    (booking.serviceType === 'TRAIN' && booking.status !== 'PENDING_PAYMENT')
  ) {
    return (
      <Navigate
        to={confirmationUrl(serviceOf(booking), booking.reference)}
        replace
      />
    );
  }

  return <Payment booking={booking} />;
}

function Payment({ booking }: { booking: BookingDetails }) {
  const queryClient = useQueryClient();

  const service = serviceOf(booking);

  const clearFlight = useFlightDraft((s) => s.clear);
  const clearBus = useBusDraft((s) => s.clear);
  const clearTrain = useTrainDraft((s) => s.clear);

  const [method, setMethod] =
    useState<(typeof METHODS)[number]['id']>('upi');

  const [paid, setPaid] = useState<string | null>(null);

  const { notify } = useNotifications();

  const holdEnds = booking.holdExpiresAt
    ? Date.parse(booking.holdExpiresAt)
    : 0;

  const secondsLeft = useCountdown(holdEnds);

  const expired =
    booking.status !== 'PENDING_PAYMENT' || secondsLeft === 0;

  const order = useMutation({
    mutationFn: () =>
      checkoutApi.createPayment(booking.reference),
  });

  const createOrder = order.mutate;

  // One order per booking.
  // The API returns the open order if one exists.
  useEffect(() => {
    if (booking.status === 'PENDING_PAYMENT') {
      createOrder();
    }
  }, [booking.status, createOrder]);

  const pay = useMutation({
    mutationFn: (outcome: 'success' | 'failure') => {
      const current = order.data as PaymentOrder;

      return checkoutApi.completeMockPayment(
        current.paymentId,
        outcome,
      );
    },

    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: bookingKeys.booking(booking.reference),
      });
      // My bookings and the notification bell pick up the new booking straight away.
      void queryClient.invalidateQueries({ queryKey: bookingKeys.bookings, exact: true });

      if (result.status === 'SUCCESS') {
        if (service === 'bus') {
          clearBus();
        } else if (service === 'train') {
          clearTrain();
        } else {
          clearFlight();
        }

        notify(
          service === 'train'
            ? 'Payment received. Requesting your reservation from the railway…'
            : 'Payment successful. Your booking is confirmed.',
          'success',
        );

        setPaid(result.reference);
      } else {
        notify(
          'Payment failed. You can try again while the hold is active.',
          'error',
        );

        // A failed attempt closes that order.
        // The next attempt gets a fresh one.
        createOrder();
      }
    },
  });

  if (paid) {
    return (
      <Navigate
        to={confirmationUrl(service, paid)}
        replace
      />
    );
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  const mock = order.data?.provider === 'mock';

  const upiId =
    import.meta.env.VITE_UPI_ID || 'zproobus@upi';

  return (
    <CheckoutShell
      step={CHECKOUT_STEP[service].payment}
      service={service}
      title="Payment"
      aside={
        <>
          <PriceSummary price={booking.price} />
          <TripSummary booking={booking} />
        </>
      }
    >
      {expired ? (
        <div className="space-y-3">
          <FormAlert>
            {service === 'train'
              ? `The time to pay for booking ${booking.reference} has run out. Nothing was reserved or charged. Please search again to book.`
              : `Your seat hold for booking ${booking.reference} has expired and the seats were released. Please search again to book.`}
          </FormAlert>

          <Button asChild>
            <Link to={searchHome(service)}>
              Search again
            </Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Booking Timer */}
          <div
            role="timer"
            aria-live="off"
            className={cn(
              'flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm',
              secondsLeft < 120
                ? 'border-danger/40 bg-danger/5 text-danger'
                : 'border-border bg-card',
            )}
          >
            <Timer
              aria-hidden
              className="size-5 shrink-0"
            />

            <span>
              {service === 'train' ? 'Fare held for' : 'Seats held for'}{' '}
              <strong className="tabular-nums">
                {minutes}:{seconds}
              </strong>{' '}
              · Booking{' '}
              <strong>{booking.reference}</strong>
            </span>
          </div>

          {service === 'train' && (
            <p role="note" className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted">
              After payment we ask the railway system to reserve. Your ticket is confirmed only when
              it returns a PNR; if it cannot book, the full amount is refunded automatically.
            </p>
          )}

          {/* Payment Methods */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Choose how to pay
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div
                role="radiogroup"
                aria-label="Payment method"
                className="grid gap-3 sm:grid-cols-2"
              >
                {METHODS.map(
                  ({ id, label, hint, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={method === id}
                      onClick={() => setMethod(id)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                        method === id
                          ? 'border-primary bg-primary-light'
                          : 'border-border hover:border-foreground/30',
                      )}
                    >
                      <Icon
                        aria-hidden
                        className="size-5 text-primary"
                      />

                      <span>
                        <span className="block text-sm font-semibold">
                          {label}
                        </span>

                        <span className="block text-xs text-muted">
                          {hint}
                        </span>
                      </span>
                    </button>
                  ),
                )}
              </div>
            </CardContent>
          </Card>

          {/* UPI QR PAYMENT */}
          {method === 'upi' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Scan to pay with UPI
                </CardTitle>
              </CardHeader>

              <CardContent className="flex flex-col items-center gap-3 text-center">
                {/* YOUR QR CODE */}
                <div className="rounded-2xl border border-border bg-white p-3 shadow-sm">
                  <img
                    src={zprooUpiQr}
                    alt="ZPROO BUS UPI QR code"
                    width={220}
                    height={220}
                    className="block rounded-xl"
                  />
                </div>

                {/* Amount */}
                <p className="text-lg font-bold">
                  Pay {inr(booking.price.totalPaise)}
                </p>

                {/* UPI ID */}
                <p className="text-xs text-muted">
                  UPI ID: {upiId}
                </p>

                {/* Instructions */}
                <p className="max-w-sm text-xs leading-5 text-muted">
                  Open your UPI app, scan the QR code and
                  complete the payment. Your booking remains
                  held until the timer expires.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Errors */}
          {order.error && (
            <FormAlert>
              {errorMessage(order.error)}
            </FormAlert>
          )}

          {pay.error && (
            <FormAlert>
              {errorMessage(pay.error)}
            </FormAlert>
          )}

          {pay.data?.status === 'FAILED' && (
            <FormAlert>
              The payment was declined. No money was taken —
              you can try again.
            </FormAlert>
          )}

          {/* Payment Order */}
          {order.isPending ? (
            <Skeleton className="h-28 rounded-2xl" />
          ) : mock ? (
            <Card className="border-dashed">
              <CardContent className="space-y-3 p-5">
                <p className="text-sm">
                  <strong>Test gateway.</strong> This
                  environment uses a simulated payment provider
                  — nothing is charged. Choose an outcome to
                  continue.
                </p>

                <div className="flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    disabled={
                      pay.isPending || !order.data
                    }
                    onClick={() =>
                      pay.mutate('success')
                    }
                  >
                    <Lock aria-hidden />{' '}
                    {pay.isPending
                      ? 'Processing…'
                      : `Pay ${inr(
                          booking.price.totalPaise,
                        )}`}
                  </Button>

                  <Button
                    size="lg"
                    variant="outline"
                    disabled={
                      pay.isPending || !order.data
                    }
                    onClick={() =>
                      pay.mutate('failure')
                    }
                  >
                    Simulate a failed payment
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            order.data && (
              <FormAlert>
                Online payment isn't available right now.
                Your seats stay held until the timer runs
                out.
              </FormAlert>
            )
          )}

          {/* Security Message */}
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Lock
              aria-hidden
              className="size-3.5"
            />

            Payments are verified on our servers before your
            booking is confirmed. We never store card details.
          </p>
        </>
      )}
    </CheckoutShell>
  );
}