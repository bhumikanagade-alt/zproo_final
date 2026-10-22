import { CalendarClock, MapPin } from 'lucide-react';
import { CATEGORY_META } from '../rules';
import { formatClock, formatDateTime, parseLocal } from '../dates';
import { rupees } from '../pricing';
import type { Bike, CustomerDetails, PickupLocation, RentalExtra, RentalSchedule } from '../types';
import { BikeImage } from './BikeImage';

/** Compact bike header used in the booking sidebar and the review / confirmation summaries. */
export function BikeMiniCard({ bike }: { bike: Bike }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
        <BikeImage image={bike.images[0]} />
      </div>
      <div className="min-w-0">
        <p className="truncate font-bold">{bike.name}</p>
        <p className="truncate text-xs text-muted">
          Model {bike.model} · {CATEGORY_META[bike.category].label} · {bike.transmission === 'manual' ? 'Manual' : 'Automatic'}
        </p>
        <p className="text-xs text-muted">{rupees(bike.pricing.daily)}/day</p>
      </div>
    </div>
  );
}

function Leg({ title, when, location }: { title: string; when: Date | null; location: PickupLocation | undefined }) {
  return (
    <div className="rounded-xl border border-border p-4 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{title}</p>
      <p className="mt-1 flex items-start gap-2 font-semibold">
        <CalendarClock aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
        {when ? formatDateTime(when) : '—'}
      </p>
      <p className="mt-2 flex items-start gap-2 text-muted">
        <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
        <span>
          <span className="font-semibold text-foreground">{location?.name ?? '—'}</span>
          {location && (
            <>
              {location.city && <span className="block text-xs font-medium text-primary">{location.area}, {location.city}</span>}
              <span className="block">{location.address}</span>
              <span className="block text-xs">
                Open {formatClock(location.opensAt)} – {formatClock(location.closesAt)} · {location.contact}
              </span>
            </>
          )}
        </span>
      </p>
    </div>
  );
}

interface RentalSummaryProps {
  schedule: RentalSchedule;
  pickup: PickupLocation | undefined;
  returnLocation: PickupLocation | undefined;
  extras: readonly RentalExtra[];
}

/** Pickup and return legs plus the chosen add-ons. */
export function RentalSummary({ schedule, pickup, returnLocation, extras }: RentalSummaryProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Leg title="Pickup" when={parseLocal(schedule.pickupDate, schedule.pickupTime)} location={pickup} />
        <Leg title="Return" when={parseLocal(schedule.returnDate, schedule.returnTime)} location={returnLocation} />
      </div>
      <p className="text-sm text-muted">
        <span className="font-semibold text-foreground">Add-ons: </span>
        {extras.length ? extras.map((x) => x.label).join(', ') : 'None selected'}
      </p>
    </div>
  );
}

/** Last four characters only, so a printed or shared confirmation does not expose the full licence number. */
export const maskLicence = (n: string) => (n.length > 4 ? `${'•'.repeat(n.length - 4)}${n.slice(-4)}` : n);

export function RiderDetails({ customer, maskId = false }: { customer: CustomerDetails; maskId?: boolean }) {
  const rows: [string, string][] = [
    ['Name', customer.fullName],
    ['Mobile', `+91 ${customer.mobile}`],
    ['Email', customer.email],
    ['Date of birth', customer.dateOfBirth],
    ['Driving licence', maskId ? maskLicence(customer.licenceNumber) : customer.licenceNumber],
    ['Address', customer.address],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 sm:block">
          <dt className="text-xs font-medium text-muted">{k}</dt>
          <dd className="break-words text-right font-semibold sm:text-left">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
