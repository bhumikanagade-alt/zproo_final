import { cn } from '@zproo/ui';
import '../cabs.css';
import { VehicleArt } from './VehicleArt';
import { ArrowLeft, FlaskConical, MapPin, Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router';
import { LOCATIONS } from '../data';
import { searchPlaces, type PlaceHit } from '../geo';
import { rupees } from '../fare';
import { useCabStore } from '../store';
import type { BookingStatus, FareBreakdown, VehicleId } from '../types';

const SIZES = { sm: 'h-12 w-24', md: 'h-16 w-32', lg: 'h-24 w-44' } as const;

export function VehicleIcon({ id, size = 'md', className }: { id: VehicleId; size?: keyof typeof SIZES; className?: string }) {
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-xl bg-gradient-to-b from-[#f4f6f9] to-[#dfe5ec] p-1', SIZES[size], className)}>
      <VehicleArt id={id} className="h-full w-full" />
    </span>
  );
}

export const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2';

export function DemoNote({ children }: { children?: ReactNode }) {
  return (
    <p role="note" className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-amber-900">
      <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children ?? <><strong>Demo.</strong> Fares, routes, drivers and payments are simulated. No real ride is dispatched and no money is charged.</>}</span>
    </p>
  );
}

const STEPS = ['Ride', 'Route', 'Pickup', 'Details', 'Passenger', 'Payment'];

export function FlowHeader({ title, back, step }: { title: string; back: string; step?: number }) {
  return (
    <div className="mb-4">
      <Link to={back} className={cn('mb-2 inline-flex items-center gap-1 rounded text-sm text-muted hover:text-foreground', focusRing)}>
        <ArrowLeft aria-hidden className="size-4" /> Back
      </Link>
      <h1 className="text-[28px] font-bold leading-9">{title}</h1>
      {step !== undefined && (
        <ol aria-label="Booking progress" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === step ? 'step' : undefined} className={cn('font-medium', i === step ? 'text-primary' : i < step ? 'text-success' : 'text-muted')}>
              {i < step ? '✓ ' : `${i + 1}. `}{s}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-6', className)}>{children}</div>;
}

export function StatusPill({ status }: { status: BookingStatus }) {
  const map = {
    upcoming: ['Upcoming', 'bg-blue-50 text-blue-700'],
    ongoing: ['On the way', 'bg-primary-light text-primary'],
    completed: ['Completed', 'bg-[#eaf7ee] text-[#16813d]'],
    cancelled: ['Cancelled', 'bg-neutral-100 text-neutral-700'],
  } as const;
  const [label, cls] = map[status];
  return <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', cls)}>{label}</span>;
}

export function FareTable({ fare, className }: { fare: FareBreakdown; className?: string }) {
  const rows: [string, number, boolean?][] = [
    ['Base fare', fare.base], ['Distance charge', fare.distance], ['Time charge', fare.time],
    ['Platform fee', fare.platform], ['Taxes (5% GST)', fare.taxes],
  ];
  return (
    <dl className={cn('space-y-2 text-sm', className)}>
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between"><dt className="text-muted">{k}</dt><dd>{rupees(v)}</dd></div>
      ))}
      <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd className="text-success">{fare.discount ? `-${rupees(fare.discount)}` : '₹0'}</dd></div>
      <div className="flex justify-between border-t border-border pt-2 text-base font-bold"><dt>Total (estimated)</dt><dd className="text-[22px] leading-7">{rupees(fare.total)}</dd></div>
    </dl>
  );
}

export function useRequireRide() {
  const draft = useCabStore((s) => s.draft);
  const ready = Boolean(draft.pickup && draft.drop && draft.vehicleId);
  return { draft, ready, redirect: ready ? null : <Navigate to={draft.pickup && draft.drop ? '/cabs/results' : '/cabs'} replace /> };
}

export function LocationInput({ label, value, onChange, error, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; error?: string | undefined; placeholder?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const q = value.trim().toLowerCase();
  const local = useMemo(
    () => LOCATIONS.filter((l) => !q || l.name.toLowerCase().includes(q) || l.area.toLowerCase().includes(q)).slice(0, 6),
    [q],
  );
  // Live suggestions for any place in India (debounced); silently skipped when offline.
  const [remote, setRemote] = useState<PlaceHit[]>([]);
  useEffect(() => {
    if (!open || q.length < 3) { setRemote([]); return; }
    const ctrl = new AbortController();
    const t = window.setTimeout(() => { void searchPlaces(q, ctrl.signal).then((r) => { if (!ctrl.signal.aborted) setRemote(r); }); }, 350);
    return () => { window.clearTimeout(t); ctrl.abort(); };
  }, [q, open]);
  const options = useMemo(() => {
    const seen = new Set(local.map((l) => l.name.toLowerCase()));
    return [...local, ...remote.filter((r) => !seen.has(r.name.toLowerCase()))].slice(0, 9);
  }, [local, remote]);
  const choose = (name: string) => { onChange(name); setOpen(false); };
  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted">{label}</label>
      <div className="relative">
        <MapPin aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
        <input
          id={id} role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? `${id}-o${active}` : undefined}
          aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined}
          value={value} placeholder={placeholder} autoComplete="off"
          onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, options.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === 'Enter' && open && options[active]) { e.preventDefault(); choose(options[active]!.name); }
            else if (e.key === 'Escape') setOpen(false);
          }}
          className={cn('h-11 w-full rounded-lg border bg-card pl-9 pr-9 text-[15px]', error ? 'border-danger' : 'border-border', focusRing)}
        />
        {value && (
          <button type="button" aria-label={`Clear ${label.toLowerCase()}`} onMouseDown={(e) => e.preventDefault()} onClick={() => onChange('')}
            className={cn('absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground', focusRing)}>
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>
      {open && options.length > 0 && (
        <ul id={`${id}-list`} role="listbox" aria-label={`${label} suggestions`} className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg">
          {options.map((o, i) => (
            <li key={o.id} id={`${id}-o${i}`} role="option" aria-selected={i === active} onMouseDown={(e) => { e.preventDefault(); choose(o.name); }}
              className={cn('cursor-pointer px-3 py-2 text-sm', i === active && 'bg-primary-light')}>
              <span className="font-medium">{o.name}</span><span className="block text-xs text-muted">{o.area}</span>
            </li>
          ))}
        </ul>
      )}
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function TextField({ label, error, hint, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | undefined; hint?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted">{label}</label>
      <input id={id} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={cn('h-11 w-full rounded-lg border bg-card px-3 text-[15px]', error ? 'border-danger' : 'border-border', focusRing)} {...props} />
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export { Search };
