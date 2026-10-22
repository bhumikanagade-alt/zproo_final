import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { DateCalendar } from '@/features/flights/components/DateInput';
import { FieldShell } from './FieldShell';

const dayMonthYear = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const weekday = new Intl.DateTimeFormat('en-IN', { weekday: 'long', timeZone: 'UTC' });

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  icon?: ReactNode;
  error?: string | undefined;
  className?: string;
  /** Shown when empty, e.g. "Add return" for an optional date. */
  emptyHint?: string;
  /** Opens the flight pages' styled calendar instead of the browser's own date picker. */
  styledCalendar?: boolean;
}

/**
 * Shows the date as "25 Oct 2026 / Saturday" (the same in every browser locale) while a native
 * date input covers the card, so keyboard entry, screen readers and mobile pickers keep working.
 */
export function DateField({
  label,
  value,
  onChange,
  min,
  max,
  icon,
  error,
  className,
  emptyHint,
  styledCalendar,
}: DateFieldProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const calendarId = `${id}-calendar`;

  // Close the styled calendar on an outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const date = value ? new Date(`${value}T00:00:00Z`) : null;
  return (
    <FieldShell id={id} label={label} icon={icon} error={error} className={className}>
      <input
        ref={input}
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        onClick={() => {
          if (styledCalendar) return;
          try {
            input.current?.showPicker();
          } catch {
            /* Not supported or not allowed: the browser's default behaviour applies. */
          }
        }}
        tabIndex={styledCalendar ? -1 : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={
          styledCalendar
            ? 'pointer-events-none absolute inset-0 size-full opacity-0'
            : 'absolute inset-0 z-10 size-full cursor-pointer opacity-0'
        }
      />
      {styledCalendar && (
        <div ref={root}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={`Choose ${label.toLowerCase()} date`}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={open ? calendarId : undefined}
            className="absolute inset-0 z-10 size-full cursor-pointer rounded-2xl focus-visible:outline-none"
          />
          {open && (
            <DateCalendar
              id={calendarId}
              selected={value || undefined}
              min={min}
              max={max}
              onPick={(iso) => {
                onChange(iso);
                setOpen(false);
              }}
              onClear={
                emptyHint
                  ? () => {
                      onChange('');
                      setOpen(false);
                    }
                  : undefined
              }
            />
          )}
        </div>
      )}
      <p
        aria-hidden
        className={
          date
            ? 'truncate text-base font-bold sm:text-lg'
            : 'truncate text-base font-semibold text-muted sm:text-lg'
        }
      >
        {date ? dayMonthYear.format(date) : (emptyHint ?? 'Select date')}
      </p>
      <p aria-hidden className="truncate text-xs text-muted">
        {date ? weekday.format(date) : ' '}
      </p>
    </FieldShell>
  );
}
