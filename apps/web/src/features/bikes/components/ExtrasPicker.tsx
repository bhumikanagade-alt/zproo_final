import { cn } from '@zproo/ui';
import { rupees } from '../pricing';
import { EXTRAS } from '../rules';
import { focusRing } from './ui';

interface Props {
  selectedIds: readonly string[];
  onToggle: (id: string) => void;
}

/** Optional add-ons, charged per rental day. */
export function ExtrasPicker({ selectedIds, onToggle }: Props) {
  return (
    <fieldset>
      <legend className="sr-only">Optional add-ons</legend>
      <ul className="grid gap-3 sm:grid-cols-2">
        {EXTRAS.map((x) => {
          const checked = selectedIds.includes(x.id);
          return (
            <li key={x.id}>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- the input is nested; the text is in child spans */}
              <label
                className={cn(
                  'flex h-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors',
                  checked ? 'border-primary bg-primary-light' : 'border-border bg-card hover:border-foreground/40',
                  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-foreground has-[:focus-visible]:ring-offset-2',
                )}
              >
                <input type="checkbox" checked={checked} onChange={() => onToggle(x.id)} className={cn('mt-0.5 size-4 accent-[var(--primary)]', focusRing)} />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-semibold">{x.label}</span>
                    <span className="text-xs font-semibold text-foreground">{rupees(x.perDay)}/day</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{x.description}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
