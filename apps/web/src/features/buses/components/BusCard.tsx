import type { BusTripOffer } from '@zproo/types';
import { Badge, Button, cn } from '@zproo/ui';
import { BatteryCharging, ChevronDown, Snowflake, Star } from 'lucide-react';
import { useId, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { dayShift, duration, inr } from '@/features/flights/format';
import { busTypeLabel, IST, istTime } from '../format';
import { AmenityList } from './AmenityList';

interface BusCardProps {
  trip: BusTripOffer;
  seatsHref: string;
  detailsHref: string;
}

export function BusCard({ trip, seatsHref, detailsHref }: BusCardProps) {
  const location = useLocation();
  // Lets the seat and details pages link back to these exact results.
  const from = { from: location.pathname + location.search };
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const shift = dayShift(trip.departureAt, IST, trip.arrivalAt, IST);
  const boarding = trip.boardingPoints[0];
  const dropping = trip.droppingPoints.at(-1);
  const rating = trip.operator.rating;
  return (
    <article
      aria-label={`${trip.operator.name}, ${busTypeLabel(trip.bus)}, departs ${istTime(trip.departureAt)}, from ${inr(trip.fromPaise)}`}
      className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold">{trip.operator.name}</p>
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <span>{busTypeLabel(trip.bus)}</span>
            <span aria-hidden>·</span>
            <span>{trip.serviceNumber}</span>
          </p>
        </div>
        <span
  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-white"
  style={{ backgroundColor: '#16a34a' }}
  title={`${trip.operator.ratingCount.toLocaleString('en-IN')} ratings`}
>
  <Star
    aria-hidden
    className="size-3 fill-white text-white"
  />
  {rating.toFixed(1)}
</span>
      </div>

      <div className="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="text-lg font-extrabold tabular-nums">{istTime(trip.departureAt)}</p>
          <p className="max-w-[9rem] truncate text-xs text-muted sm:max-w-[12rem]">
            {boarding?.name}
          </p>
        </div>
        <div className="whitespace-nowrap text-center text-xs text-muted">
          <p>{duration(trip.durationMinutes)}</p>
          <div className="my-1 h-px bg-border" />
          <p>{trip.distanceKm} km</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-lg font-extrabold tabular-nums">
            {istTime(trip.arrivalAt)}
            {shift > 0 && (
              <sup
                className="ml-0.5 text-[10px] font-bold text-primary"
                title={`Arrives ${shift} day later`}
              >
                +{shift}
              </sup>
            )}
          </p>
          <p className="ml-auto max-w-[9rem] truncate text-xs text-muted sm:max-w-[12rem]">
            {dropping?.name}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-2">
          {trip.bus.ac && (
            <Badge variant="outline">
              <Snowflake aria-hidden className="size-3" /> A/C
            </Badge>
          )}
          {trip.bus.electric && (
            <Badge variant="success">
              <BatteryCharging aria-hidden className="size-3" /> Electric
            </Badge>
          )}
          <span
            className={cn(
              'text-xs font-semibold',
              trip.seatsAvailable <= 5 ? 'text-danger' : 'text-muted',
            )}
          >
            {trip.seatsAvailable} seat{trip.seatsAvailable === 1 ? '' : 's'} left
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted">from</p>
            <p className="text-xl font-extrabold tabular-nums">{inr(trip.fromPaise)}</p>
          </div>
          <Button asChild size="sm">
            <Link to={seatsHref} state={from}>
              Select seats
            </Link>
          </Button>
        </div>
      </div>

      <button
        type="button"
        className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        Amenities, points & policy
        <ChevronDown
          aria-hidden
          className={cn('size-4 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div id={panelId} className="mt-3 space-y-3 border-t border-border pt-3 text-sm">
          <AmenityList amenities={trip.amenities} />
          <p className="text-muted">
            Boarding: {trip.boardingPoints.map((p) => `${p.name} ${istTime(p.time)}`).join(' · ')}
          </p>
          <p className="text-muted">
            Dropping: {trip.droppingPoints.map((p) => `${p.name} ${istTime(p.time)}`).join(' · ')}
          </p>
          <Link
            to={detailsHref}
            className="inline-block font-semibold text-primary hover:underline"
          >
            Full details and cancellation policy
          </Link>
        </div>
      )}
    </article>
  );
}
