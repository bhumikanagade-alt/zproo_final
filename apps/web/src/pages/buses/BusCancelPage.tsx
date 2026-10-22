import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Skeleton,
} from '@zproo/ui';
import { formatMoney } from '@zproo/utils';
import { TicketX } from 'lucide-react';
import { useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { useNotifications } from '@/components/feedback/Notifications';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { errorMessage } from '@/features/auth/errors';
import { busesApi } from '@/features/buses/api';
import { bookingKeys, useBooking } from '@/features/checkout/api';
import { CheckoutShell } from '@/features/checkout/CheckoutShell';
import { travelDate } from '@/features/flights/format';

const REASONS = ['Change of plans', 'Found a better option', 'Booked by mistake', 'Travel date changed', 'Other'];

/** See the refund for cancelling a bus ticket right now, then confirm the cancellation. */
export default function BusCancelPage() {
  const { reference = '' } = useParams();
  const ref = reference.toUpperCase();
  const { data: booking, isPending, error } = useBooking(ref);
  const back = { to: '/bookings', label: 'Back to my bookings' };

  if (isPending) {
    return (
      <CheckoutShell step={4} service="bus" title="Cancel booking" back={back}>
        <Skeleton className="h-72 rounded-2xl" />
      </CheckoutShell>
    );
  }
  if (error || !booking) {
    return (
      <CheckoutShell step={4} service="bus" title="Cancel booking" back={back}>
        <FormAlert>{errorMessage(error)}</FormAlert>
      </CheckoutShell>
    );
  }
  if (!booking.bus) return <Navigate to="/bookings" replace />;
  return <Cancel reference={ref} />;
}

function Cancel({ reference }: { reference: string }) {
  const { data: booking } = useBooking(reference);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const [reason, setReason] = useState(REASONS[0] as string);
  const [confirming, setConfirming] = useState(false);
  // One key per page visit: a retry (double click, network) never cancels twice.
  const key = useRef<string>(crypto.randomUUID());

  const quote = useQuery({
    queryKey: ['bus-cancellation-quote', reference],
    queryFn: () => busesApi.cancellationQuote(reference),
    // The refund share depends on the time left, so always ask again when the page opens.
    staleTime: 0,
    gcTime: 0,
  });
  const cancel = useMutation({
    mutationFn: () => busesApi.cancel(reference, reason, key.current),
    onSuccess: (fresh) => {
      queryClient.setQueryData(bookingKeys.booking(reference), fresh);
      void queryClient.invalidateQueries({ queryKey: bookingKeys.bookings });
      void queryClient.invalidateQueries({ queryKey: ['bus-cancellation-quote', reference] });
      notify(
        quote.data && quote.data.refundPaise > 0
          ? `Booking cancelled. ${formatMoney(quote.data.refundPaise)} will be refunded to your original payment method.`
          : 'Booking cancelled.',
        'success',
      );
      void navigate('/bookings');
    },
  });

  const bus = booking?.bus;
  const q = quote.data;
  const back = { to: '/bookings', label: 'Back to my bookings' };

  return (
    <CheckoutShell step={4} service="bus" title="Cancel booking" back={back}>
      {bus && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {bus.offer.from.name} → {bus.offer.to.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-semibold">{bus.offer.operator.name}</p>
            <p className="text-muted">
              {travelDate(booking?.travelDate ?? '')} · Seat{bus.seatNumbers.length === 1 ? '' : 's'}{' '}
              {bus.seatNumbers.join(', ')}
            </p>
            <p className="text-xs text-muted">Booking {reference}</p>
          </CardContent>
        </Card>
      )}

      {quote.isPending && <Skeleton className="h-48 rounded-2xl" />}
      {quote.error && <FormAlert>{errorMessage(quote.error)}</FormAlert>}
      {q && !q.eligible && <FormAlert>{q.reason ?? 'This booking cannot be cancelled.'}</FormAlert>}
      {q?.eligible && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cancellation summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {q.paid ? (
              <>
                <dl className="space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-muted">Amount paid</dt>
                    <dd className="tabular-nums">{formatMoney(q.farePaise)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Cancellation charges ({100 - q.refundPercent}%)</dt>
                    <dd className="tabular-nums">−{formatMoney(q.chargesPaise)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 text-base font-extrabold">
                    <dt>Refund</dt>
                    <dd className="tabular-nums">{formatMoney(q.refundPaise)}</dd>
                  </div>
                </dl>
                {q.refundPaise === 0 && (
                  <p className="font-semibold text-danger">
                    Cancelling this close to departure does not qualify for a refund.
                  </p>
                )}
              </>
            ) : (
              <p>You have not paid for this booking, so nothing will be charged. Your seats will be released.</p>
            )}

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-muted">Reason for cancelling</span>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              >
                {REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>

            <details className="text-xs text-muted">
              <summary className="cursor-pointer font-semibold text-foreground">Refund rules</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {q.rules.map((r) => (
                  <li key={r.hoursBefore}>
                    {r.hoursBefore > 0
                      ? `${r.refundPercent}% refund when cancelled more than ${r.hoursBefore}h before departure`
                      : 'No refund after the final cutoff'}
                  </li>
                ))}
              </ul>
            </details>

            <Button variant="destructive" className="w-full sm:w-auto" onClick={() => setConfirming(true)}>
              <TicketX aria-hidden /> Cancel booking
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={confirming} onOpenChange={(open) => !cancel.isPending && setConfirming(open)}>
        <DialogContent className="max-w-md">
          <DialogTitle>Cancel this booking?</DialogTitle>
          <DialogDescription>
            This cannot be undone.{' '}
            {q?.paid
              ? q.refundPaise > 0
                ? `${formatMoney(q.refundPaise)} will be refunded to your original payment method.`
                : 'No refund applies.'
              : 'Your seats will be released.'}
          </DialogDescription>
          {cancel.error && <FormAlert>{errorMessage(cancel.error)}</FormAlert>}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button variant="outline" disabled={cancel.isPending} onClick={() => setConfirming(false)}>
              Keep booking
            </Button>
            <Button variant="destructive" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
              {cancel.isPending ? 'Cancelling…' : 'Yes, cancel'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </CheckoutShell>
  );
}
