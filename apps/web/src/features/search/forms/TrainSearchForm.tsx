import { TRAIN_CLASS_LABELS, TRAIN_QUOTA_LABELS, TrainClass, type TrainQuota } from '@zproo/types';
import {
  addDays,
  todayIso,
  TRAIN_MAX_PASSENGERS,
  TRAIN_MAX_TATKAL_PASSENGERS,
  TRAIN_SEARCH_MAX_DAYS,
  trainSearchSchema,
  type TrainSearch,
} from '@zproo/validation';
import { AlertCircle, BadgePercent, CalendarDays, MapPin, Navigation, Ticket, Users } from 'lucide-react';
import { useId } from 'react';
import { Controller } from 'react-hook-form';
import { useTrainCapabilities } from '@/features/trains/api';
import { DateField } from '../components/DateField';
import { FieldShell } from '../components/FieldShell';
import { fieldInputClass } from '../components/fieldStyles';
import { PlaceCombobox } from '../components/PlaceCombobox';
import { SearchButton } from '../components/SearchButton';
import { SwapButton } from '../components/SwapButton';
import { STATION_OPTIONS } from '../components/options';
import { trainsUrl } from '../url';
import { useSearchForm } from '../useSearchForm';
import { QuickDates } from './QuickDates';

/** Quotas shown before the provider's capabilities load (General is always offered). */
const FALLBACK_QUOTAS: TrainQuota[] = ['GN'];

/** `initial` pre-fills the form (the results page's "Modify search"). */
export function TrainSearchForm({ initial }: { initial?: TrainSearch }) {
  const today = todayIso();
  const classId = useId();
  const quotaId = useId();
  const paxId = useId();
  const { data: caps } = useTrainCapabilities();
  const quotas = caps?.quotas ?? FALLBACK_QUOTAS;
  const classes = caps?.classes ?? Object.values(TrainClass);
  const { form, onSubmit } = useSearchForm(
    trainSearchSchema,
    initial ?? { from: 'PUNE', to: 'NDLS', date: addDays(today, 3), travelClass: 'ALL', quota: 'GN', passengers: 1 },
    trainsUrl,
  );
  const { control, getValues, setValue, formState, register, watch, trigger } = form;
  const errors = formState.errors;
  // Re-check From/To together once the traveller has tried to search (same-station rule).
  const recheckRoute = () => {
    if (formState.isSubmitted) void trigger(['from', 'to']);
  };
  const problems = formState.isSubmitted
    ? (Object.values(errors).map((e) => (e as { message?: string } | undefined)?.message).filter(Boolean) as string[])
    : [];
  const quota = watch('quota');
  const maxPassengers =
    quota === 'TQ'
      ? (caps?.maxTatkalPassengers ?? TRAIN_MAX_TATKAL_PASSENGERS)
      : (caps?.maxPassengers ?? TRAIN_MAX_PASSENGERS);
  return (
    <form onSubmit={onSubmit} noValidate aria-label="Search trains" className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] lg:items-start">
        <div className="relative grid gap-3 sm:col-span-2 sm:grid-cols-2 lg:col-span-2">
          <Controller
            control={control}
            name="from"
            render={({ field }) => (
              <PlaceCombobox
                label="From"
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  recheckRoute();
                }}
                options={STATION_OPTIONS}
                placeholder="Station or city"
                icon={<Navigation aria-hidden />}
                error={errors.from?.message}
              />
            )}
          />
          <SwapButton
            onClick={() => {
              const from = getValues('from');
              setValue('from', getValues('to'));
              setValue('to', from);
              recheckRoute();
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
                onChange={(v) => {
                  field.onChange(v);
                  recheckRoute();
                }}
                options={STATION_OPTIONS}
                placeholder="Station or city"
                icon={<MapPin aria-hidden />}
                error={errors.to?.message}
              />
            )}
          />
        </div>
        <Controller
          control={control}
          name="date"
          render={({ field }) => (
            <DateField
              label="Journey date"
              value={field.value}
              onChange={field.onChange}
              min={today}
              max={addDays(today, TRAIN_SEARCH_MAX_DAYS)}
              icon={<CalendarDays aria-hidden />}
              error={errors.date?.message}
            />
          )}
        />
        <FieldShell id={classId} label="Class" icon={<Ticket aria-hidden />} error={errors.travelClass?.message}>
          <select
            id={classId}
            {...register('travelClass')}
            className={`${fieldInputClass} cursor-pointer appearance-none`}
          >
            <option value="ALL">All classes</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {TRAIN_CLASS_LABELS[c]}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted">Reservation class</p>
        </FieldShell>
        <SearchButton label="Search Trains" className="h-12 sm:col-span-2 lg:col-span-1 lg:h-[4.25rem]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,2fr)] lg:items-start">
        <FieldShell id={quotaId} label="Quota" icon={<BadgePercent aria-hidden />} error={errors.quota?.message}>
          <select
            id={quotaId}
            {...register('quota', {
              onChange: () => {
                // Tatkal allows fewer passengers per ticket.
                const max =
                  getValues('quota') === 'TQ'
                    ? (caps?.maxTatkalPassengers ?? TRAIN_MAX_TATKAL_PASSENGERS)
                    : (caps?.maxPassengers ?? TRAIN_MAX_PASSENGERS);
                if (Number(getValues('passengers')) > max) setValue('passengers', max);
              },
            })}
            className={`${fieldInputClass} cursor-pointer appearance-none`}
          >
            {quotas.map((q) => (
              <option key={q} value={q}>
                {TRAIN_QUOTA_LABELS[q]}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted">
            {quota === 'TQ' ? 'Opens the day before the journey' : quota === 'LD' ? 'For women travellers' : 'Most tickets'}
          </p>
        </FieldShell>
        <FieldShell id={paxId} label="Passengers" icon={<Users aria-hidden />} error={errors.passengers?.message}>
          <select
            id={paxId}
            {...register('passengers', { valueAsNumber: true })}
            className={`${fieldInputClass} cursor-pointer appearance-none`}
          >
            {Array.from({ length: maxPassengers }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} passenger{n === 1 ? '' : 's'}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted">Age 5 and above</p>
        </FieldShell>
        <div className="sm:col-span-2 lg:col-span-1 lg:self-center">
          <QuickDates onPick={(d) => setValue('date', d, { shouldValidate: formState.isSubmitted })} />
        </div>
      </div>
      {problems.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            Please correct the highlighted {problems.length === 1 ? 'field' : 'fields'} to search trains.
          </span>
        </div>
      )}
    </form>
  );
}
