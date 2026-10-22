import { cn } from '@zproo/ui';
import { Moon, Sun, Sunrise, Sunset } from 'lucide-react';
import type { ReactNode } from 'react';
import { TIME_BANDS, type TimeBand } from '@/features/flights/filters';

/** Shared building blocks for search-result filter panels (flights, buses, …). */

const BAND_ICONS: Record<TimeBand, typeof Sun> = {
  EARLY: Sunrise,
  MORNING: Sun,
  AFTERNOON: Sunset,
  NIGHT: Moon,
};

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

export function Check({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg py-1 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-4 accent-primary"
      />
      <span className="flex-1">{label}</span>
      {hint && <span className="text-xs text-muted tabular-nums">{hint}</span>}
    </label>
  );
}

export function TimeGroup({
  title,
  selected,
  onToggle,
}: {
  title: string;
  selected: TimeBand[];
  onToggle: (b: TimeBand) => void;
}) {
  return (
    <Group title={title}>
      <div className="grid grid-cols-2 gap-2">
        {TIME_BANDS.map((band) => {
          const Icon = BAND_ICONS[band.id];
          const on = selected.includes(band.id);
          return (
            <button
              key={band.id}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(band.id)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-xs font-medium transition-colors',
                on
                  ? 'border-primary bg-primary-light text-primary'
                  : 'border-border hover:border-foreground/30',
              )}
            >
              <Icon aria-hidden className="size-4" />
              {band.label}
            </button>
          );
        })}
      </div>
    </Group>
  );
}
