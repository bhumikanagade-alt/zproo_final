import { Badge, Button, cn } from '@zproo/ui';
import { Cog, Fuel, Star, Zap } from 'lucide-react';
import { Link } from 'react-router';
import { bikeLinks } from '../links';
import { rupees } from '../pricing';
import { CATEGORY_META } from '../rules';
import type { Bike } from '../types';
import { BikeImage } from './BikeImage';
import { AvailabilityBadge, focusRing } from './ui';

export function BikeCard({ bike }: { bike: Bike }) {
  const unavailable = bike.availability.status === 'unavailable';
  const Fuelicon = bike.fuelType === 'electric' ? Zap : Fuel;
  return (
    <article
      aria-labelledby={`bike-${bike.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <Link to={bikeLinks.details(bike.id)} tabIndex={-1} aria-hidden className="relative block aspect-[3/2] overflow-hidden bg-neutral-100">
        <BikeImage image={bike.images[0]} className={cn('transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none', unavailable && 'opacity-60 grayscale')} />
        {bike.tag && <Badge className="absolute left-3 top-3 shadow">{bike.tag}</Badge>}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 id={`bike-${bike.id}`} className="text-base font-bold leading-snug">
              <Link to={bikeLinks.details(bike.id)} className={cn('rounded hover:text-primary', focusRing)}>
                {bike.name}
              </Link>
            </h3>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold">
              <Star aria-hidden className="size-4 fill-warning text-warning" />
              <span>{bike.rating.toFixed(1)}</span>
              <span className="sr-only"> out of 5 stars</span>
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted">
            Model {bike.model} · {bike.year}
          </p>
        </div>

        <ul className="flex flex-wrap gap-2 text-xs">
          <li><Badge variant="soft">{CATEGORY_META[bike.category].label}</Badge></li>
          <li>
            <Badge variant="outline"><Cog aria-hidden className="size-3" />{bike.transmission === 'manual' ? 'Manual' : 'Automatic'}</Badge>
          </li>
          <li>
            <Badge variant="outline"><Fuelicon aria-hidden className="size-3" />{bike.fuelType === 'electric' ? 'Electric' : 'Petrol'}</Badge>
          </li>
        </ul>

        <AvailabilityBadge status={bike.availability.status} unitsLeft={bike.availability.unitsLeft} />

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-3">
          <div>
            <p className="text-xs text-muted">Rental from</p>
            <p className="text-xl font-bold leading-6">
              {rupees(bike.pricing.daily)}
              <span className="text-xs font-medium text-muted"> /day</span>
            </p>
            <p className="text-xs text-muted">or {rupees(bike.pricing.hourly)}/hr</p>
          </div>
          <Button asChild size="sm" variant={unavailable ? 'outline' : 'default'}>
            <Link to={bikeLinks.details(bike.id)} aria-label={`View details for ${bike.name}`}>
              View Details
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function BikeCardSkeleton() {
  return (
    <div aria-hidden className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="aspect-[3/2] animate-pulse bg-border/60" />
      <div className="space-y-3 p-4">
        <div className="h-5 w-3/4 animate-pulse rounded bg-border/60" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-border/60" />
        <div className="flex gap-2">
          <div className="h-5 w-16 animate-pulse rounded-full bg-border/60" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-border/60" />
        </div>
        <div className="h-9 w-full animate-pulse rounded-full bg-border/60" />
      </div>
    </div>
  );
}
