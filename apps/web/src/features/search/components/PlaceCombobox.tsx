import { cn } from '@zproo/ui';
import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { FieldShell } from './FieldShell';
import { fieldInputClass } from './fieldStyles';
import { filterPlaces, type PlaceOption } from './filterPlaces';

export type { PlaceOption } from './filterPlaces';

interface PlaceComboboxProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly PlaceOption[];
  placeholder: string;
  icon?: ReactNode;
  error?: string | undefined;
  className?: string;
}

/**
 * Accessible autocomplete (WAI-ARIA combobox with listbox popup): type to filter, arrow keys to
 * move, Enter to choose, Escape to cancel.
 */
export function PlaceCombobox({
  label,
  value,
  onChange,
  options,
  placeholder,
  icon,
  error,
  className,
}: PlaceComboboxProps) {
  const id = useId();
  const listId = `${id}-list`;
  const selected = options.find((o) => o.value === value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  // Browsing (empty query) shows every place under its heading; typing narrows to the best matches.
  const results = useMemo(
    () => (query.trim() ? filterPlaces(options, query).slice(0, 10) : [...options]),
    [options, query],
  );
  const grouped = !query.trim() && options.some((o) => o.group);

  const choose = (option: PlaceOption) => {
    onChange(option.value);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (results.length === 0 ? 0 : (i + delta + results.length) % results.length));
    } else if (e.key === 'Enter' && open) {
      const option = results[active];
      if (option) {
        e.preventDefault();
        choose(option);
      }
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
      setQuery('');
    }
  };

  const activeId = open && results[active] ? `${id}-opt-${results[active].value}` : undefined;
  return (
    <FieldShell
      id={id}
      label={label}
      icon={icon}
      error={error}
      className={cn('relative', className)}
    >
      <input
        ref={input}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={open ? query : (selected?.label ?? '')}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setActive(0);
        }}
        onBlur={() => {
          setOpen(false);
          setQuery('');
        }}
        onKeyDown={onKeyDown}
        className={fieldInputClass}
      />
      <p className="truncate text-xs text-muted">{selected?.detail ?? ' '}</p>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-raised animate-fade-in"
        >
          {results.length === 0 && (
            <li className="px-3 py-4 text-center text-sm text-muted">No matches for “{query}”</li>
          )}
          {results.map((option, i) => [
            grouped && option.group && option.group !== results[i - 1]?.group && (
              <li
                key={`group-${option.group}`}
                role="presentation"
                className="sticky -top-1.5 z-10 bg-card px-3 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-wider text-muted"
              >
                {option.group}
              </li>
            ),
            <li
              key={option.value}
              id={`${id}-opt-${option.value}`}
              role="option"
              aria-selected={option.value === value}
              // mousedown (not click) so the choice lands before the input's blur closes the list
              onMouseDown={(e) => {
                e.preventDefault();
                choose(option);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5',
                i === active && 'bg-primary-light',
              )}
            >
              {option.badge && (
                <span className="w-12 shrink-0 rounded-lg bg-background py-1 text-center text-xs font-bold text-foreground/80">
                  {option.badge}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{option.label}</span>
                <span className="block truncate text-xs text-muted">{option.detail}</span>
              </span>
            </li>,
          ])}
        </ul>
      )}
    </FieldShell>
  );
}
