import {
  addDays,
  busSearchSchema,
  todayIso,
  type BusSearch,
} from '@zproo/validation';

import {
  CalendarDays,
  MapPin,
  Navigation,
} from 'lucide-react';

import { useState } from 'react';
import { Controller } from 'react-hook-form';

import BusCalendar from '../../../components/calendar/BusCalendar';

import { PlaceCombobox } from '../components/PlaceCombobox';
import { SearchButton } from '../components/SearchButton';
import { SwapButton } from '../components/SwapButton';
import { CITY_OPTIONS } from '../components/options';

import { busesUrl } from '../url';
import { useSearchForm } from '../useSearchForm';

import { QuickDates } from './QuickDates';

/** `initial` pre-fills the form (the results page's "Modify search"). */
export function BusSearchForm({
  initial,
}: {
  initial?: BusSearch;
}) {
  const today = todayIso();

  const [womenBooking, setWomenBooking] = useState(false);

  const [showCalendar, setShowCalendar] = useState(false);

  const { form, onSubmit } = useSearchForm(
    busSearchSchema,
    initial ?? {
      from: 'pune',
      to: 'mumbai',
      date: addDays(today, 1),
    },
    busesUrl,
  );

  const {
    control,
    getValues,
    setValue,
    watch,
    formState,
  } = form;

  const errors = formState.errors;

  // watch() (not getValues) so the displayed date re-renders when Today / Tomorrow is picked.
  const travelDate = watch('date');

  /**
   * Convert YYYY-MM-DD into a local Date object.
   *
   * Using T00:00:00 prevents timezone-related date shifting.
   */
  const selectedCalendarDate = travelDate
    ? new Date(`${travelDate}T00:00:00`)
    : new Date();

  /**
   * Format date for display inside the search form.
   */
  const formattedTravelDate = travelDate
    ? new Date(`${travelDate}T00:00:00`).toLocaleDateString(
        'en-IN',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        },
      )
    : 'Select date';

  /**
   * Show weekday below the travel date.
   */
  const travelWeekday = travelDate
    ? new Date(`${travelDate}T00:00:00`).toLocaleDateString(
        'en-IN',
        {
          weekday: 'long',
        },
      )
    : '';

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label="Search buses"
      className="space-y-4"
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.8fr)] lg:items-start">
        {/* =========================================================
            FROM + SWAP + TO
        ========================================================= */}

        <div className="relative grid gap-3 sm:grid-cols-2 lg:col-span-2">
          <Controller
            control={control}
            name="from"
            render={({ field }) => (
              <PlaceCombobox
                label="From"
                value={field.value}
                onChange={field.onChange}
                options={CITY_OPTIONS}
                placeholder="Leaving from"
                icon={<Navigation aria-hidden />}
                error={errors.from?.message}
              />
            )}
          />

          <SwapButton
            onClick={() => {
              const from = getValues('from');
              const to = getValues('to');

              setValue('from', to);
              setValue('to', from);
            }}
            className="absolute right-6 top-[3.2rem] sm:left-1/2 sm:right-auto sm:top-3.5 sm:-translate-x-1/2"
          />

          <Controller
            control={control}
            name="to"
            render={({ field }) => (
              <PlaceCombobox
                label="To"
                value={field.value}
                onChange={field.onChange}
                options={CITY_OPTIONS}
                placeholder="Going to"
                icon={<MapPin aria-hidden />}
                error={errors.to?.message}
              />
            )}
          />
        </div>

        {/* =========================================================
            TRAVEL DATE
            Custom calendar button.
            NO input type="date" here.
        ========================================================= */}

        <div className="relative w-full">
          <div className="w-full">
            <label
              htmlFor="travel-date-button"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground"
            >
              Travel date
            </label>

            <button
              id="travel-date-button"
              type="button"
              onClick={() =>
                setShowCalendar((current) => !current)
              }
              aria-haspopup="dialog"
              aria-expanded={showCalendar}
              className={[
                'flex w-full items-center gap-3',
                'rounded-2xl border bg-background',
                'px-4 py-3 text-left',
                'transition-all duration-200',
                'focus:outline-none focus-visible:ring-2',
                'focus-visible:ring-primary/30',

                showCalendar
                  ? 'border-[#e50920] shadow-[0_0_0_2px_rgba(229,9,32,0.10)]'
                  : 'border-border hover:border-[#e50920]/60',
              ].join(' ')}
            >
              {/* Calendar icon */}
              <span
                className={[
                  'grid size-10 shrink-0 place-items-center',
                  'rounded-xl',
                  showCalendar
                    ? 'bg-red-50 text-[#e50920]'
                    : 'bg-primary/5 text-primary',
                ].join(' ')}
              >
                <CalendarDays
                  className="size-5"
                  aria-hidden="true"
                />
              </span>

              {/* Date text */}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold leading-tight text-foreground">
                  {formattedTravelDate}
                </span>

                <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
                  {travelWeekday}
                </span>
              </span>
            </button>

            {/* Error */}
            {errors.date?.message && (
              <p className="mt-1 text-xs font-medium text-destructive">
                {errors.date.message}
              </p>
            )}
          </div>

          {/* =======================================================
              CUSTOM CALENDAR
          ======================================================= */}

          {showCalendar && (
            <BusCalendar
              selectedDate={selectedCalendarDate}
              onSelectDate={(date) => {
                const year = date.getFullYear();

                const month = String(
                  date.getMonth() + 1,
                ).padStart(2, '0');

                const day = String(
                  date.getDate(),
                ).padStart(2, '0');

                const formattedDate = `${year}-${month}-${day}`;

                setValue('date', formattedDate, {
                  shouldValidate: true,
                  shouldDirty: true,
                });

                setShowCalendar(false);
              }}
              onClose={() => setShowCalendar(false)}
            />
          )}
        </div>

        {/* =========================================================
            SEARCH + WOMEN BOOKING
        ========================================================= */}

        <div className="flex w-full flex-col gap-2">
          <SearchButton
            label="Search Buses"
            className="w-full lg:h-[4.25rem]"
          />

          <button
            type="button"
            onClick={() =>
              setWomenBooking((current) => !current)
            }
            aria-pressed={womenBooking}
            aria-label="Booking for women"
            className={[
              'flex h-[3rem] w-[98%] items-center',
              'rounded-full border px-2',
              'transition-all duration-200',
              'focus:outline-none focus-visible:ring-2',
              'focus-visible:ring-primary/30',

              womenBooking
                ? 'border-pink-500 bg-pink-700 text-white shadow-md'
                : 'border-pink-300 bg-pink-200 text-pink-700 shadow-sm hover:border-pink-500 hover:shadow-md',
            ].join(' ')}
          >
            <span
              className={[
                'grid size-7 shrink-0 place-items-center',
                'rounded-full text-sm',

                womenBooking
                  ? 'bg-white/15'
                  : 'bg-primary-light',
              ].join(' ')}
              aria-hidden="true"
            >
              👩🏻
            </span>

            <span
              className={[
                'ml-1 flex-1 whitespace-nowrap',
                'text-left text-[11px] font-bold leading-none',

                womenBooking
                  ? 'text-primary-foreground'
                  : 'text-foreground',
              ].join(' ')}
            >
              Booking for women
            </span>

            <span
              className={[
                'relative ml-1 h-5 w-8 shrink-0',
                'rounded-full p-0.5',
                'transition-colors duration-200',

                womenBooking
                  ? 'bg-white/25'
                  : 'bg-gray-200',
              ].join(' ')}
              aria-hidden="true"
            >
              <span
                className={[
                  'block size-4 rounded-full bg-white shadow-sm',
                  'transition-transform duration-200',

                  womenBooking
                    ? 'translate-x-3'
                    : 'translate-x-0',
                ].join(' ')}
              />
            </span>
          </button>
        </div>
      </div>

      {/* =========================================================
          QUICK DATES
      ========================================================= */}

      <QuickDates
        selected={travelDate}
        onPick={(date) => {
          setValue('date', date, {
            shouldValidate: true,
            shouldDirty: true,
          });
          setShowCalendar(false);
          // On the results page ("Modify search") refresh the buses for the new date straight away.
          if (initial) void onSubmit();
        }}
      />
    </form>
  );
}