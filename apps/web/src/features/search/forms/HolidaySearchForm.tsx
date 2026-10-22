import { HOLIDAY_CATEGORIES, holidaySearchSchema, todayIso } from '@zproo/validation';
import { cn } from '@zproo/ui';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import { useId } from 'react';
import { useWatch } from 'react-hook-form';
import { FieldShell } from '../components/FieldShell';
import { fieldInputClass } from '../components/fieldStyles';
import { SearchButton } from '../components/SearchButton';
import { holidaysUrl } from '../url';
import { useSearchForm } from '../useSearchForm';

const CATEGORY_LABELS: Record<(typeof HOLIDAY_CATEGORIES)[number], string> = {
  DOMESTIC: 'Domestic',
  INTERNATIONAL: 'International',
  HONEYMOON: 'Honeymoon',
  FAMILY: 'Family',
  ADVENTURE: 'Adventure',
  LUXURY: 'Luxury',
  WEEKEND: 'Weekend',
};

export function HolidaySearchForm() {
  const ids = { destination: useId(), month: useId(), travellers: useId() };
  const { form, onSubmit } = useSearchForm(
    holidaySearchSchema,
    { destination: '', month: undefined, travellers: 2, category: undefined },
    holidaysUrl,
  );
  const { register, setValue, control, formState } = form;
  const errors = formState.errors;
  const category = useWatch({ control, name: 'category' });
  return (
    <form onSubmit={onSubmit} noValidate aria-label="Search holiday packages" className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[1.3fr_0.8fr_0.7fr_0.8fr] lg:items-start">
        <FieldShell
          id={ids.destination}
          label="Destination"
          icon={<MapPin aria-hidden />}
          error={errors.destination?.message}
        >
          <input
            id={ids.destination}
            placeholder="Goa, Kerala, Dubai…"
            className={fieldInputClass}
            {...register('destination')}
          />
          <p className="text-xs text-muted">Or leave blank to explore</p>
        </FieldShell>
        <FieldShell
          id={ids.month}
          label="Month"
          icon={<CalendarDays aria-hidden />}
          error={errors.month?.message}
        >
          <input
            id={ids.month}
            type="month"
            min={todayIso().slice(0, 7)}
            className={fieldInputClass}
            {...register('month', { setValueAs: (v: string) => v || undefined })}
          />
          <p className="text-xs text-muted">When are you going?</p>
        </FieldShell>
        <FieldShell
          id={ids.travellers}
          label="Travellers"
          icon={<Users aria-hidden />}
          error={errors.travellers?.message}
        >
          <input
            id={ids.travellers}
            type="number"
            min={1}
            max={20}
            inputMode="numeric"
            className={fieldInputClass}
            {...register('travellers')}
          />
          <p className="text-xs text-muted">Adults and children</p>
        </FieldShell>
        <SearchButton label="Explore Holidays" className="lg:h-[4.25rem]" />
      </div>
      <div role="radiogroup" aria-label="Holiday type" className="flex flex-wrap gap-2">
        {HOLIDAY_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={category === c}
            onClick={() => setValue('category', category === c ? undefined : c)}
            className={cn(
              'h-8 rounded-full px-3.5 text-xs font-semibold transition-colors',
              category === c
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-foreground/70 ring-1 ring-border hover:text-foreground',
            )}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>
    </form>
  );
}
