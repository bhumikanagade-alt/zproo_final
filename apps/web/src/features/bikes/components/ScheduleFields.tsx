import { cn } from '@zproo/ui';
import { useMemo } from 'react';
import { formatClock, timeSlots, toIsoDate } from '../dates';
import type { PickupLocation, RentalSchedule } from '../types';
import type { Errors, ScheduleKey } from '../validation';
import { SelectField, TextField, focusRing } from './ui';

interface Props {
  schedule: RentalSchedule;
  locations: readonly PickupLocation[];
  onChange: (patch: Partial<RentalSchedule>) => void;
  errors?: Errors<ScheduleKey>;
  /** Areas (hubs) the selected bike is not stocked at are disabled in the pickup list. */
  allowedPickupIds?: readonly string[] | undefined;
  className?: string;
  /** "stack": one column (booking card). "row": responsive grid (search bar). */
  layout?: 'stack' | 'row';
  /**
   * "city": pickup city + dates (search steps: landing, results, bike details).
   * "areas": pickup city + the pickup / return area inside that city + dates (rental details page).
   */
  mode?: 'city' | 'areas';
}

/**
 * Pickup city (and, on the rental details page, the pickup / return area within that city) plus
 * date/time selection, shared by the listing search bar, the details page booking card and the
 * booking form.
 */
export function ScheduleFields({ schedule, locations, onChange, errors = {}, allowedPickupIds, className, layout = 'row', mode = 'city' }: Props) {
  const slots = useMemo(() => timeSlots(), []);
  const today = toIsoDate(new Date());
  const cities = useMemo(() => [...new Set(locations.map((l) => l.city))], [locations]);
  const cityHubs = useMemo(() => locations.filter((l) => l.city === schedule.pickupCity), [locations, schedule.pickupCity]);
  const differentReturn = schedule.returnLocationId !== schedule.pickupLocationId;
  const grid = layout === 'row' ? 'sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1';
  const topGrid = layout === 'row' ? 'md:grid-cols-2' : 'grid-cols-1';

  const isStocked = (id: string) => (allowedPickupIds ? allowedPickupIds.includes(id) : true);
  const noneStocked = mode === 'areas' && cityHubs.length > 0 && cityHubs.every((l) => !isStocked(l.id));
  const pickupHub = cityHubs.find((l) => l.id === schedule.pickupLocationId);

  // Changing the city clears the areas: they belong to the previous city.
  const setCity = (city: string) => onChange({ pickupCity: city, pickupLocationId: '', returnLocationId: '' });

  const setPickupArea = (id: string) =>
    onChange(differentReturn ? { pickupLocationId: id } : { pickupLocationId: id, returnLocationId: id });

  const timeOptions = (
    <>
      <option value="">Select</option>
      {slots.map((s) => (
        <option key={s} value={s}>
          {formatClock(s)}
        </option>
      ))}
    </>
  );

  return (
    <div className={cn('space-y-3', className)}>
      <div className={cn('grid gap-3', topGrid)}>
        <SelectField label="Pickup city" value={schedule.pickupCity} error={errors.pickupCity} onChange={(e) => setCity(e.target.value)}>
          <option value="">Select pickup city</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>

        {mode === 'areas' && (
          <SelectField
            label="Pickup area"
            value={schedule.pickupLocationId}
            error={errors.pickupLocationId}
            disabled={!schedule.pickupCity}
            hint={
              noneStocked
                ? `This bike is not stocked in ${schedule.pickupCity}. Choose another city.`
                : pickupHub
                  ? `${pickupHub.name} · ${pickupHub.address}`
                  : schedule.pickupCity
                    ? `Areas in ${schedule.pickupCity}`
                    : 'Choose a city first'
            }
            onChange={(e) => setPickupArea(e.target.value)}
          >
            <option value="">{schedule.pickupCity ? 'Select pickup area' : 'Select a city first'}</option>
            {cityHubs.map((l) => (
              <option key={l.id} value={l.id} disabled={!isStocked(l.id)}>
                {l.area}
                {!isStocked(l.id) ? ' (not stocked here)' : ''}
              </option>
            ))}
          </SelectField>
        )}
      </div>

      {mode === 'areas' && (
        <>
          <label className={cn('inline-flex items-center gap-2 rounded text-sm', schedule.pickupLocationId ? 'cursor-pointer' : 'cursor-not-allowed opacity-60', focusRing)}>
            <input
              type="checkbox"
              checked={differentReturn}
              disabled={!schedule.pickupLocationId}
              onChange={(e) => onChange({ returnLocationId: e.target.checked ? '' : schedule.pickupLocationId })}
              className="size-4 accent-[var(--primary)]"
            />
            Return to a different area <span className="text-xs text-muted">(one-way fee applies)</span>
          </label>
          {differentReturn && (
            <div className={cn('grid gap-3', topGrid)}>
              <SelectField label="Return area" value={schedule.returnLocationId} error={errors.returnLocationId} onChange={(e) => onChange({ returnLocationId: e.target.value })}>
                <option value="">Select return area</option>
                {cityHubs
                  .filter((l) => l.id !== schedule.pickupLocationId)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.area}
                    </option>
                  ))}
              </SelectField>
            </div>
          )}
        </>
      )}

      <div className={cn('grid gap-3', grid)}>
        <TextField label="Pickup date" type="date" min={today} value={schedule.pickupDate} error={errors.pickupDate} onChange={(e) => onChange({ pickupDate: e.target.value })} />
        <SelectField label="Pickup time" value={schedule.pickupTime} error={errors.pickupTime} onChange={(e) => onChange({ pickupTime: e.target.value })}>
          {timeOptions}
        </SelectField>
        <TextField label="Return date" type="date" min={schedule.pickupDate || today} value={schedule.returnDate} error={errors.returnDate} onChange={(e) => onChange({ returnDate: e.target.value })} />
        <SelectField label="Return time" value={schedule.returnTime} error={errors.returnTime} onChange={(e) => onChange({ returnTime: e.target.value })}>
          {timeOptions}
        </SelectField>
      </div>
    </div>
  );
}
