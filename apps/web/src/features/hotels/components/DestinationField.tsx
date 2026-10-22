import { cn } from '@zproo/ui';
import { Building2, Clock, Landmark, MapPin } from 'lucide-react';
import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { FieldShell } from '@/features/search/components/FieldShell';
import { fieldInputClass } from '@/features/search/components/fieldStyles';
import { readRecent } from '../recent';
import { suggestDestinations, type DestinationSuggestion } from '../suggest';

const ICON: Record<DestinationSuggestion['kind'], ReactNode> = {
  city: <MapPin aria-hidden className="size-4" />,
  area: <MapPin aria-hidden className="size-4" />,
  hotel: <Building2 aria-hidden className="size-4" />,
  landmark: <Landmark aria-hidden className="size-4" />,
};

interface Props {
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  className?: string;
}

/** Free-text destination with autocomplete over cities, areas, hotels and landmarks. */
export function DestinationField({ value, onChange, error, className }: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const items = useMemo(() => {
    if (value.trim()) return suggestDestinations(value, 8);
    const recent: DestinationSuggestion[] = readRecent().map((r) => ({
      kind: 'city',
      label: r,
      detail: 'Recent search',
      value: r,
    }));
    return [...recent, ...suggestDestinations('', 6)].slice(0, 8);
  }, [value]);

  const choose = (item: DestinationSuggestion) => {
    onChange(item.value);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (items.length === 0 ? 0 : (i + delta + items.length) % items.length));
    } else if (e.key === 'Enter' && open && items[active]) {
      e.preventDefault();
      choose(items[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={cn('relative min-w-0', className)}>
      <FieldShell id={id} label="City, area, hotel or landmark" icon={<MapPin aria-hidden />} error={error}>
        <input
          ref={input}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && items[active] ? `${id}-opt-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          autoComplete="off"
          value={value}
          placeholder="Where to?"
          onChange={(e) => {
            onChange(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className={fieldInputClass}
        />
      </FieldShell>
      {open && items.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Destination suggestions"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-2xl border border-border bg-card p-1 shadow-lg"
        >
          {items.map((item, i) => (
            <li
              key={`${item.kind}-${item.label}`}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(item);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm',
                i === active && 'bg-primary-light',
              )}
            >
              <span className="text-primary">
                {item.detail === 'Recent search' ? <Clock aria-hidden className="size-4" /> : ICON[item.kind]}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{item.label}</span>
                <span className="block truncate text-xs text-muted">{item.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
