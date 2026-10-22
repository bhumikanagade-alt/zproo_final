import { Button, cn } from '@zproo/ui';
import { CalendarDays, MapPin, Pencil } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { formatDateTime, formatDuration, parseLocal } from '../dates';
import type { PickupLocation, RentalSchedule } from '../types';
import { validateSchedule, type Errors, type ScheduleKey } from '../validation';
import { ScheduleFields } from './ScheduleFields';
import { BikeNameField } from './BikeNameField';
import { focusRing } from './ui';

interface Props {
  schedule: RentalSchedule;
  locations: readonly PickupLocation[];
  locationsFailed?: boolean;
  onRetryLocations?: () => void;
  onChange: (patch: Partial<RentalSchedule>) => void;
  query: string;
  onQueryChange: (q: string) => void;
}

/**
 * Compact search bar for the results page: bike search box always visible; rental dates and
 * locations summarised, with "Modify" to open the same fields used on the landing page.
 */
export function ResultsSummaryBar({ schedule, locations, locationsFailed, onRetryLocations, onChange, query, onQueryChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Errors<ScheduleKey>>({});
  const start = parseLocal(schedule.pickupDate, schedule.pickupTime);
  const end = parseLocal(schedule.returnDate, schedule.returnTime);
  const hours = start && end ? (end.getTime() - start.getTime()) / 3_600_000 : 0;

  const apply = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateSchedule(schedule, 4, new Date(), { cityOnly: true });
    setErrors(errs);
    if (Object.keys(errs).length) {
      window.setTimeout(() => (document.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus(), 0);
      return;
    }
    setEditing(false);
  };

  return (
    <form onSubmit={apply} noValidate aria-label="Search and rental dates" className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <BikeNameField id="bike-q" label="Search by bike name or model" value={query} onChange={onQueryChange} />
        <Button type="button" variant="outline" aria-expanded={editing} aria-controls="bike-schedule" onClick={() => setEditing((v) => !v)} className="w-full lg:w-auto">
          <Pencil aria-hidden /> {editing ? 'Hide rental details' : 'Modify rental'}
        </Button>
      </div>

      {!editing && (
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-sm" aria-label="Rental summary">
          <li className="flex items-center gap-1.5"><MapPin aria-hidden className="size-4 text-primary" /><span className="font-semibold">{schedule.pickupCity || 'Choose a pickup city'}</span></li>
          <li className="flex items-center gap-1.5 text-muted"><CalendarDays aria-hidden className="size-4 text-primary" />{start && end ? <span>{formatDateTime(start)} → {formatDateTime(end)} <span className="font-semibold text-foreground">({formatDuration(hours)})</span></span> : 'Choose rental dates'}</li>
        </ul>
      )}

      <div id="bike-schedule" hidden={!editing} className="mt-4 border-t border-border pt-4">
        {locationsFailed ? (
          <p role="alert" className="text-sm text-danger">Could not load pickup locations. <button type="button" onClick={onRetryLocations} className={cn('font-semibold underline', focusRing)}>Retry</button></p>
        ) : (
          <ScheduleFields schedule={schedule} locations={locations} onChange={onChange} errors={errors} />
        )}
        <div className="mt-4 flex justify-end"><Button type="submit">Update results</Button></div>
      </div>
    </form>
  );
}
