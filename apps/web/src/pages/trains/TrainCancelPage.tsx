import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BookingDetails, TrainBookingInfo } from '@zproo/types';
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
import { cancelTrainSchema } from '@zproo/validation';
import { TicketX } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { useNotifications } from '@/components/feedback/Notifications';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { errorMessage } from '@/features/auth/errors';
import { bookingKeys, useBooking } from '@/features/checkout/api';
import { CheckoutShell } from '@/features/checkout/CheckoutShell';
import { DemoBanner } from '@/features/checkout/DemoBanner';
import { trainsApi } from '@/features/trains/api';
import { TrainJourneySummary } from '@/features/trains/components/TrainJourneySummary';
import { trainBookingUrl } from '@/features/trains/links';
import { useTrainCursor } from '@/features/trains/useTrainCursor';

/** Choose passengers, see the provider's charges and refund, then confirm the cancellation. */
export default function TrainCancelPage() {
  useTrainCursor();
  const { reference = '' } = useParams();
  const { data: booking, isPending, error } = useBooking(reference.toUpperCase());
  if (isPending) {
    return (
      <CheckoutShell step={4} service="train" title="Cancel ticket">
        <Skeleton className="h-72 rounded-2xl" />
      </CheckoutShell>
    );
  }
  if (error || !booking) {
    return (
      <CheckoutShell step={4} service="train" title="Cancel ticket">
        <FormAlert>{errorMessage(error)}</FormAlert>
      </CheckoutShell>
    );
  }
  if (!booking.train) return <Navigate to="/bookings" replace />;
  return <Cancel booking={booking as BookingDetails & { train: TrainBookingInfo }} />;
}

function Cancel({ booking }: { booking: BookingDetails & { train: TrainBookingInfo } }) {
  const t = booking.train;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const active = t.passengers.filter((p) => p.status !== 'CANCELLED' && p.status !== 'PENDING');
  const [chosen, setChosen] = useState<string[]>(
    t.capabilities.partialCancellation ? [] : active.map((p) => p.passengerId),
  );
  const [confirming, setConfirming] = useState(false);
  // One key per confirmed attempt: a retry (double click, network) never cancels twice.
  const key = useRef<string>(crypto.randomUUID());

  const [problem, setProblem] = useState<string | null>(null);
  /** Same rule the API applies: at least one distinct passenger. */
  const check = () => {
    const result = cancelTrainSchema.safeParse({ passengerIds: chosen });
    setProblem(result.success ? null : (result.error.issues[0]?.message ?? 'Choose a passenger'));
    return result.success;
  };

  const quote = useMutation({
    mutationFn: () => trainsApi.cancellationQuote(booking.reference, chosen),
  });
  const cancel = useMutation({
    mutationFn: () => trainsApi.cancel(booking.reference, chosen, key.current),
    onSuccess: (fresh) => {
      queryClient.setQueryData(bookingKeys.booking(booking.reference), fresh);
      void queryClient.invalidateQueries({ queryKey: bookingKeys.bookings });
      notify('Cancellation processed with the railway.', 'success');
      void navigate(trainBookingUrl(booking.reference));
    },
  });
  const toggle = (id: string) => {
    quote.reset();
    setProblem(null);
    setChosen((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  };
  const name = (id: string) => {
    const p = booking.passengers.find((x) => x.id === id);
    return p ? `${p.firstName} ${p.lastName}`.trim() : id;
  };

  if (booking.status !== 'CONFIRMED' || !t.pnr || active.length === 0) {
    return (
      <CheckoutShell
        step={4}
        service="train"
        title="Cancel ticket"
        back={{ to: trainBookingUrl(booking.reference), label: 'Back to booking' }}
      >
        <FormAlert>This booking has no active passengers to cancel.</FormAlert>
      </CheckoutShell>
    );
  }

  return (
    <CheckoutShell
      step={4}
      service="train"
      title="Cancel ticket"
      back={{ to: trainBookingUrl(booking.reference), label: 'Back to booking' }}
      aside={<TrainJourneySummary train={t.offer} travelClass={t.travelClass} quota={t.quota} />}
    >
      {t.provider === 'mock' && <DemoBanner service="train" />}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Who is cancelling? · PNR {t.pnr}</CardTitle>
          {!t.capabilities.partialCancellation && (
            <p className="text-sm text-muted">This railway provider cancels the whole ticket.</p>
          )}
        </CardHeader>
        <CardContent>
          <fieldset className="space-y-2">
            <legend className="sr-only">Passengers to cancel</legend>
            {active.map((p) => (
              <label
                key={p.passengerId}
                className="flex cursor-pointer flex-wrap items-center gap-3 rounded-xl border border-border p-3 text-sm"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={chosen.includes(p.passengerId)}
                  disabled={!t.capabilities.partialCancellation}
                  onChange={() => toggle(p.passengerId)}
                />
                <span className="flex-1 font-semibold">{name(p.passengerId)}</span>
                <span className="font-mono text-xs text-muted">{p.currentStatus ?? p.status}</span>
              </label>
            ))}
          </fieldset>
          {problem && (
            <p role="alert" className="mt-3 text-xs font-semibold text-danger">
              {problem}
            </p>
          )}
          <Button
            variant="outline"
            className="mt-4 w-full sm:w-auto"
            disabled={quote.isPending}
            onClick={() => {
              if (check()) quote.mutate();
            }}
          >
            {quote.isPending ? 'Checking…' : 'Check charges and refund'}
          </Button>
        </CardContent>
      </Card>

      {quote.error && <FormAlert>{errorMessage(quote.error)}</FormAlert>}
      {quote.data && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cancellation summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {quote.data.eligible ? (
              <dl className="space-y-1">
                <div className="flex justify-between">
                  <dt className="text-muted">Fare of selected passengers</dt>
                  <dd className="tabular-nums">{formatMoney(quote.data.farePaise)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Cancellation charges</dt>
                  <dd className="tabular-nums">−{formatMoney(quote.data.chargesPaise)}</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-extrabold">
                  <dt>Refund</dt>
                  <dd className="tabular-nums">{formatMoney(quote.data.refundPaise)}</dd>
                </div>
              </dl>
            ) : (
              <FormAlert>{quote.data.reason}</FormAlert>
            )}
            {quote.data.rules.length > 0 && (
              <details className="text-xs text-muted">
                <summary className="cursor-pointer font-semibold text-foreground">
                  Cancellation rules
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {quote.data.rules.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </details>
            )}
            {quote.data.eligible && (
              <Button
                variant="destructive"
                className="w-full sm:w-auto"
                onClick={() => {
                  if (check()) setConfirming(true);
                }}
              >
                <TicketX aria-hidden /> Cancel {chosen.length} passenger
                {chosen.length === 1 ? '' : 's'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={confirming} onOpenChange={(open) => !cancel.isPending && setConfirming(open)}>
        <DialogContent className="max-w-md">
          <DialogTitle>Cancel these passengers?</DialogTitle>
          <DialogDescription>
            {chosen.map(name).join(', ')} — this cannot be undone. Refund{' '}
            {quote.data ? formatMoney(quote.data.refundPaise) : ''} to the original payment method
            once the railway confirms.
          </DialogDescription>
          {cancel.error && <FormAlert>{errorMessage(cancel.error)}</FormAlert>}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button
              variant="outline"
              disabled={cancel.isPending}
              onClick={() => setConfirming(false)}
            >
              Keep ticket
            </Button>
            <Button
              variant="destructive"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate()}
            >
              {cancel.isPending ? 'Cancelling…' : 'Yes, cancel'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <p className="text-xs text-muted">
        Need help?{' '}
        <Link to="/faq" className="font-semibold text-primary hover:underline">
          Read the FAQ
        </Link>
        .
      </p>
    </CheckoutShell>
  );
}
