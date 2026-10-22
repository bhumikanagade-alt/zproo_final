import { Button, cn } from '@zproo/ui';
import { RotateCcw } from 'lucide-react';
import { PRICE_MAX, PRICE_MIN, PRICE_STEP } from '../filters';
import { CATEGORIES, CATEGORY_META } from '../rules';
import { rupees } from '../pricing';
import type { BikeCategory, BikeFilters, Transmission } from '../types';
import { focusRing } from './ui';

interface Props {
  filters: BikeFilters;
  onChange: (patch: Partial<BikeFilters>) => void;
  onReset: () => void;
  activeCount: number;
}

const TRANSMISSIONS: { id: Transmission | 'any'; label: string }[] = [
  { id: 'any', label: 'Any' },
  { id: 'manual', label: 'Manual' },
  { id: 'automatic', label: 'Automatic' },
];

export function BikeFilterPanel({ filters, onChange, onReset, activeCount }: Props) {
  const toggleCategory = (c: BikeCategory) =>
    onChange({ categories: filters.categories.includes(c) ? filters.categories.filter((x) => x !== c) : [...filters.categories, c] });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Filters</h2>
        <Button variant="ghost" size="sm" onClick={onReset} disabled={activeCount === 0} className="-mr-3">
          <RotateCcw aria-hidden /> Reset
        </Button>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Category</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const on = filters.categories.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => toggleCategory(c)}
                title={CATEGORY_META[c].blurb}
                className={cn('h-9 rounded-full border px-3.5 text-sm font-semibold transition-colors', focusRing, on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary hover:bg-primary-light')}
              >
                {CATEGORY_META[c].label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Transmission</legend>
        <div role="radiogroup" aria-label="Transmission" className="inline-flex rounded-xl bg-neutral-100 p-1 text-sm font-semibold">
          {TRANSMISSIONS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={filters.transmission === t.id}
              onClick={() => onChange({ transmission: t.id })}
              className={cn('rounded-lg px-3.5 py-1.5 transition-colors', focusRing, filters.transmission === t.id ? 'bg-card text-primary shadow-sm' : 'text-muted')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <label htmlFor="bike-price" className="text-sm font-semibold">
            Max price per day
          </label>
          <output htmlFor="bike-price" className="text-sm font-bold text-primary">
            {filters.maxDailyPrice >= PRICE_MAX ? `${rupees(PRICE_MAX)}+` : rupees(filters.maxDailyPrice)}
          </output>
        </div>
        <input
          id="bike-price"
          type="range"
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={PRICE_STEP}
          value={filters.maxDailyPrice}
          onChange={(e) => onChange({ maxDailyPrice: Number(e.target.value) })}
          className={cn('w-full cursor-pointer accent-[var(--primary)]', focusRing)}
        />
        <div className="flex justify-between text-xs text-muted">
          <span>{rupees(PRICE_MIN)}</span>
          <span>{rupees(PRICE_MAX)}+</span>
        </div>
      </div>

      <label className={cn('flex cursor-pointer items-center gap-2 rounded text-sm font-medium', focusRing)}>
        <input type="checkbox" checked={filters.onlyAvailable} onChange={(e) => onChange({ onlyAvailable: e.target.checked })} className="size-4 accent-[var(--primary)]" />
        Show available bikes only
      </label>
    </div>
  );
}

