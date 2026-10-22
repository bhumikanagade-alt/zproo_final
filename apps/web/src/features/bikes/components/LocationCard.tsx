import { Clock, MapPin, Phone } from 'lucide-react';
import { formatClock } from '../dates';
import type { PickupLocation } from '../types';

export function LocationCard({ title, location }: { title: string; location: PickupLocation | undefined }) {
  if (!location) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1">Select a location to see its address and hours.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border p-4 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{title}</p>
      <p className="mt-1 text-base font-bold">{location.name}</p>
      {location.city && <p className="text-xs text-muted">{location.area}, {location.city}</p>}
      <ul className="mt-2 space-y-1.5 text-muted">
        <li className="flex gap-2"><MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" /><span>{location.address}<span className="block text-xs">{location.landmark}</span></span></li>
        <li className="flex gap-2"><Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" /><span>Open {formatClock(location.opensAt)} – {formatClock(location.closesAt)}, daily</span></li>
        <li className="flex gap-2"><Phone aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" /><span>{location.contact}</span></li>
      </ul>
    </div>
  );
}
