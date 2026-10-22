import { Button, cn } from '@zproo/ui';
import { Check, Group, TimeGroup } from '@/components/filters/FilterControls';
import { toggle } from '@/lib/list';
import { classLabel } from '../format';
import {
  activeTrainFilterCount,
  EMPTY_TRAIN_FILTERS,
  type TrainFacets,
  type TrainFilters,
} from '../filters';

export function TrainFiltersPanel({
  facets,
  value,
  onChange,
  fromName,
  toName,
}: {
  facets: TrainFacets;
  value: TrainFilters;
  onChange: (next: TrainFilters) => void;
  fromName: string;
  toName: string;
}) {
  const set = (patch: Partial<TrainFilters>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Filters</h2>
        {activeTrainFilterCount(value) > 0 && (
          <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_TRAIN_FILTERS)}>
            Clear all
          </Button>
        )}
      </div>

      <Group title="Availability">
        <Check
          label="Bookable now (AVL, RAC or WL)"
          checked={value.bookableOnly}
          onChange={() => set({ bookableOnly: !value.bookableOnly })}
        />
        <Check
          label="Confirmed berths available (AVL)"
          checked={value.availableOnly}
          onChange={() => set({ availableOnly: !value.availableOnly })}
        />
      </Group>

      <Group title="Travel class">
        <div className="flex flex-wrap gap-2">
          {facets.classes.map((c) => {
            const on = value.classes.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                title={classLabel(c)}
                onClick={() => set({ classes: toggle(value.classes, c) })}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  on
                    ? 'border-primary bg-primary-light text-primary'
                    : 'border-border hover:border-foreground/30',
                )}
              >
                {c}
                <span className="sr-only"> {classLabel(c)}</span>
              </button>
            );
          })}
        </div>
      </Group>

      <TimeGroup
        title={`Departure from ${fromName}`}
        selected={value.departure}
        onToggle={(b) => set({ departure: toggle(value.departure, b) })}
      />
      <TimeGroup
        title={`Arrival at ${toName}`}
        selected={value.arrival}
        onToggle={(b) => set({ arrival: toggle(value.arrival, b) })}
      />

      {facets.trainTypes.length > 1 && (
        <Group title="Train type">
          {facets.trainTypes.map((t) => (
            <Check
              key={t}
              label={t}
              checked={value.trainTypes.includes(t)}
              onChange={() => set({ trainTypes: toggle(value.trainTypes, t) })}
            />
          ))}
        </Group>
      )}

      {facets.anyPantry && (
        <Group title="On board">
          <Check
            label="Pantry car"
            checked={value.pantryOnly}
            onChange={() => set({ pantryOnly: !value.pantryOnly })}
          />
        </Group>
      )}
    </div>
  );
}
