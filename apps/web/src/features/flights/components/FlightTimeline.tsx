import type { FlightOffer } from '@zproo/types';
import { Luggage, Plane } from 'lucide-react';
import { duration, localDay, localTime } from '../format';
import { AirlineMark } from './AirlineMark';

/** Segment-by-segment itinerary with layovers and baggage (details panel, offer page, review). */
export function FlightTimeline({ offer }: { offer: FlightOffer }) {
  return (
    <div className="space-y-4">
      {offer.segments.map((seg, i) => {
        const layover = offer.layovers[i];
        return (
          <div key={`${seg.flightNumber}-${i}`}>
            <div className="flex gap-3">
              <AirlineMark code={seg.airline.code} className="size-8 text-[10px]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {seg.airline.name} · {seg.flightNumber}
                  <span className="ml-2 font-normal text-muted">{seg.aircraft}</span>
                </p>
                <div className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-3 text-sm">
                  <div>
                    <p className="text-base font-bold tabular-nums">
                      {localTime(seg.departureAt, seg.from.timezone)}
                    </p>
                    <p className="text-xs text-muted">
                      {localDay(seg.departureAt, seg.from.timezone)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span className="h-px flex-1 bg-border" />
                    <Plane aria-hidden className="size-3.5" />
                    {duration(seg.durationMinutes)}
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold tabular-nums">
                      {localTime(seg.arrivalAt, seg.to.timezone)}
                    </p>
                    <p className="text-xs text-muted">{localDay(seg.arrivalAt, seg.to.timezone)}</p>
                  </div>
                </div>
                <div className="mt-1 flex justify-between gap-3 text-xs text-muted">
                  <span>
                    {seg.from.code} · {seg.from.name}
                  </span>
                  <span className="text-right">
                    {seg.to.code} · {seg.to.name}
                  </span>
                </div>
              </div>
            </div>
            {layover && (
              <p className="my-3 rounded-lg bg-background px-3 py-2 text-center text-xs font-medium text-muted">
                {duration(layover.minutes)} layover in {layover.airport.city} (
                {layover.airport.code})
              </p>
            )}
          </div>
        );
      })}
      <p className="flex items-center gap-2 text-xs text-muted">
        <Luggage aria-hidden className="size-4" />
        Cabin {offer.baggage.cabinKg} kg ·{' '}
        {offer.baggage.checkInKg > 0
          ? `Check-in ${offer.baggage.checkInKg} kg`
          : 'No check-in baggage'}{' '}
        per adult
      </p>
    </div>
  );
}
