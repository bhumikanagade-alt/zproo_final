import type { TrainOffer, TrainQuota } from '@zproo/types';
import { Badge, Button, cn } from '@zproo/ui';
import { useMutation } from '@tanstack/react-query';
import { ChevronDown, RefreshCw, Utensils } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { errorMessage } from '@/features/auth/errors';
import { dayShift, duration, inr } from '@/features/flights/format';
import { apiGet } from '@/services/http';
import { trainSelectionUrl } from '../links';
import { classLabel, IST, istTime, runningDaysLabel } from '../format';
import { AvailabilityBadge } from './AvailabilityBadge';
import { RouteStops } from './RouteStops';

interface TrainCardProps {
  train: TrainOffer;
  quota: TrainQuota;
  passengers: number;
  /** Classes to show (after the class filter). */
  classes?: TrainOffer['classes'];
}

/** One train in the results: times, route, and every class with availability and fare. */
export function TrainCard({ train: initial, quota, passengers, classes }: TrainCardProps) {
  // The card's own "refresh" result wins until the page's results are newer.
  const [fresh, setFresh] = useState<TrainOffer | null>(null);
  const checked = (t: TrainOffer) => t.classes[0]?.availability.checkedAt ?? '';
  const train = fresh && checked(fresh) > checked(initial) ? fresh : initial;
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const shift = dayShift(train.departureAt, IST, train.arrivalAt, IST);
  const shown = classes
    ? train.classes.filter((c) => classes.some((x) => x.travelClass === c.travelClass))
    : train.classes;
  const chosen = shown.find((c) => c.travelClass === selected);

  const refresh = useMutation({
    mutationFn: () =>
      apiGet<TrainOffer>(`/trains/offers/${encodeURIComponent(train.id)}`, { params: { quota } }),
    onSuccess: (offer) => setFresh(offer),
  });
  const checkedAt = train.classes[0]?.availability.checkedAt;

  return (
    <article
      aria-label={`${train.trainNumber} ${train.trainName}, departs ${istTime(train.departureAt)}`}
      className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">
            <span className="tabular-nums">{train.trainNumber}</span> {train.trainName}
          </p>
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <span>{train.trainType}</span>
            <span aria-hidden>·</span>
            <span>{runningDaysLabel(train.runningDays)}</span>
          </p>
        </div>
        {train.pantry && (
          <Badge variant="outline">
            <Utensils aria-hidden className="size-3" /> Pantry
          </Badge>
        )}
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-lg font-extrabold tabular-nums">{istTime(train.departureAt)}</p>
          <p className="truncate text-xs text-muted" title={`${train.from.name} (${train.from.code})`}>
            {train.from.name} ({train.from.code})
          </p>
        </div>
        <div className="whitespace-nowrap text-center text-[11px] text-muted sm:text-xs">
          <p>{duration(train.durationMinutes)}</p>
          <div className="my-1 h-px bg-border" />
          <p>
            {Math.max(0, train.stops.length - 2)} stop{train.stops.length - 2 === 1 ? '' : 's'} ·{' '}
            {train.distanceKm} km
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-lg font-extrabold tabular-nums">
            {istTime(train.arrivalAt)}
            {shift > 0 && (
              <sup
                className="ml-0.5 text-[10px] font-bold text-primary"
                title={`Arrives ${shift} day${shift > 1 ? 's' : ''} later`}
              >
                +{shift}
              </sup>
            )}
          </p>
          <p className="truncate text-xs text-muted" title={`${train.to.name} (${train.to.code})`}>
            {train.to.name} ({train.to.code})
          </p>
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label={`Classes on ${train.trainNumber}`}
        className="mt-4 grid grid-cols-2 gap-2 min-[560px]:grid-cols-3 lg:grid-cols-4"
      >
        {shown.map((c) => {
          const active = selected === c.travelClass;
          return (
            <button
              key={c.travelClass}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${classLabel(c.travelClass)}, ${c.availability.label}${c.fare ? `, ${inr(c.fare.totalPaise)}` : ''}`}
              onClick={() => setSelected(active ? null : c.travelClass)}
              className={cn(
                'flex min-w-0 flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                active
                  ? 'border-primary bg-primary-light'
                  : 'border-border hover:border-foreground/30',
                !c.availability.bookable && 'opacity-80',
              )}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="text-sm font-extrabold">{c.travelClass}</span>
                {c.fare && (
                  <span className="text-sm font-bold tabular-nums">{inr(c.fare.totalPaise)}</span>
                )}
              </span>
              <AvailabilityBadge availability={c.availability} showWords={false} />
              {c.availability.note && (
                <span className="text-[11px] leading-4 text-muted">{c.availability.note}</span>
              )}
            </button>
          );
        })}
      </div>

      {chosen && (
        <div className="mt-3 flex flex-col gap-3 rounded-xl border border-border bg-background px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-sm">
            <span className="font-semibold">{classLabel(chosen.travelClass)}</span>{' '}
            <AvailabilityBadge availability={chosen.availability} className="ml-1" />
          </p>
          {chosen.availability.bookable && chosen.fare ? (
            <Button asChild size="sm" className="w-full sm:w-auto">
              <Link
                to={trainSelectionUrl({
                  offerId: train.id,
                  travelClass: chosen.travelClass,
                  quota,
                  passengers,
                })}
              >
                Continue · {inr(chosen.fare.totalPaise * passengers)}
              </Link>
            </Button>
          ) : (
            <span className="text-sm font-semibold text-muted">Not bookable now</span>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 text-sm">
        <button
          type="button"
          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          Route & stops
          <ChevronDown
            aria-hidden
            className={cn('size-4 transition-transform', open && 'rotate-180')}
          />
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline disabled:opacity-60"
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
        >
          <RefreshCw aria-hidden className={cn('size-4', refresh.isPending && 'animate-spin')} />
          {refresh.isPending ? 'Checking…' : 'Refresh availability'}
        </button>
        {checkedAt && <span className="text-xs text-muted">Checked {istTime(checkedAt)}</span>}
      </div>
      {refresh.error && <FormAlert>{errorMessage(refresh.error)}</FormAlert>}
      {open && (
        <div id={panelId} className="mt-3 border-t border-border pt-3">
          <RouteStops stops={train.stops} />
        </div>
      )}
    </article>
  );
}
