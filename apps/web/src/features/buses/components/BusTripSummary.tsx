import type { BusPoint, BusTripOffer } from '@zproo/types';
import { Badge, Card, CardContent } from '@zproo/ui';
import { Armchair, Star } from 'lucide-react';
import { duration, localDay } from '@/features/flights/format';
import { busTypeLabel, IST, istTime } from '../format';

interface BusTripSummaryProps {
  trip: BusTripOffer;
  boarding?: BusPoint | undefined;
  dropping?: BusPoint | undefined;
  seatNumbers?: string[];
}

/** Operator, coach, route with the chosen points, and seats. */
export function BusTripSummary({
  trip,
  boarding,
  dropping,
  seatNumbers,
}: BusTripSummaryProps) {
  const from = boarding ?? trip.boardingPoints[0];
  const to = dropping ?? trip.droppingPoints.at(-1);

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold">
              {trip.from.name} → {trip.to.name}
            </h3>

            <p className="text-sm text-muted">
              {trip.operator.name} · {trip.serviceNumber}
            </p>
          </div>

          <span className="text-sm text-muted">
            {localDay(trip.departureAt, IST)}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 text-sm">
          <div className="min-w-0">
            <p className="text-lg font-extrabold tabular-nums">
              {istTime(from?.time ?? trip.departureAt)}
            </p>

            <p className="font-semibold">{from?.name}</p>

            <p className="text-xs text-muted">{from?.address}</p>
          </div>

          <p className="pt-1.5 text-xs text-muted">
            {duration(trip.durationMinutes)}
          </p>

          <div className="min-w-0 text-right">
            <p className="text-lg font-extrabold tabular-nums">
              {istTime(to?.time ?? trip.arrivalAt)}
            </p>

            <p className="font-semibold">{to?.name}</p>

            <p className="text-xs text-muted">{to?.address}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="soft">
            {busTypeLabel(trip.bus)}
          </Badge>

          {/* GREEN RATING */}
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
            <Star
              aria-hidden
              className="size-3 fill-green-600 text-green-600"
            />

            {trip.operator.rating.toFixed(1)}
          </span>

          {/* SELECTED SEATS */}
          {seatNumbers && seatNumbers.length > 0 && (
            <Badge variant="outline">
              <Armchair aria-hidden className="size-3" />

              Seat{seatNumbers.length === 1 ? '' : 's'}{' '}

              {seatNumbers.join(', ')}
            </Badge>
          )}
        </div>

        <p className="text-xs text-muted">
          {trip.bus.name}
        </p>
      </CardContent>
    </Card>
  );
}