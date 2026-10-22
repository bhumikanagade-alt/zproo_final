import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@zproo/ui';
import { ArrowLeft, ArrowRight, Star } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router';
import { Seo } from '@/components/seo/Seo';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { errorMessage } from '@/features/auth/errors';
import { useBusTrip } from '@/features/buses/api';
import { AmenityList } from '@/features/buses/components/AmenityList';
import { BusTripSummary } from '@/features/buses/components/BusTripSummary';
import { busSeatsUrl } from '@/features/buses/links';
import { istTime } from '@/features/buses/format';
import { DemoBanner } from '@/features/checkout/DemoBanner';
import { inr } from '@/features/flights/format';

/** "More than 24 hours before departure" style labels for the refund table. */
function policyRows(rules: { hoursBefore: number; refundPercent: number }[]) {
  return rules.map((r, i) => {
    const previous = rules[i - 1];
    const when =
      i === 0
        ? `More than ${r.hoursBefore} hours before departure`
        : r.hoursBefore > 0
          ? `${r.hoursBefore}–${previous?.hoursBefore} hours before`
          : `Less than ${previous?.hoursBefore} hours before`;
    return { when, refund: r.refundPercent === 0 ? 'No refund' : `${r.refundPercent}% refund` };
  });
}

export default function BusDetailsPage() {
  const { id } = useParams();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const { data: trip, isPending, error } = useBusTrip(id);

  if (isPending) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8 sm:px-6" aria-busy>
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }
  if (error || !trip) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-12 sm:px-6">
        <Seo title="Bus details" noIndex />
        <h1 className="text-2xl font-extrabold">Bus unavailable</h1>
        <FormAlert>{errorMessage(error)}</FormAlert>
        <Button asChild variant="outline">
          <Link to="/buses">
            <ArrowLeft aria-hidden /> Search buses
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <Seo title={`${trip.operator.name} ${trip.serviceNumber}`} noIndex />
      <Link
        to={from ?? '/buses'}
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> {from ? 'Back to results' : 'Search buses'}
      </Link>
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        {trip.from.name} → {trip.to.name}
      </h1>
      <p className="mt-1 text-muted">
        {trip.operator.name} · {trip.bus.name}
      </p>
      {trip.provider === 'mock' && (
        <div className="mt-4">
          <DemoBanner service="bus" />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <BusTripSummary trip={trip} />
          <Card><CardContent className="py-7 text-center"><p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Passenger ratings</p><div className="mt-2 flex items-center justify-center gap-2"><Star className="size-6 fill-current text-primary" aria-hidden /><span className="text-3xl font-extrabold">{trip.operator.rating.toFixed(1)}</span><span className="text-sm text-muted">/ 5</span></div><p className="mt-1 text-sm text-muted">Based on available operator rating data.</p></CardContent></Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Amenities</CardTitle>
            </CardHeader>
            <CardContent>
              <AmenityList amenities={trip.amenities} />
            </CardContent>
          </Card>
          <div className="grid gap-6 sm:grid-cols-2">
            {(
              [
                ['Boarding points', trip.boardingPoints],
                ['Dropping points', trip.droppingPoints],
              ] as const
            ).map(([title, points]) => (
              <Card key={title}>
                <CardHeader>
                  <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-3 text-sm">
                    {points.map((p) => (
                      <li key={p.id} className="flex gap-3">
                        <span className="w-12 shrink-0 font-bold tabular-nums">
                          {istTime(p.time)}
                        </span>
                        <span>
                          <span className="block font-semibold">{p.name}</span>
                          <span className="block text-xs text-muted">{p.address}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cancellation policy</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  {policyRows(trip.cancellationPolicy).map((r) => (
                    <tr key={r.when}>
                      <td className="py-2 text-muted">{r.when}</td>
                      <td className="py-2 text-right font-semibold">{r.refund}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-[calc(var(--header-height)+1rem)] lg:self-start">
          <Card>
            <CardContent className="space-y-1 p-5">
              <p className="text-sm text-muted">Seats from</p>
              <p className="text-2xl font-extrabold tabular-nums">{inr(trip.fromPaise)}</p>
              <p className="text-sm text-muted">
                {trip.seatsAvailable} of {trip.totalSeats} seats available
              </p>
            </CardContent>
          </Card>
          <Button asChild size="lg" className="w-full">
            <Link to={busSeatsUrl(trip.id)} state={from ? { from } : undefined}>
              Select seats <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
