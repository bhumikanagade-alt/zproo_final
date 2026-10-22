import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';

interface DateInputProps<T extends FieldValues> {
  // Forms whose schema transforms values (input ≠ output) pass Control<Input, unknown, Output>.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<T, any, any>;
  name: Path<T>;
  /** Earliest / latest date (YYYY-MM-DD) the calendar will offer. */
  min?: string;
  max?: string;
  /** Value stored when the box is empty ('' for required fields, undefined for optional ones). */
  blank?: '' | undefined;
  autoComplete?: string;
  id?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayIso = () => {
  const now = new Date();
  return toIso(now.getFullYear(), now.getMonth(), now.getDate());
};

/** 1990-04-05 → 05/04/1990 */
const isoToDisplay = (iso: unknown): string => {
  if (typeof iso !== 'string') return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

/** 05/04/1990 → 1990-04-05 (undefined when it is not a complete, real date). */
const displayToIso = (display: string): string | undefined => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display);
  if (!m) return undefined;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const real = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(real.getTime()) && real.toISOString().slice(0, 10) === iso ? iso : undefined;
};

/** Keep digits only and add the slashes as the traveller types: 05042000 → 05/04/2000. */
const maskDate = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

/**
 * A date typed as DD/MM/YYYY, or picked from a calendar. The form still stores a
 * YYYY-MM-DD string, so validation and the API are unchanged.
 */
export function DateInput<T extends FieldValues>({
  control,
  name,
  min,
  max,
  blank,
  autoComplete,
  id,
  ...aria
}: DateInputProps<T>) {
  const { field } = useController({ control, name });
  const [text, setText] = useState(() => isoToDisplay(field.value));
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogId = useId();

  // Follow the form when the value is changed from outside (draft restored, reset).
  useEffect(() => {
    const iso = displayToIso(text);
    if ((field.value || undefined) !== iso && (field.value || iso)) {
      setText(isoToDisplay(field.value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.value]);

  // Close the calendar on an outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        field.onBlur();
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selected = displayToIso(text);
  const commit = (iso: string | undefined) => {
    setText(isoToDisplay(iso));
    field.onChange(iso ?? blank);
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete={autoComplete ?? 'off'}
        placeholder="DD/MM/YYYY"
        maxLength={10}
        value={text}
        ref={field.ref}
        name={field.name}
        onBlur={() => {
          if (!open) field.onBlur();
        }}
        onChange={(event) => {
          const masked = maskDate(event.target.value);
          setText(masked);
          // Complete real date → ISO; blank → empty; anything half-typed stays as typed so it is flagged.
          field.onChange(masked === '' ? blank : (displayToIso(masked) ?? masked));
        }}
        className="flex h-11 w-full rounded-xl border border-border bg-card pl-3.5 pr-12 text-sm uppercase tracking-wide text-foreground transition-colors placeholder:text-muted/80 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-danger"
        {...aria}
      />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open calendar"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg bg-primary-light text-primary shadow-sm ring-1 ring-primary/20 transition hover:bg-primary hover:text-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
      >
        <CalendarDays aria-hidden className="size-4" />
      </button>
      {open && (
        <DateCalendar
          id={dialogId}
          selected={selected}
          min={min}
          max={max}
          onPick={(iso) => {
            commit(iso);
            setOpen(false);
            field.onBlur();
          }}
          onClear={() => {
            commit(undefined);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

interface CalendarProps {
  id: string;
  selected: string | undefined;
  min: string | undefined;
  max: string | undefined;
  onPick: (iso: string) => void;
  /** Shows a Clear button; leave out for a date that is always required. */
  onClear?: (() => void) | undefined;
  className?: string;
}

/** The calendar popup shared by every date in the flight pages. */
export function DateCalendar({ id, selected, min, max, onPick, onClear, className }: CalendarProps) {
  const today = todayIso();
  const startIso = selected ?? (max && today > max ? max : min && today < min ? min : today);
  const [year, setYear] = useState(Number(startIso.slice(0, 4)));
  const [month, setMonth] = useState(Number(startIso.slice(5, 7)) - 1);

  const thisYear = new Date().getFullYear();
  const minYear = min ? Number(min.slice(0, 4)) : thisYear - 120;
  const maxYear = max ? Number(max.slice(0, 4)) : thisYear + 30;
  const years = useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i),
    [minYear, maxYear],
  );

  const first = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: first }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const canGoPrev = !min || toIso(year, month, 1) > min;
  const canGoNext = !max || toIso(year, month, daysInMonth) < max;
  const step = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };
  const isDisabled = (iso: string) => Boolean((min && iso < min) || (max && iso > max));
  const todayAllowed = !isDisabled(today);

  const selectClass =
    'h-7 cursor-pointer rounded-lg border-0 bg-white/15 px-1.5 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 [&>option]:text-foreground';
  const navClass =
    'flex size-7 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white/15';

  return (
    <div
      id={id}
      role="dialog"
      aria-label="Choose a date"
      className={`absolute top-full z-50 mt-2 w-[17rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl ring-1 ring-black/5 ${className ?? 'left-0'}`}
    >
      <div className="bg-gradient-to-br from-primary to-primary-hover px-2.5 pb-2 pt-2.5 text-white">
        <div className="flex items-center justify-between gap-2">
          <button type="button" aria-label="Previous month" disabled={!canGoPrev} onClick={() => step(-1)} className={navClass}>
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <div className="flex items-center gap-1.5">
            <select
              aria-label="Month"
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className={selectClass}
            >
              {MONTHS.map((label, index) => (
                <option
                  key={label}
                  value={index}
                  disabled={
                    (min !== undefined && toIso(year, index, new Date(year, index + 1, 0).getDate()) < min) ||
                    (max !== undefined && toIso(year, index, 1) > max)
                  }
                >
                  {label}
                </option>
              ))}
            </select>
            <select
              aria-label="Year"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className={selectClass}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <button type="button" aria-label="Next month" disabled={!canGoNext} onClick={() => step(1)} className={navClass}>
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>
        <div className="mt-2 grid grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-wider text-white/80">
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-0.5 p-2">
        {cells.map((day, index) => {
          if (day === null) return <span key={`blank-${index}`} />;
          const iso = toIso(year, month, day);
          const disabled = isDisabled(iso);
          const isSelected = iso === selected;
          const isToday = iso === today;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              aria-label={`${day} ${MONTHS[month]} ${year}`}
              aria-pressed={isSelected}
              onClick={() => onPick(iso)}
              className={[
                'mx-auto flex size-8 items-center justify-center rounded-full text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isSelected
                  ? 'bg-primary font-bold text-white shadow-md'
                  : disabled
                    ? 'cursor-not-allowed text-muted/40'
                    : 'text-foreground hover:bg-primary-light hover:text-primary',
                isToday && !isSelected ? 'font-bold text-primary ring-1 ring-primary/40' : '',
              ].join(' ')}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-border bg-primary-light/40 px-2 py-1 text-xs">
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg px-3 py-1.5 font-semibold text-muted transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Clear
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          disabled={!todayAllowed}
          onClick={() => onPick(today)}
          className="rounded-lg px-3 py-1.5 font-semibold text-primary transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          Today
        </button>
      </div>
    </div>
  );
}
