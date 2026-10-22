import { CABIN_CLASS_LABELS, CabinClass, TripType } from '@zproo/types';
import {
  addDays,
  CABIN_BAG_OPTIONS_KG,
  CHECKED_BAG_OPTIONS_KG,
  flightSearchSchema,
  todayIso,
  type FlightSearch,
} from '@zproo/validation';
import { cn } from '@zproo/ui';
import {
  CalendarDays,
  Luggage,
  Plus,
  PlaneLanding,
  PlaneTakeoff,
  Trash2,
  Users,
} from 'lucide-react';
import { baggagePreferenceSummary } from '@/features/flights/baggage';
import { Controller, useFieldArray, useWatch } from 'react-hook-form';
import { DateField } from '../components/DateField';
import { PlaceCombobox } from '../components/PlaceCombobox';
import { PopoverField } from '../components/PopoverField';
import { SearchButton } from '../components/SearchButton';
import { Stepper } from '../components/Stepper';
import { SwapButton } from '../components/SwapButton';
import { AIRPORT_OPTIONS } from '../components/options';
import { flightsUrl } from '../url';
import { useSearchForm } from '../useSearchForm';

const TRIP_LABELS: Record<TripType, string> = {
  ONE_WAY: 'One Way',
  ROUND_TRIP: 'Round Trip',
  MULTI_CITY: 'Multi City',
};

/** `initial` pre-fills the form (the results page's "Modify search"). */
export function FlightSearchForm({ initial }: { initial?: FlightSearch }) {
  const today = todayIso();
  const { form, onSubmit } = useSearchForm(
    flightSearchSchema,
    initial ?? {
      tripType: 'ONE_WAY',
      legs: [{ from: 'PNQ', to: 'DEL', date: addDays(today, 7) }],
      returnDate: undefined,
      adults: 1,
      children: 0,
      infants: 0,
      cabin: 'ECONOMY',
      cabinBagKg: undefined,
      checkedBagKg: undefined,
    },
    flightsUrl,
  );
  const { control, setValue, getValues, formState } = form;
  const legs = useFieldArray({ control, name: 'legs' });
  const tripType = useWatch({ control, name: 'tripType' }) as TripType;
  const [adults, children, infants, cabin, cabinBagKg, checkedBagKg] = useWatch({
    control,
    name: ['adults', 'children', 'infants', 'cabin', 'cabinBagKg', 'checkedBagKg'],
  }) as [number, number, number, CabinClass, number | undefined, number | undefined];
  const errors = formState.errors;
  const travellers = adults + children + infants;
  const revalidate = { shouldValidate: formState.isSubmitted };
  /** "1 Adult, Economy" — adults, then children and infants when there are any. */
  const paxSummary = [
    `${adults} Adult${adults === 1 ? '' : 's'}`,
    children > 0 ? `${children} Child${children === 1 ? '' : 'ren'}` : '',
    infants > 0 ? `${infants} Infant${infants === 1 ? '' : 's'}` : '',
  ]
    .filter(Boolean)
    .join(', ');

  const setTrip = (next: TripType) => {
    setValue('tripType', next);
    const current = getValues('legs') as { from: string; to: string; date: string }[];
    if (next === 'MULTI_CITY' && current.length < 2) {
      const last = current[0] ?? { from: 'PNQ', to: 'DEL', date: addDays(today, 7) };
      legs.append({ from: last.to, to: '', date: addDays(last.date, 3) });
    }
    if (next !== 'MULTI_CITY' && current.length > 1) legs.replace(current.slice(0, 1));
    if (next === 'ROUND_TRIP') {
      // Return appears with a valid default, never earlier than departure.
      const departure = getValues('legs.0.date') || addDays(today, 7);
      const currentReturn = getValues('returnDate');
      if (!currentReturn || currentReturn < departure) {
        setValue('returnDate', addDays(departure, 3), revalidate);
      }
    } else {
      setValue('returnDate', undefined);
    }
  };

  const travellersField = (
    <PopoverField
      label="Travellers + Cabin"
      summary={`${paxSummary}, ${CABIN_CLASS_LABELS[cabin]}`}
      detail={`${travellers} Traveller${travellers === 1 ? '' : 's'}`}
      icon={<Users aria-hidden />}
      error={errors.children?.message ?? errors.infants?.message ?? errors.adults?.message}
    >
      <Stepper
        label="Adults"
        hint="12+ years"
        value={adults}
        min={1}
        max={9}
        onChange={(v) => setValue('adults', v, { shouldValidate: formState.isSubmitted })}
      />
      <Stepper
        label="Children"
        hint="2–11 years"
        value={children}
        min={0}
        max={8}
        onChange={(v) => setValue('children', v, { shouldValidate: formState.isSubmitted })}
      />
      <Stepper
        label="Infants"
        hint="Under 2 years, on lap"
        value={infants}
        min={0}
        max={adults}
        onChange={(v) => setValue('infants', v, { shouldValidate: formState.isSubmitted })}
      />
      <fieldset className="mt-2 border-t border-border pt-3">
        <legend className="mb-2 text-sm font-bold">Cabin class</legend>
        <div className="grid grid-cols-2 gap-2">
          {Object.values(CabinClass).map((c) => (
            <label
              key={c}
              className={cn(
                'cursor-pointer rounded-xl border px-3 py-2 text-center text-xs font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                cabin === c
                  ? 'border-primary bg-primary-light text-primary'
                  : 'border-border hover:border-foreground/30',
              )}
            >
              <input
                type="radio"
                name="cabin"
                value={c}
                checked={cabin === c}
                onChange={() => setValue('cabin', c)}
                className="sr-only"
              />
              {CABIN_CLASS_LABELS[c]}
            </label>
          ))}
        </div>
      </fieldset>
    </PopoverField>
  );

  const baggageSummary = baggagePreferenceSummary(cabinBagKg, checkedBagKg);
  const baggageField = (
    <PopoverField
      label="Baggage"
      summary={baggageSummary ?? 'Add baggage'}
      detail="Cabin + checked"
      icon={<Luggage aria-hidden />}
      error={errors.cabinBagKg?.message ?? errors.checkedBagKg?.message}
    >
      <BagChoice
        name="cabin-baggage"
        legend="Cabin Baggage"
        options={CABIN_BAG_OPTIONS_KG}
        value={cabinBagKg}
        onChange={(kg) => setValue('cabinBagKg', kg, revalidate)}
      />
      <BagChoice
        name="checked-baggage"
        legend="Checked Baggage"
        options={CHECKED_BAG_OPTIONS_KG}
        value={checkedBagKg}
        onChange={(kg) => setValue('checkedBagKg', kg, revalidate)}
      />
      {baggageSummary && (
        <button
          type="button"
          onClick={() => {
            setValue('cabinBagKg', undefined, revalidate);
            setValue('checkedBagKg', undefined, revalidate);
          }}
          className="mt-3 text-xs font-semibold text-primary hover:underline"
        >
          Clear baggage
        </button>
      )}
    </PopoverField>
  );

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Search flights" className="space-y-4">
      <div role="radiogroup" aria-label="Trip type" className="flex flex-wrap gap-2">
        {Object.values(TripType).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={tripType === t}
            onClick={() => setTrip(t)}
            className={cn(
              'h-9 rounded-full px-4 text-sm font-semibold transition-colors',
              tripType === t
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-background text-foreground/70 ring-1 ring-border hover:text-foreground',
            )}
          >
            {TRIP_LABELS[t]}
          </button>
        ))}
      </div>

      {tripType !== 'MULTI_CITY' ? (
        <div
          className={cn(
            'grid gap-3 sm:grid-cols-2',
            tripType === 'ROUND_TRIP'
              ? 'lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,0.85fr)_minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,0.9fr)]'
              : 'lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.15fr)_minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,0.9fr)]',
          )}
        >
          <RouteFields index={0} control={control} errors={errors} onSwap={() => swap(0)} />
          <Controller
            control={control}
            name="legs.0.date"
            render={({ field }) => (
              <DateField
                styledCalendar
                label="Departure"
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  // Return can never be before departure.
                  const ret = getValues('returnDate');
                  if (tripType === 'ROUND_TRIP' && v && ret && ret < v) {
                    setValue('returnDate', v, revalidate);
                  }
                }}
                min={today}
                max={addDays(today, 365)}
                icon={<CalendarDays aria-hidden />}
                error={errors.legs?.[0]?.date?.message}
              />
            )}
          />
          {tripType === 'ROUND_TRIP' && (
            <Controller
              control={control}
              name="returnDate"
              render={({ field }) => (
                <DateField
                  styledCalendar
                  label="Return"
                  value={field.value ?? ''}
                  onChange={(v) => field.onChange(v || undefined)}
                  min={getValues('legs.0.date') || today}
                  max={addDays(today, 365)}
                  icon={<CalendarDays aria-hidden />}
                  emptyHint="Select return"
                  error={errors.returnDate?.message}
                />
              )}
            />
          )}
          {travellersField}
          {baggageField}
        </div>
      ) : (
        <div className="space-y-3">
          {legs.fields.map((leg, i) => (
            <fieldset
              key={leg.id}
              className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] lg:items-start"
            >
              <legend className="sr-only">Flight {i + 1}</legend>
              <span
                aria-hidden
                className="hidden h-[4.25rem] items-center text-sm font-bold text-muted lg:flex"
              >
                {i + 1}
              </span>
              <RouteFields index={i} control={control} errors={errors} onSwap={() => swap(i)} />
              <Controller
                control={control}
                name={`legs.${i}.date`}
                render={({ field }) => (
                  <DateField
                    styledCalendar
                    label={`Date · Flight ${i + 1}`}
                    value={field.value}
                    onChange={field.onChange}
                    min={i > 0 ? getValues(`legs.${i - 1}.date`) || today : today}
                    max={addDays(today, 365)}
                    error={errors.legs?.[i]?.date?.message}
                  />
                )}
              />
              <button
                type="button"
                onClick={() => legs.remove(i)}
                disabled={legs.fields.length <= 2}
                aria-label={`Remove flight ${i + 1}`}
                className="grid h-10 w-10 place-items-center self-center rounded-full text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:invisible"
              >
                <Trash2 aria-hidden className="size-4" />
              </button>
            </fieldset>
          ))}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]">
            <button
              type="button"
              disabled={legs.fields.length >= 5}
              onClick={() => {
                const last = getValues(`legs.${legs.fields.length - 1}`) as {
                  to: string;
                  date: string;
                };
                legs.append({ from: last.to, to: '', date: addDays(last.date || today, 3) });
              }}
              className="flex h-[4.25rem] items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/50 px-5 text-sm font-bold text-primary transition-colors hover:bg-primary-light disabled:opacity-40"
            >
              <Plus aria-hidden className="size-4" /> Add flight
            </button>
            {travellersField}
            {baggageField}
          </div>
          {errors.legs?.root?.message && (
            <p className="text-xs font-semibold text-danger">{errors.legs.root.message}</p>
          )}
        </div>
      )}

      <SearchButton label="Search Flights" className="lg:mx-auto lg:flex lg:w-72" />
    </form>
  );

  function swap(i: number) {
    const from = getValues(`legs.${i}.from`);
    setValue(`legs.${i}.from`, getValues(`legs.${i}.to`), revalidate);
    setValue(`legs.${i}.to`, from, revalidate);
  }
}

type FlightForm = ReturnType<typeof useSearchForm<typeof flightSearchSchema>>['form'];

function RouteFields({
  index,
  control,
  errors,
  onSwap,
}: {
  index: number;
  control: FlightForm['control'];
  errors: FlightForm['formState']['errors'];
  onSwap: () => void;
}) {
  return (
    <div className="relative col-span-full grid gap-3 sm:grid-cols-2 lg:col-span-2">
      <Controller
        control={control}
        name={`legs.${index}.from`}
        render={({ field }) => (
          <PlaceCombobox
            label="From"
            value={field.value}
            onChange={field.onChange}
            options={AIRPORT_OPTIONS}
            placeholder="City or airport"
            icon={<PlaneTakeoff aria-hidden />}
            error={errors.legs?.[index]?.from?.message}
          />
        )}
      />
      <SwapButton
        onClick={onSwap}
        className="absolute right-6 top-[3.2rem] sm:left-1/2 sm:right-auto sm:top-3.5 sm:-translate-x-1/2"
      />
      <Controller
        control={control}
        name={`legs.${index}.to`}
        render={({ field }) => (
          <PlaceCombobox
            label="To"
            value={field.value}
            onChange={field.onChange}
            options={AIRPORT_OPTIONS}
            placeholder="City or airport"
            icon={<PlaneLanding aria-hidden />}
            error={errors.legs?.[index]?.to?.message}
          />
        )}
      />
    </div>
  );
}

/** Radio chips for one baggage allowance (0 = no bag). */
function BagChoice({
  name,
  legend,
  options,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  options: readonly number[];
  value: number | undefined;
  onChange: (kg: number) => void;
}) {
  return (
    <fieldset className="mt-2 border-t border-border pt-3 first:mt-0 first:border-t-0 first:pt-0">
      <legend className="mb-2 text-sm font-bold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((kg) => (
          <label
            key={kg}
            className={cn(
              'cursor-pointer rounded-xl border px-3 py-2 text-center text-xs font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
              value === kg
                ? 'border-primary bg-primary-light text-primary'
                : 'border-border hover:border-foreground/30',
            )}
          >
            <input
              type="radio"
              name={name}
              value={kg}
              checked={value === kg}
              onChange={() => onChange(kg)}
              className="sr-only"
            />
            {kg === 0 ? 'No Bag' : `${kg} Kg`}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
