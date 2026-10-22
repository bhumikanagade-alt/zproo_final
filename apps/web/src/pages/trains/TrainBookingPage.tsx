import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BookingDetails, TrainBookingInfo } from '@zproo/types';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@zproo/ui';
import { formatMoney } from '@zproo/utils';
import {
  CircleAlert,
  CircleCheck,
  Clock3,
  Download,
  Home,
  ListChecks,
  Radio,
  RefreshCw,
  TicketX,
  Undo2,
} from 'lucide-react';
import { useEffect } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { errorMessage } from '@/features/auth/errors';
import { bookingKeys, checkoutApi, useBooking } from '@/features/checkout/api';
import { useBookingSession } from '@/features/checkout/bookingSession';
import { CheckoutShell } from '@/features/checkout/CheckoutShell';
import { DemoBanner } from '@/features/checkout/DemoBanner';
import { paymentUrl } from '@/features/checkout/links';
import { PriceSummary } from '@/features/checkout/PriceSummary';
import { trainsApi } from '@/features/trains/api';
import { RouteStops } from '@/features/trains/components/RouteStops';
import { TrainJourneySummary } from '@/features/trains/components/TrainJourneySummary';
import { trainCancelUrl, trainLiveStatusUrl } from '@/features/trains/links';
import {
  berthLabel,
  istTime,
  PASSENGER_STATUS_LABEL,
  passengerTone,
} from '@/features/trains/format';
import { localDay } from '@/features/flights/format';
import { useTrainCursor } from '@/features/trains/useTrainCursor';

/**
 * Train booking status, at /trains/confirmation?ref=… (after payment) and /trains/bookings/:reference
 * (from My Bookings). Shows exactly what the railway reported: processing, booked (PNR, berth or
 * RAC/WL per passenger), failed with refund, cancelled, and refund tracking.
 */
export default function TrainBookingPage() {
  useTrainCursor();
  const [params] = useSearchParams();
  const { reference: fromPath } = useParams();
  const reference = (fromPath ?? params.get('ref') ?? '').toUpperCase() || null;
  const afterPayment = !fromPath;
  // Paid bookings wait for the railway: poll while PROCESSING.
  const { data: booking, isPending, error } = useBooking(reference, { poll: true });
  if (!reference) return <Navigate to="/trains" replace />;
  if (isPending) {
    return (
      <CheckoutShell step={4} service="train" title="Your train booking">
        <Skeleton className="h-72 rounded-2xl" />
      </CheckoutShell>
    );
  }
  if (error || !booking) {
    return (
      <CheckoutShell step={4} service="train" title="Train booking">
        <FormAlert>{errorMessage(error)}</FormAlert>
      </CheckoutShell>
    );
  }
  if (!booking.train) return <Navigate to={`/bookings/${booking.reference}`} replace />;
  if (booking.status === 'PENDING_PAYMENT')
    return <Navigate to={paymentUrl('train', booking.reference)} replace />;
  return (
    <Booking
      booking={booking as BookingDetails & { train: TrainBookingInfo }}
      afterPayment={afterPayment}
    />
  );
}

function Booking({
  booking,
  afterPayment,
}: {
  booking: BookingDetails & { train: TrainBookingInfo };
  afterPayment: boolean;
}) {
  const t = booking.train;
  const queryClient = useQueryClient();
  const confirmed = booking.status === 'CONFIRMED' || booking.status === 'COMPLETED';
  useEffect(() => {
    if (booking.status !== 'PROCESSING') useBookingSession.getState().clear();
  }, [booking.status]);

  const refresh = useMutation({
    mutationFn: () => trainsApi.refresh(booking.reference),
    onSuccess: (fresh) => queryClient.setQueryData(bookingKeys.booking(booking.reference), fresh),
  });
  const download = useMutation({ mutationFn: () => checkoutApi.downloadTicket(booking.reference) });
  const demo = t.provider === 'mock';
  const active = t.passengers.filter((p) => p.status !== 'CANCELLED');
  const allConfirmed = active.length > 0 && active.every((p) => p.status === 'CONFIRMED');
  const canCancel = confirmed && t.capabilities.cancellation && Boolean(t.pnr) && active.length > 0;

  const title =
    booking.status === 'PROCESSING'
      ? 'Payment received — reserving'
      : confirmed
        ? 'Train booking'
        : booking.status === 'CANCELLED' || t.reservationStatus === 'CANCELLED'
          ? 'Booking cancelled'
          : 'Booking not completed';

  return (
    <CheckoutShell
      step={4}
      service="train"
      title={afterPayment ? title : `Booking ${booking.reference}`}
      aside={
        <>
          <PriceSummary price={booking.price} title="Amount paid" />
          <TrainJourneySummary train={t.offer} travelClass={t.travelClass} quota={t.quota} />
          <Button asChild variant="outline" className="w-full">
            <Link to="/bookings">
              <ListChecks aria-hidden /> View in My Bookings
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/">
              <Home aria-hidden /> Back to home
            </Link>
          </Button>
        </>
      }
    >
      {demo && <DemoBanner service="train" />}
      <StatusBanner booking={booking} allConfirmed={allConfirmed} />

      <div className="flex flex-wrap items-center gap-3">
        {confirmed && (
          <Button size="lg" disabled={download.isPending} onClick={() => download.mutate()}>
            <Download aria-hidden /> {download.isPending ? 'Preparing…' : 'Download e-ticket'}
          </Button>
        )}
        {(booking.status === 'PROCESSING' || (confirmed && t.pnr)) && (
          <Button variant="outline" disabled={refresh.isPending} onClick={() => refresh.mutate()}>
            <RefreshCw aria-hidden className={refresh.isPending ? 'animate-spin' : undefined} />
            {refresh.isPending
              ? 'Checking…'
              : booking.status === 'PROCESSING'
                ? 'Check again'
                : 'Refresh PNR status'}
          </Button>
        )}
        {canCancel && (
          <Button asChild variant="outline">
            <Link to={trainCancelUrl(booking.reference)}>
              <TicketX aria-hidden /> Cancel ticket
            </Link>
          </Button>
        )}
        {confirmed && (
          <Button asChild variant="ghost">
            <Link to={trainLiveStatusUrl(t.offer.trainNumber, t.offer.date)}>
              <Radio aria-hidden /> Live status
            </Link>
          </Button>
        )}
      </div>
      {(refresh.error || download.error) && (
        <FormAlert>{errorMessage(refresh.error ?? download.error)}</FormAlert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">PNR & reservation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted">PNR</p>
            <p className="font-mono text-lg font-bold tracking-widest">{t.pnr ?? 'Not issued'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-muted">Booking reference</p>
            <p className="font-semibold tracking-wide">{booking.reference}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-muted">Chart</p>
            <p className="font-semibold">{t.chartStatus ?? '—'}</p>
          </div>
          {t.lastCheckedAt && (
            <p className="text-xs text-muted sm:col-span-3">
              Status from the railway at {istTime(t.lastCheckedAt)},{' '}
              {localDay(t.lastCheckedAt, 'Asia/Kolkata')}.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Passengers</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-1 font-semibold">Name</th>
                <th className="py-1 font-semibold">Age / gender</th>
                <th className="py-1 font-semibold">Booking status</th>
                <th className="py-1 font-semibold">Current status</th>
              </tr>
            </thead>
            <tbody>
              {booking.passengers.map((p) => {
                const tp = t.passengers.find((x) => x.passengerId === p.id);
                return (
                  <tr key={p.id} className="border-t border-border align-top">
                    <td className="py-2 font-semibold">
                      {p.firstName} {p.lastName}
                      {tp && tp.berthPreference !== 'NO_PREFERENCE' && (
                        <span className="block text-xs font-normal text-muted">
                          Preferred: {berthLabel(tp.berthPreference)}
                        </span>
                      )}
                    </td>
                    <td className="py-2">
                      {p.age} / {p.gender.charAt(0) + p.gender.slice(1).toLowerCase()}
                    </td>
                    <td className="py-2 font-mono text-xs">{tp?.bookingStatus ?? '—'}</td>
                    <td className="py-2">
                      {tp && (
                        <Badge variant={passengerTone(tp.status)}>
                          {tp.status === 'CANCELLED'
                            ? 'Cancelled'
                            : (tp.currentStatus ?? PASSENGER_STATUS_LABEL[tp.status])}
                        </Badge>
                      )}
                      {tp && tp.status !== 'CANCELLED' && tp.status !== 'CONFIRMED' && (
                        <span className="mt-1 block text-xs text-muted">
                          {PASSENGER_STATUS_LABEL[tp.status]}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {(t.cancellations.length > 0 || t.refunds.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cancellations & refunds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {t.cancellations.map((c) => (
              <div key={c.id} className="rounded-xl border border-border p-3">
                <p className="font-semibold">
                  {c.passengerIds.length} passenger{c.passengerIds.length === 1 ? '' : 's'} ·{' '}
                  {c.status === 'COMPLETED'
                    ? 'Cancelled'
                    : c.status === 'FAILED'
                      ? 'Cancellation failed'
                      : 'Cancellation requested'}
                </p>
                <p className="text-muted">
                  Charges {formatMoney(c.chargesPaise)} · Refund {formatMoney(c.refundPaise)}
                  {c.failureReason ? ` · ${c.failureReason}` : ''}
                </p>
              </div>
            ))}
            {t.refunds.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
              >
                <span>
                  <span className="block font-semibold">
                    {formatMoney(r.amountPaise)} — {r.reason}
                  </span>
                  <span className="block text-xs text-muted">
                    {r.gatewayReference
                      ? `Refund ref ${r.gatewayReference}`
                      : 'Awaiting the payment gateway'}
                  </span>
                </span>
                <Badge
                  variant={
                    r.status === 'COMPLETED'
                      ? 'success'
                      : r.status === 'FAILED'
                        ? 'danger'
                        : 'warning'
                  }
                >
                  {r.status === 'COMPLETED'
                    ? 'Refunded'
                    : r.status === 'FAILED'
                      ? 'Refund retrying'
                      : r.status === 'PROCESSING'
                        ? 'Refund in progress'
                        : 'Refund requested'}
                </Badge>
              </div>
            ))}
            {t.refunds.some((r) => r.status === 'COMPLETED') && (
              <p className="text-xs text-muted">
                Refunds go back to the original payment method. Banks usually take 5–7 working days
                to show them.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Route</CardTitle>
        </CardHeader>
        <CardContent>
          <RouteStops stops={t.offer.stops} />
        </CardContent>
      </Card>
    </CheckoutShell>
  );
}

function StatusBanner({
  booking,
  allConfirmed,
}: {
  booking: BookingDetails & { train: TrainBookingInfo };
  allConfirmed: boolean;
}) {
  const t = booking.train;
  if (booking.status === 'PROCESSING') {
    return (
      <div
        role="status"
        className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5"
      >
        <Clock3 aria-hidden className="size-8 shrink-0 animate-pulse text-primary" />
        <div className="space-y-1">
          <p className="text-lg font-bold">Payment received. Waiting for the railway to confirm.</p>
          <p className="text-sm text-muted">
            Your ticket is not booked until the railway issues a PNR. This usually takes a few
            seconds; if it can't book, the full amount is refunded automatically.
          </p>
        </div>
      </div>
    );
  }
  if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') {
    return allConfirmed ? (
      <div
        role="status"
        className="flex items-start gap-4 rounded-2xl border border-success/30 bg-success/10 p-5"
      >
        <CircleCheck aria-hidden className="size-8 shrink-0 text-success" />
        <div className="space-y-1">
          <p className="text-lg font-bold">Booked — berths confirmed</p>
          <p className="text-sm">
            PNR <strong className="font-mono tracking-wider">{t.pnr}</strong> · details sent to{' '}
            {booking.contact.email}
          </p>
        </div>
      </div>
    ) : (
      <div
        role="status"
        className="flex items-start gap-4 rounded-2xl border border-warning/40 bg-warning/10 p-5 text-amber-900"
      >
        <CircleAlert aria-hidden className="size-8 shrink-0" />
        <div className="space-y-1">
          <p className="text-lg font-bold">Booked — not all berths are confirmed</p>
          <p className="text-sm">
            PNR <strong className="font-mono tracking-wider">{t.pnr}</strong>. Passengers on RAC
            share a berth; waitlisted passengers have no berth yet. A fully waitlisted e-ticket is
            cancelled automatically when the chart is prepared, and refunded. Check the status
            before you travel.
          </p>
        </div>
      </div>
    );
  }
  const refunded = booking.status === 'REFUNDED';
  return (
    <div
      role="status"
      className="flex items-start gap-4 rounded-2xl border border-danger/30 bg-danger/5 p-5"
    >
      <Undo2 aria-hidden className="size-8 shrink-0 text-danger" />
      <div className="space-y-1">
        <p className="text-lg font-bold">
          {t.reservationStatus === 'FAILED'
            ? 'The railway could not book this ticket'
            : t.reservationStatus === 'CANCELLED'
              ? 'Ticket cancelled'
              : 'Booking not completed'}
        </p>
        {t.failureReason && <p className="text-sm">{t.failureReason}</p>}
        <p className="text-sm text-muted">
          {refunded
            ? 'Your refund has been processed to the original payment method.'
            : booking.status === 'REFUND_PENDING'
              ? 'A refund is in progress to the original payment method.'
              : 'Nothing further is due.'}
        </p>
      </div>
    </div>
  );
}
