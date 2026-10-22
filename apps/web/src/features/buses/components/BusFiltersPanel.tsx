import { Button, cn } from '@zproo/ui';
import { Star } from 'lucide-react';
import { Check, Group, TimeGroup } from '@/components/filters/FilterControls';
import { inr } from '@/features/flights/format';
import { toggle } from '@/lib/list';
import {
  activeBusFilterCount,
  BUS_KINDS,
  EMPTY_BUS_FILTERS,
  type BusFacets,
  type BusFilters,
} from '../filters';

interface BusFiltersPanelProps {
  facets: BusFacets;
  value: BusFilters;
  onChange: (next: BusFilters) => void;
  fromCity: string;
  toCity: string;
}

export function BusFiltersPanel({
  facets,
  value,
  onChange,
  fromCity,
  toCity,
}: BusFiltersPanelProps) {
  const set = (patch: Partial<BusFilters>) => onChange({ ...value, ...patch });
  const step = 5_000; // ₹50
  const sliderMin = Math.floor(facets.minPricePaise / step) * step;
  const sliderMax = Math.ceil(facets.maxPricePaise / step) * step;
  const maxPrice = Math.min(value.maxPricePaise ?? sliderMax, sliderMax);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Filters</h2>
        {activeBusFilterCount(value) > 0 && (
          <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_BUS_FILTERS)}>
            Clear all
          </Button>
        )}
      </div>

      <Group title="Bus type">
        <div className="flex flex-wrap gap-2">
          {BUS_KINDS.filter((k) => facets.kinds.includes(k.id)).map((k) => {
            const on = value.kinds.includes(k.id);
            return (
              <button
                key={k.id}
                type="button"
                aria-pressed={on}
                onClick={() => set({ kinds: toggle(value.kinds, k.id) })}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  on
                    ? 'border-primary bg-primary-light text-primary'
                    : 'border-border hover:border-foreground/30',
                )}
              >
                {k.label}
              </button>
            );
          })}
        </div>
      </Group>

      <TimeGroup
        title={`Departure from ${fromCity}`}
        selected={value.departure}
        onToggle={(b) => set({ departure: toggle(value.departure, b) })}
      />
      <TimeGroup
        title={`Arrival at ${toCity}`}
        selected={value.arrival}
        onToggle={(b) => set({ arrival: toggle(value.arrival, b) })}
      />

      {facets.maxPricePaise > facets.minPricePaise && (
        <Group title="Price range">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-muted">
              Minimum
              <input
                type="number"
                min={sliderMin}
                max={sliderMax}
                step={step}
                value={value.minPricePaise ?? sliderMin}
                onChange={(e) => set({ minPricePaise: Math.max(sliderMin, Number(e.target.value) || sliderMin) })}
                className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-2 text-sm font-semibold text-foreground"
                aria-label="Minimum price"
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              Maximum
              <input
                type="number"
                min={sliderMin}
                max={sliderMax}
                step={step}
                value={maxPrice}
                onChange={(e) => {
                  const v = Number(e.target.value) || sliderMax;
                  set({ maxPricePaise: v >= sliderMax ? null : Math.min(sliderMax, v) });
                }}
                className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-2 text-sm font-semibold text-foreground"
                aria-label="Maximum price"
              />
            </label>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted">
            <span>{inr(value.minPricePaise ?? sliderMin)}</span>
            <span>{inr(maxPrice)}</span>
          </div>
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={step}
            value={maxPrice}
            onChange={(e) => set({ maxPricePaise: Number(e.target.value) >= sliderMax ? null : Number(e.target.value) })}
            className="mt-2 w-full accent-primary"
            aria-label="Maximum price slider"
          />
        </Group>
      )}

      <Group title="Seats available">
        {[1, 5, 10, 20].map((count) => {
          const on = value.minSeatsAvailable === count;
          return (
            <Check
              key={count}
              label={`${count}+ available seats`}
              checked={on}
              onChange={() => set({ minSeatsAvailable: on ? null : count })}
            />
          );
        })}
      </Group>

      <Group title="Operator rating">
        <div className="flex gap-2">
          {[4.5, 4, 3.5].map((r) => {
            const on = value.minRating === r;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={on}
                onClick={() => set({ minRating: on ? null : r })}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium',
                  on
                    ? 'border-primary bg-primary-light text-primary'
                    : 'border-border hover:border-foreground/30',
                )}
              >
                <Star aria-hidden className="size-3.5" /> {r}+
              </button>
            );
          })}
        </div>
      </Group>

      <Group title={`Boarding points in ${fromCity}`}>
        {facets.boardingPoints.map((p) => (
          <Check
            key={p}
            label={p}
            checked={value.boardingPoints.includes(p)}
            onChange={() => set({ boardingPoints: toggle(value.boardingPoints, p) })}
          />
        ))}
      </Group>

      <Group title={`Dropping points in ${toCity}`}>
        {facets.droppingPoints.map((p) => (
          <Check
            key={p}
            label={p}
            checked={value.droppingPoints.includes(p)}
            onChange={() => set({ droppingPoints: toggle(value.droppingPoints, p) })}
          />
        ))}
      </Group>

      {facets.operators.length > 1 && (
        <Group title="Operators">
          {facets.operators.map((o) => (
            <Check
              key={o.code}
              label={o.name}
              hint={`★ ${o.rating.toFixed(1)}`}
              checked={value.operators.includes(o.code)}
              onChange={() => set({ operators: toggle(value.operators, o.code) })}
            />
          ))}
        </Group>
      )}
    </div>
  );
}
