import { addDays, cabSearchSchema, todayIso } from '@zproo/validation';
import { cn } from '@zproo/ui';
import { CalendarDays, Clock, MapPin, Navigation } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { Controller, useWatch, type UseFormRegisterReturn } from 'react-hook-form';
import { BikeSearchPanel } from '@/features/bikes/components/BikeSearchPanel';
import { DateField } from '../components/DateField';
import { FieldShell } from '../components/FieldShell';
import { fieldInputClass } from '../components/fieldStyles';
import { SearchButton } from '../components/SearchButton';
import { cabsUrl } from '../url';
import { useSearchForm } from '../useSearchForm';

function AddressField({
  label,
  placeholder,
  icon,
  error,
  registration,
}: {
  label: string;
  placeholder: string;
  icon: ReactNode;
  error?: string | undefined;
  registration: UseFormRegisterReturn;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} icon={icon} error={error}>
      <input
        id={id}
        placeholder={placeholder}
        autoComplete="street-address"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={fieldInputClass}
        {...registration}
      />
      <p className="text-xs text-muted">Area, landmark or address</p>
    </FieldShell>
  );
}

export function CabSearchForm() {
  const today = todayIso();
  const timeId = useId();
  const { form, onSubmit } = useSearchForm(
    cabSearchSchema,
    { pickup: '', drop: '', when: 'NOW', date: undefined, time: undefined },
    cabsUrl,
  );
  const { control, register, setValue, formState } = form;
  const errors = formState.errors;
  const when = useWatch({ control, name: 'when' });
  return (
    <form onSubmit={onSubmit} noValidate aria-label="Book a cab" className="space-y-4">
      <div role="radiogroup" aria-label="Pickup time" className="flex gap-2">
        {(
          [
            ['NOW', 'Ride now'],
            ['LATER', 'Schedule'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={when === value}
            onClick={() => {
              setValue('when', value);
              if (value === 'LATER') {
                setValue('date', todayIso());
                setValue('time', '09:00');
              }
            }}
            className={cn(
              'h-9 rounded-full px-4 text-sm font-semibold transition-colors',
              when === value
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-foreground/70 ring-1 ring-border',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className={cn(
          'grid gap-3 lg:items-start',
          when === 'LATER'
            ? 'lg:grid-cols-[1fr_1fr_0.7fr_0.6fr_0.8fr]'
            : 'lg:grid-cols-[1fr_1fr_0.8fr]',
        )}
      >
        <AddressField
          label="Pickup"
          placeholder="Where are you?"
          icon={<Navigation aria-hidden />}
          error={errors.pickup?.message}
          registration={register('pickup')}
        />
        <AddressField
          label="Drop"
          placeholder="Where to?"
          icon={<MapPin aria-hidden />}
          error={errors.drop?.message}
          registration={register('drop')}
        />
        {when === 'LATER' && (
          <>
            <Controller
              control={control}
              name="date"
              render={({ field }) => (
                <DateField
                  label="Date"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  min={today}
                  max={addDays(today, 30)}
                  icon={<CalendarDays aria-hidden />}
                  error={errors.date?.message}
                />
              )}
            />
            <FieldShell
              id={timeId}
              label="Time"
              icon={<Clock aria-hidden />}
              error={errors.time?.message}
            >
              <input id={timeId} type="time" className={fieldInputClass} {...register('time')} />
              <p className="text-xs text-muted">Pickup time</p>
            </FieldShell>
          </>
        )}
        <SearchButton label="See Cab Fares" className="lg:h-[4.25rem]" />
      </div>
      <p className="text-xs text-muted">Mini · Sedan · SUV · Premium — no surge pricing.</p>
    </form>
  );
}

/** Bike rental search (pickup hub + dates). Shares its form with the Bikes landing page. */
export function BikeSearchForm() {
  return <BikeSearchPanel />;
}
