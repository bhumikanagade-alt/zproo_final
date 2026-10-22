import type { BusPoint, BusTripOffer } from '@zproo/types';
import { ExternalLink, MapPin, Navigation } from 'lucide-react';
import { istTime } from '../format';

interface BusRouteMapProps {
  trip: BusTripOffer;
  boarding?: BusPoint | undefined;
  dropping?: BusPoint | undefined;
}

/** Full text of a point, used as the exact search location on the map. */
const place = (p: BusPoint | undefined, city: string) =>
  p ? `${p.name}, ${p.address}, ${city}` : city;

export function busRouteLinks(from: string, to: string) {
  const s = encodeURIComponent(from);
  const d = encodeURIComponent(to);
  return {
    embed: `https://www.google.com/maps?saddr=${s}&daddr=${d}&output=embed`,
    open: `https://www.google.com/maps/dir/?api=1&origin=${s}&destination=${d}&travelmode=driving`,
    boardingOnly: `https://www.google.com/maps/search/?api=1&query=${s}`,
    droppingOnly: `https://www.google.com/maps/search/?api=1&query=${d}`,
  };
}

/** Embedded Google route map between the chosen boarding and dropping points. */
export function BusRouteMap({ trip, boarding, dropping }: BusRouteMapProps) {
  const from = boarding ?? trip.boardingPoints[0];
  const to = dropping ?? trip.droppingPoints.at(-1);
  const origin = place(from, trip.from.name);
  const destination = place(to, trip.to.name);
  const links = busRouteLinks(origin, destination);

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <iframe
        title={`Route map from ${from?.name ?? trip.from.name} to ${to?.name ?? trip.to.name}`}
        src={links.embed}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        className="h-72 w-full border-0 sm:h-96"
      />

      <div className="space-y-3 bg-card p-4">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-bold">
              <MapPin aria-hidden className="size-4 text-green-600" /> Boarding
              {from && <span className="tabular-nums text-muted"> · {istTime(from.time)}</span>}
            </p>
            <p className="mt-1 break-words font-semibold">{from?.name ?? trip.from.name}</p>
            <p className="break-words text-xs text-muted">{from?.address}</p>
            <a
              href={links.boardingOnly}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs font-bold text-primary"
            >
              View exact location
            </a>
          </div>

          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-bold">
              <MapPin aria-hidden className="size-4 text-red-600" /> Dropping
              {to && <span className="tabular-nums text-muted"> · {istTime(to.time)}</span>}
            </p>
            <p className="mt-1 break-words font-semibold">{to?.name ?? trip.to.name}</p>
            <p className="break-words text-xs text-muted">{to?.address}</p>
            <a
              href={links.droppingOnly}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs font-bold text-primary"
            >
              View exact location
            </a>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={links.open}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-bold"
          >
            Open map <ExternalLink aria-hidden className="size-4" />
          </a>
          <a
            href={links.open}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white"
          >
            <Navigation aria-hidden className="size-4" /> Directions
          </a>
        </div>
      </div>
    </div>
  );
}
