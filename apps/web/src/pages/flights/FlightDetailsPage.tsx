import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@zproo/ui';
import { flightPriceBreakdown } from '@zproo/utils';
import { ArrowLeft, ArrowRight, BadgeCheck, CircleX, Luggage } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { errorMessage } from '@/features/auth/errors';
import { useFlightOffer } from '@/features/flights/api';
import { DemoBanner } from '@/features/checkout/DemoBanner';
import { FlightTimeline } from '@/features/flights/components/FlightTimeline';
import { PriceSummary } from '@/features/checkout/PriceSummary';
import { useFlightDraft } from '@/features/flights/draft';
import { inr, localDay, stopsLabel, travellersLabel } from '@/features/flights/format';

const count = (value: string | null, fallback: number, max: number) => {
  const n = Number(value ?? fallback);
  return Number.isInteger(n) && n >= 0 && n <= max ? n : fallback;
};

export default function FlightDetailsPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  // The results page passes its own URL, so "change flight" can return to the same search.
  const from = (useLocation().state as { from?: string } | null)?.from;
  const startDraft = useFlightDraft((s) => s.start);
  const pax = {
    adults: Math.max(1, count(params.get('adults'), 1, 9)),
    children: count(params.get('children'), 0, 8),
    infants: count(params.get('infants'), 0, 9),
  };
  const { data: offer, isPending, error } = useFlightOffer(id, pax);

  if (isPending) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8 sm:px-6" aria-busy>
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }
  if (error || !offer) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-12 sm:px-6">
        <Seo title="Flight details" noIndex />
        <h1 className="text-2xl font-extrabold">Flight unavailable</h1>
        <FormAlert>{errorMessage(error)}</FormAlert>
        <Button asChild variant="outline">
          <Link to="/flights">
            <ArrowLeft aria-hidden /> Search flights
          </Link>
        </Button>
      </div>
    );
  }

  const book = () => {
    startDraft({
      offerIds: [offer.id],
      pax,
      expectedTotalPaise: offer.totalPaise,
      searchUrl: from ?? '/flights',
    });
    void navigate('/flights/booking');
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <Seo title={`${offer.airline.name} ${offer.flightNumber}`} noIndex />
      <Link
        to={from ?? '/flights'}
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> {from ? 'Back to results' : 'Search flights'}
      </Link>
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        {offer.from.city} → {offer.to.city}
      </h1>
      <p className="mt-1 text-muted">
        {localDay(offer.departureAt, offer.from.timezone)} · {stopsLabel(offer.stops)} ·{' '}
        {offer.airline.name} {offer.flightNumber}
      </p>
      {offer.provider === 'mock' && (
        <div className="mt-4">
          <DemoBanner />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Itinerary</CardTitle>
            </CardHeader>
            <CardContent>
              <FlightTimeline offer={offer} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{offer.fareFamily} fare rules</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  {offer.refundable ? (
                    <BadgeCheck aria-hidden className="mt-0.5 size-4 text-success" />
                  ) : (
                    <CircleX aria-hidden className="mt-0.5 size-4 text-danger" />
                  )}
                  <span>
                    {offer.refundable
                      ? `Refundable. An airline cancellation charge of ${inr(offer.cancellationFeePaise ?? 0)} per passenger applies.`
                      : 'Non-refundable. If you cancel, only statutory taxes and airport fees are refunded.'}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Luggage aria-hidden className="mt-0.5 size-4 text-muted" />
                  <span>
                    Cabin bag {offer.baggage.cabinKg} kg.{' '}
                    {offer.baggage.checkInKg > 0
                      ? `Check-in baggage ${offer.baggage.checkInKg} kg per adult and child.`
                      : 'No check-in baggage included.'}{' '}
                    Infants: one cabin bag up to 7 kg.
                  </span>
                </li>
                <li className="text-muted">
                  Carry a government-issued photo ID. Check-in closes 45 minutes before domestic and
                  60 minutes before international departures.
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-[calc(var(--header-height)+1rem)] lg:self-start">
          <PriceSummary
            price={flightPriceBreakdown([offer], pax)}
            title={`Fare for ${travellersLabel(pax)}`}
          />
          {offer.seatsLeft <= 5 && (
            <p className="text-center text-sm font-semibold text-amber-800">
              Only {offer.seatsLeft} seats left at this fare
            </p>
          )}
          <Button size="lg" className="w-full" onClick={book}>
            Book this flight <ArrowRight aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
