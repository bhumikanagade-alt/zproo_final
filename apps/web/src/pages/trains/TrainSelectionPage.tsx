import { TrainClass, TrainQuota, type TrainOffer, type TrainQuote } from '@zproo/types';
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@zproo/ui';
import { AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { errorMessage } from '@/features/auth/errors';
import { CheckoutShell } from '@/features/checkout/CheckoutShell';
import { DemoBanner } from '@/features/checkout/DemoBanner';
import { PriceSummary } from '@/features/checkout/PriceSummary';
import { travelDate } from '@/features/flights/format';
import { trainsUrl } from '@/features/search/url';
import { useTrainOffer, useTrainQuote } from '@/features/trains/api';
import { AvailabilityBadge } from '@/features/trains/components/AvailabilityBadge';
import { RouteStops } from '@/features/trains/components/RouteStops';
import { TrainJourneySummary } from '@/features/trains/components/TrainJourneySummary';
import { useTrainDraft } from '@/features/trains/draft';
import { classLabel, istTime, quotaLabel, runningDaysLabel } from '@/features/trains/format';
import { useTrainCursor } from '@/features/trains/useTrainCursor';

const isClass = (v: string | null): v is TrainClass => Boolean(v && v in TrainClass);
const isQuota = (v: string | null): v is TrainQuota => Boolean(v && v in TrainQuota);

/** The chosen train and class: live availability, warnings and the server-quoted fare. */
export default function TrainSelectionPage() {
  useTrainCursor();
  const [params] = useSearchParams();
  const offerId = params.get('offer') ?? '';
  const cls = params.get('class');
  const quotaParam = params.get('quota') ?? 'GN';
  const passengers = Math.min(6, Math.max(1, Number(params.get('passengers')) || 1));
  if (!offerId || !isClass(cls) || !isQuota(quotaParam)) {
    return (
      <CheckoutShell step={0} service="train" title="Choose a train">
        <FormAlert>This link is incomplete. Search again and pick a train and class.</FormAlert>
        <Button asChild>
          <Link to="/trains">Search trains</Link>
        </Button>
      </CheckoutShell>
    );
  }
  return (
    <Selection offerId={offerId} travelClass={cls} quota={quotaParam} passengers={passengers} />
  );
}

function Selection({
  offerId,
  travelClass,
  quota,
  passengers,
}: {
  offerId: string;
  travelClass: TrainClass;
  quota: TrainQuota;
  passengers: number;
}) {
  const navigate = useNavigate();
  const start = useTrainDraft((s) => s.start);
  const offer = useTrainOffer(offerId, quota);
  const input = useMemo(
    () => ({ offerId, travelClass, quota, passengers }),
    [offerId, travelClass, quota, passengers],
  );
  const quote = useTrainQuote(input);
  const train = offer.data;
  const resultsUrl = train
    ? trainsUrl({
        from: train.from.code,
        to: train.to.code,
        date: train.date,
        travelClass: 'ALL',
        quota,
        passengers,
      })
    : '/trains';
  const refreshing = offer.isFetching || quote.isFetching;

  return (
    <CheckoutShell
      step={0}
      service="train"
      title="Your train"
      back={{ to: resultsUrl, label: 'Change train' }}
      aside={
        quote.data ? (
          <>
            <PriceSummary
              price={quote.data.price}
              title={`Fare for ${passengers} passenger${passengers === 1 ? '' : 's'}`}
            />
            {train && <TrainJourneySummary train={train} travelClass={travelClass} quota={quota} />}
          </>
        ) : (
          <Skeleton className="h-64 rounded-2xl" />
        )
      }
    >
      {offer.error || quote.error ? (
        <div className="space-y-3">
          <FormAlert>{errorMessage(offer.error ?? quote.error)}</FormAlert>
          <Button asChild variant="outline">
            <Link to={resultsUrl}>Back to results</Link>
          </Button>
        </div>
      ) : !train || !quote.data ? (
        <Skeleton className="h-80 rounded-2xl" />
      ) : (
        <>
          {quote.data.demo && <DemoBanner service="train" />}
          <SelectionDetails train={train} quote={quote.data} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => {
                void offer.refetch();
                void quote.refetch();
              }}
              disabled={refreshing}
            >
              <RefreshCw aria-hidden className={refreshing ? 'animate-spin' : undefined} />
              {refreshing ? 'Checking…' : 'Refresh availability'}
            </Button>
            <Button
              size="lg"
              disabled={!quote.data.availability.bookable || refreshing}
              onClick={() => {
                start({ offerId, travelClass, quota, train, passengers, resultsUrl });
                void navigate('/trains/booking');
              }}
            >
              Continue to passengers <ArrowRight aria-hidden />
            </Button>
          </div>
        </>
      )}
    </CheckoutShell>
  );
}

function SelectionDetails({ train, quote }: { train: TrainOffer; quote: TrainQuote }) {
  const a = quote.availability;
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {train.trainNumber} {train.trainName}
          </CardTitle>
          <p className="text-sm text-muted">
            {travelDate(train.date)} · departs {train.from.name} {istTime(train.departureAt)} ·{' '}
            {runningDaysLabel(train.runningDays)}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">Class</dt>
              <dd className="font-bold">{classLabel(quote.travelClass)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">Quota</dt>
              <dd className="font-bold">{quotaLabel(quote.quota)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">Passengers</dt>
              <dd className="font-bold">{quote.passengers}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">Availability</dt>
              <dd>
                <AvailabilityBadge availability={a} />
              </dd>
            </div>
          </dl>
          <p className="text-xs text-muted">
            Availability checked at {istTime(a.checkedAt)}. It can change until the railway confirms
            your booking after payment.
          </p>
          {!a.bookable && (
            <FormAlert>
              {a.note ?? `${a.label}: this class can't be booked now.`} Choose another class, quota
              or date.
            </FormAlert>
          )}
          {quote.warnings.length > 0 && (
            <div
              role={a.status === 'AVAILABLE' ? 'note' : 'alert'}
              className="space-y-1 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-amber-900"
            >
              <p className="flex items-center gap-2 font-bold">
                <AlertTriangle aria-hidden className="size-4" /> Before you book
              </p>
              <ul className="list-disc space-y-1 pl-5">
                {quote.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Route</CardTitle>
        </CardHeader>
        <CardContent>
          <RouteStops stops={train.stops} />
        </CardContent>
      </Card>
    </>
  );
}
