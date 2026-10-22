import type { TrainClass, TrainOffer, TrainQuota } from '@zproo/types';
import { Card, CardContent, CardHeader, CardTitle } from '@zproo/ui';
import { TrainFront } from 'lucide-react';
import { dayShift, duration, localDay } from '@/features/flights/format';
import { classLabel, IST, istTime, quotaLabel } from '../format';

/** Compact journey card for checkout asides, confirmation and booking pages. */
export function TrainJourneySummary({
  train,
  travelClass,
  quota,
}: {
  train: TrainOffer;
  travelClass: TrainClass;
  quota: TrainQuota;
}) {
  const shift = dayShift(train.departureAt, IST, train.arrivalAt, IST);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrainFront aria-hidden className="size-4 text-primary" />
          <span className="min-w-0 truncate">
            {train.trainNumber} {train.trainName}
          </span>
        </CardTitle>
        <p className="text-xs text-muted">
          {classLabel(travelClass)} · {quotaLabel(quota)} quota
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          <div className="min-w-0">
            <p className="text-lg font-extrabold tabular-nums">{istTime(train.departureAt)}</p>
            <p className="truncate font-semibold">{train.from.name}</p>
            <p className="text-xs text-muted">
              {train.from.code} · {localDay(train.departureAt, IST)}
            </p>
          </div>
          <p className="pt-1 text-center text-xs text-muted">
            {duration(train.durationMinutes)}
            <br />
            {train.distanceKm} km
          </p>
          <div className="min-w-0 text-right">
            <p className="text-lg font-extrabold tabular-nums">
              {istTime(train.arrivalAt)}
              {shift > 0 && (
                <sup className="ml-0.5 text-[10px] font-bold text-primary">+{shift}</sup>
              )}
            </p>
            <p className="truncate font-semibold">{train.to.name}</p>
            <p className="text-xs text-muted">
              {train.to.code} · {localDay(train.arrivalAt, IST)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
