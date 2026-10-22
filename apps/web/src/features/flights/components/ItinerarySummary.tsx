import type { FlightOffer } from '@zproo/types';
import { Badge, Card, CardContent } from '@zproo/ui';
import { duration, localDay, localTime, stopsLabel } from '../format';
import { AirlineMark } from './AirlineMark';
import { FlightTimeline } from './FlightTimeline';

/** One card per leg: route, date, times and (optionally) the full segment timeline. */
export function ItinerarySummary({
  offers,
  detailed = false,
}: {
  offers: FlightOffer[];
  detailed?: boolean;
}) {
  return (
    <div className="space-y-3">
      {offers.map((offer, i) => (
        <Card key={offer.id}>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold">
                {offers.length > 1 && <span className="mr-2 text-muted">Flight {i + 1}</span>}
                {offer.from.city} → {offer.to.city}
              </h3>
              <span className="text-sm text-muted">
                {localDay(offer.departureAt, offer.from.timezone)}
              </span>
            </div>
            {detailed ? (
              <FlightTimeline offer={offer} />
            ) : (
              <div className="flex items-center gap-3 text-sm">
                <AirlineMark code={offer.airline.code} className="size-8 text-[10px]" />
                <span className="font-semibold">
                  {localTime(offer.departureAt, offer.from.timezone)} –{' '}
                  {localTime(offer.arrivalAt, offer.to.timezone)}
                </span>
                <span className="text-muted">
                  {duration(offer.durationMinutes)} · {stopsLabel(offer.stops)} ·{' '}
                  {offer.flightNumber}
                </span>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Badge variant="soft">{offer.fareFamily}</Badge>
              {offer.refundable ? (
                <Badge variant="success">Refundable</Badge>
              ) : (
                <Badge variant="outline">Non-refundable</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
